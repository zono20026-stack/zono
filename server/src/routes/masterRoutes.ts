import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { executeTransaction, query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';

const router = Router();

// ==============================================================================
// 1. الفروع (BRANCHES)
// ==============================================================================
router.get('/branches', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const resBranches = await query(`SELECT * FROM branches ORDER BY id ASC`);
    return res.json({ success: true, data: resBranches.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب الفروع' });
  }
});

router.post(
  '/branches',
  authenticateToken,
  requireRoles(['SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { branchCode, name, phone, address } = req.body;

    if (!branchCode || !name || !phone || !address) {
      return res.status(400).json({ success: false, message: 'يرجى استكمال جميع بيانات الفرع' });
    }

    try {
      const insRes = await query(
        `INSERT INTO branches (branch_code, name, phone, address, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [branchCode, name, phone, address, user.id]
      );
      return res.status(201).json({
        success: true,
        message: 'تم إضافة الفرع بنجاح بدون تعديل كود',
        data: insRes.rows[0],
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'فشل إضافة الفرع' });
    }
  }
);

// ==============================================================================
// 2. المدن والمناطق (CITIES & ZONES)
// ==============================================================================
router.get('/cities-with-zones', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const resCities = await query(
      `SELECT c.id, c.name, c.branch_id,
              COALESCE(
                json_agg(
                  json_build_object('id', z.id, 'name', z.name)
                ) FILTER (WHERE z.id IS NOT NULL), '[]'
              ) as zones
       FROM cities c
       LEFT JOIN zones z ON z.city_id = c.id
       GROUP BY c.id, c.name, c.branch_id
       ORDER BY c.name ASC`
    );
    return res.json({ success: true, data: resCities.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب المدن والمناطق' });
  }
});

// ==============================================================================
// 3. تكويد وإدارة العملاء (CUSTOMERS DIRECTORY & HISTORY)
// ==============================================================================
router.get('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { search } = req.query;
  let where = '';
  const params: any[] = [];

  if (search) {
    where = `WHERE (c.name ILIKE $1 OR c.phone ILIKE $1 OR c.customer_code ILIKE $1)`;
    params.push(`%${search}%`);
  }

  try {
    const resCust = await query(
      `SELECT c.*, ci.name as city_name, z.name as zone_name,
              COUNT(s.id) as total_shipments_count,
              COUNT(s.id) FILTER (WHERE s.status = 'DELIVERED') as delivered_count,
              COUNT(s.id) FILTER (WHERE s.status = 'RETURNED' OR s.status = 'FAILED_DELIVERY') as return_or_failed_count,
              COALESCE(SUM(s.total_cod_amount) FILTER (WHERE s.status = 'DELIVERED'), 0.00) as total_spent
       FROM customers c
       JOIN cities ci ON ci.id = c.city_id
       JOIN zones z ON z.id = c.zone_id
       LEFT JOIN shipments s ON s.customer_id = c.id
       ${where}
       GROUP BY c.id, ci.name, z.name
       ORDER BY c.id DESC`,
      params
    );

    return res.json({ success: true, data: resCust.rows });
  } catch (err: any) {
    console.error('Fetch customers error:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب دليل العملاء' });
  }
});

// إضافة وتكويد عميل جديد مع ربط اللوكيشن
router.post('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, phone, phoneAlt, cityId, zoneId, address, latitude, longitude, googleMapsUrl, notes } = req.body;

  if (!name || !phone || !cityId || !zoneId || !address) {
    return res.status(400).json({ success: false, message: 'يرجى استكمال بيانات العميل الأساسية' });
  }

  try {
    // Generate customer code (e.g. CUST-1048)
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const customerCode = `CUST-${codeNum}`;

    let finalMapsUrl = googleMapsUrl;
    if (!finalMapsUrl && latitude && longitude) {
      finalMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    }

    const insRes = await query(
      `INSERT INTO customers (
        customer_code, name, phone, phone_alt, city_id, zone_id, address,
        latitude, longitude, google_maps_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        customerCode,
        name,
        phone,
        phoneAlt || null,
        cityId,
        zoneId,
        address,
        latitude || null,
        longitude || null,
        finalMapsUrl || null,
        notes || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `تم تكويد العميل بنجاح بكود [${customerCode}]`,
      data: insRes.rows[0],
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'فشل تكويد العميل (قد يكون الهاتف مسجلاً مسبقاً)' });
  }
});

// سجل وتاريخ العميل الكامل وجميع طلباته السابقة
router.get('/customers/:id/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  const customerId = parseInt(req.params.id, 10);

  try {
    const custRes = await query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
    if (custRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const shipmentsRes = await query(
      `SELECT s.id, s.tracking_number, s.status, s.package_description,
              s.total_cod_amount, s.goods_value, s.shipping_fee, s.scheduled_delivery_date,
              s.created_at, m.business_name as merchant_name,
              u_c.full_name as courier_name
       FROM shipments s
       JOIN merchants m ON m.id = s.merchant_id
       LEFT JOIN couriers c ON c.id = s.assigned_courier_id
       LEFT JOIN users u_c ON u_c.id = c.user_id
       WHERE s.customer_id = $1
       ORDER BY s.created_at DESC`,
      [customerId]
    );

    return res.json({
      success: true,
      data: {
        customer: custRes.rows[0],
        shipments: shipmentsRes.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب سجل تاريخ العميل' });
  }
});

// ==============================================================================
// 4. تكويد وإدارة التجار (MERCHANTS DIRECTORY & STATEMENTS)
// ==============================================================================
router.get('/merchants', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const resMerchants = await query(
      `SELECT m.id, m.merchant_code, m.business_name, m.pickup_address,
              m.latitude, m.longitude, m.google_maps_url, m.special_discount_percentage,
              u.full_name as contact_name, u.phone, u.email,
              c.name as city_name, z.name as zone_name,
              COUNT(DISTINCT s.id) as total_shipments,
              COALESCE(SUM(jel.credit) - SUM(jel.debit), 0.00) as current_payable
       FROM merchants m
       JOIN users u ON u.id = m.user_id
       JOIN cities c ON c.id = m.city_id
       JOIN zones z ON z.id = m.zone_id
       LEFT JOIN shipments s ON s.merchant_id = m.id
       LEFT JOIN journal_entry_lines jel ON jel.merchant_id = m.id AND jel.account_id = (
         SELECT id FROM chart_of_accounts WHERE account_code = '2010'
       )
       WHERE m.is_active = true
       GROUP BY m.id, m.merchant_code, m.business_name, m.pickup_address,
                m.latitude, m.longitude, m.google_maps_url, m.special_discount_percentage,
                u.full_name, u.phone, u.email, c.name, z.name
       ORDER BY m.id DESC`
    );
    return res.json({ success: true, data: resMerchants.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب التجار' });
  }
});

// إضافة وتكويد تاجر جديد
router.post(
  '/merchants',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']),
  async (req: AuthRequest, res: Response) => {
    const { businessName, contactName, phone, email, password, cityId, zoneId, pickupAddress, latitude, longitude, googleMapsUrl } = req.body;

    if (!businessName || !phone || !cityId || !zoneId || !pickupAddress) {
      return res.status(400).json({ success: false, message: 'يرجى استكمال بيانات التاجر الأساسية' });
    }

    try {
      const result = await executeTransaction(async (client) => {
        // Create User for merchant login
        const passHash = await bcrypt.hash(password || 'Admin@123456', 10);
        const userRes = await client.query(
          `INSERT INTO users (branch_id, role, full_name, phone, email, password_hash)
           VALUES (1, 'MERCHANT', $1, $2, $3, $4)
           RETURNING id`,
          [contactName || businessName, phone, email || null, passHash]
        );
        const userId = userRes.rows[0].id;

        // Generate Merchant Code (e.g. MRC-8491)
        const codeNum = Math.floor(1000 + Math.random() * 9000);
        const merchantCode = `MRC-${codeNum}`;

        let finalMaps = googleMapsUrl;
        if (!finalMaps && latitude && longitude) {
          finalMaps = `https://maps.google.com/?q=${latitude},${longitude}`;
        }

        const mRes = await client.query(
          `INSERT INTO merchants (
            user_id, merchant_code, business_name, pickup_address, city_id, zone_id,
            latitude, longitude, google_maps_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [userId, merchantCode, businessName, pickupAddress, cityId, zoneId, latitude || null, longitude || null, finalMaps || null]
        );

        return mRes.rows[0];
      });

      return res.status(201).json({
        success: true,
        message: `تم تكويد التاجر بنجاح بكود [${result.merchant_code}]`,
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'فشل تكويد التاجر' });
    }
  }
);

// كشف حساب التاجر المفصل
router.get('/merchants/:id/statement', authenticateToken, async (req: AuthRequest, res: Response) => {
  const merchantId = parseInt(req.params.id, 10);

  try {
    const merchantRes = await query(`SELECT * FROM merchants WHERE id = $1`, [merchantId]);
    if (merchantRes.rowCount === 0) return res.status(404).json({ success: false, message: 'التاجر غير موجود' });

    // Lines from Journal entries involving this merchant
    const linesRes = await query(
      `SELECT jel.id, jv.entry_number, jv.entry_date, jv.reference_type, jv.description,
              jel.debit, jel.credit, jel.line_description,
              coa.account_code, coa.account_name
       FROM journal_entry_lines jel
       JOIN journal_entries jv ON jv.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE jel.merchant_id = $1
       ORDER BY jv.entry_date DESC, jv.id DESC`,
      [merchantId]
    );

    // Calc balance
    let totalCredit = 0; // مستحقات بضاعة مضافة
    let totalDebit = 0;  // مسحوبات / تحويلات مسددة
    linesRes.rows.forEach((r) => {
      totalCredit += parseFloat(r.credit);
      totalDebit += parseFloat(r.debit);
    });

    return res.json({
      success: true,
      data: {
        merchant: merchantRes.rows[0],
        totalCredit,
        totalDebit,
        netPayableBalance: totalCredit - totalDebit,
        transactions: linesRes.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب كشف حساب التاجر' });
  }
});

// ==============================================================================
// 5. تكويد وإدارة المناديب (COURIERS DIRECTORY, LIVE LOCATION & STATEMENTS)
// ==============================================================================
router.get('/couriers', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const resCouriers = await query(
      `SELECT c.id, c.courier_code, c.national_id, c.vehicle_type, c.vehicle_plate_number,
              c.branch_id, c.max_unsettled_days, c.max_unsettled_amount,
              c.is_suspended_from_assignment, c.last_known_lat, c.last_known_lng,
              c.last_location_updated_at,
              u.full_name, u.phone, b.name as branch_name,
              COALESCE(SUM(jel.debit) - SUM(jel.credit), 0.00) as current_liability,
              COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'OUT_FOR_DELIVERY') as active_orders_count
       FROM couriers c
       JOIN users u ON u.id = c.user_id
       JOIN branches b ON b.id = c.branch_id
       LEFT JOIN journal_entry_lines jel ON jel.courier_id = c.id AND jel.account_id = (
         SELECT id FROM chart_of_accounts WHERE account_code = '1020'
       )
       LEFT JOIN shipments s ON s.assigned_courier_id = c.id
       WHERE c.is_active = true
       GROUP BY c.id, c.courier_code, c.national_id, c.vehicle_type, c.vehicle_plate_number,
                c.branch_id, c.max_unsettled_days, c.max_unsettled_amount,
                c.is_suspended_from_assignment, c.last_known_lat, c.last_known_lng,
                c.last_location_updated_at, u.full_name, u.phone, b.name
       ORDER BY c.id DESC`
    );
    return res.json({ success: true, data: resCouriers.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب المناديب' });
  }
});

// تكويد مندوب جديد
router.post(
  '/couriers',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']),
  async (req: AuthRequest, res: Response) => {
    const { fullName, phone, nationalId, vehicleType, plateNumber, branchId, maxUnsettledDays, password } = req.body;

    if (!fullName || !phone || !nationalId) {
      return res.status(400).json({ success: false, message: 'يرجى استكمال بيانات المندوب الأساسية والرقم القومي' });
    }

    try {
      const result = await executeTransaction(async (client) => {
        const passHash = await bcrypt.hash(password || 'Admin@123456', 10);
        const userRes = await client.query(
          `INSERT INTO users (branch_id, role, full_name, phone, password_hash)
           VALUES ($1, 'COURIER', $2, $3, $4)
           RETURNING id`,
          [branchId || 1, fullName, phone, passHash]
        );
        const userId = userRes.rows[0].id;

        const codeNum = Math.floor(1000 + Math.random() * 9000);
        const courierCode = `CR-${codeNum}`;

        const cRes = await client.query(
          `INSERT INTO couriers (
            user_id, courier_code, national_id, vehicle_type, vehicle_plate_number,
            branch_id, max_unsettled_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [userId, courierCode, nationalId, vehicleType || 'MOTORCYCLE', plateNumber || null, branchId || 1, maxUnsettledDays || 2]
        );

        return cRes.rows[0];
      });

      return res.status(201).json({
        success: true,
        message: `تم تكويد المندوب بنجاح بكود [${result.courier_code}]`,
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'فشل تكويد المندوب' });
    }
  }
);

// تحديث لايف لوكيشن المندوب (Live GPS Broadcast) - محمي ضد انتحال الشخصية (Anti-IDOR)
router.post('/couriers/:id/location', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const courierId = parseInt(req.params.id, 10);
  const { latitude, longitude } = req.body;

  // فحص الصلاحية والملكية: المندوب لا يحدث إلا موقعه، والإدارة مسموح لها
  if (user.role === 'COURIER' && user.courierId !== courierId) {
    return res.status(403).json({ success: false, message: 'غير مصرح بتحديث موقع مندوب آخر' });
  }

  if (user.role !== 'COURIER' && !['SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تحديث إحداثيات المناديب' });
  }

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'يرجى إرسال الإحداثيات' });
  }

  try {
    await query(
      `UPDATE couriers 
       SET last_known_lat = $1, last_known_lng = $2, last_location_updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [latitude, longitude, courierId]
    );

    return res.json({ success: true, message: 'تم تحديث موقع المندوب الحي بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل تحديث موقع المندوب' });
  }
});

// كشف حساب المندوب المفصل (Statement & Liability Breakdown) - عزل صلاحيات محكم (Anti-IDOR)
router.get('/couriers/:id/statement', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const courierId = parseInt(req.params.id, 10);

  // منع المندوب من استعراض كشف حساب مندوب آخر
  if (user.role === 'COURIER' && user.courierId !== courierId) {
    return res.status(403).json({ success: false, message: 'غير مصرح باستعراض كشف حساب مندوب آخر' });
  }

  // منع أدوار غير معنية (مثل التاجر أو مدخل البيانات) من استعراض الكشف
  if (!['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER', 'COURIER'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'غير مصرح باستعراض كشف الحساب المالي للمندوب' });
  }

  try {
    const courierRes = await query(
      `SELECT c.*, u.full_name, u.phone, b.name as branch_name 
       FROM couriers c 
       JOIN users u ON u.id = c.user_id 
       JOIN branches b ON b.id = c.branch_id 
       WHERE c.id = $1`,
      [courierId]
    );

    if (courierRes.rowCount === 0) return res.status(404).json({ success: false, message: 'المندوب غير موجود' });

    // عزل الفروع: مدير الفرع يرى مناديب فرعه فقط
    if (user.role === 'BRANCH_MANAGER' && user.branchId && courierRes.rows[0].branch_id !== user.branchId) {
      return res.status(403).json({ success: false, message: 'غير مصرح باستعراض كشف حساب مندوب في فرع آخر' });
    }

    // Financial lines
    const linesRes = await query(
      `SELECT jel.id, jv.entry_number, jv.entry_date, jv.reference_type, jv.description,
              jel.debit, jel.credit, jel.line_description
       FROM journal_entry_lines jel
       JOIN journal_entries jv ON jv.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE jel.courier_id = $1 AND coa.account_code = '1020'
       ORDER BY jv.entry_date DESC, jv.id DESC`,
      [courierId]
    );

    let totalCollectedDebit = 0; // عهدة تحصيلات مضافة
    let totalRemittedCredit = 0; // توريدات ومصروفات مصفاة
    linesRes.rows.forEach((r) => {
      totalCollectedDebit += parseFloat(r.debit);
      totalRemittedCredit += parseFloat(r.credit);
    });

    return res.json({
      success: true,
      data: {
        courier: courierRes.rows[0],
        totalCollected: totalCollectedDebit,
        totalRemitted: totalRemittedCredit,
        netLiability: totalCollectedDebit - totalRemittedCredit,
        transactions: linesRes.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب كشف حساب المندوب' });
  }
});

// ==============================================================================
// 6. قواعد التسعير (PRICING RULES)
// ==============================================================================
router.get('/pricing-rules', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const resRules = await query(
      `SELECT pr.*, c1.name as origin_city, c2.name as destination_city
       FROM pricing_rules pr
       JOIN cities c1 ON c1.id = pr.origin_city_id
       JOIN cities c2 ON c2.id = pr.destination_city_id
       WHERE pr.is_active = true`
    );
    return res.json({ success: true, data: resRules.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'فشل جلب قواعد التسعير' });
  }
});

export default router;
