import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { transitionShipmentStatus, ShipmentStatus } from '../services/stateMachine.js';
import { getCourierCurrentLiability } from '../services/accounting.js';

const router = Router();

// Generate unguessable, secure tracking number (e.g. ES-8392-4019)
const generateSecureTrackingNumber = (): string => {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `ES-${part1}-${part2}`;
};

// 1. قائمة الشحنات مع الفلترة والصفحات وفحص الصلاحيات
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const { status, search, courierId, merchantId, fromDate, toDate } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  // فحص الملكية التلقائي حسب الدور
  if (user.role === 'COURIER') {
    conditions.push(`s.assigned_courier_id = $${paramIdx++}`);
    params.push(user.courierId);
  } else if (user.role === 'MERCHANT') {
    conditions.push(`s.merchant_id = $${paramIdx++}`);
    params.push(user.merchantId);
  } else if (courierId) {
    conditions.push(`s.assigned_courier_id = $${paramIdx++}`);
    params.push(courierId);
  } else if (merchantId) {
    conditions.push(`s.merchant_id = $${paramIdx++}`);
    params.push(merchantId);
  }

  if (status) {
    conditions.push(`s.status = $${paramIdx++}`);
    params.push(status);
  }

  if (search) {
    conditions.push(
      `(s.tracking_number ILIKE $${paramIdx} OR s.recipient_name ILIKE $${paramIdx} OR s.recipient_phone ILIKE $${paramIdx})`
    );
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (fromDate) {
    conditions.push(`s.scheduled_delivery_date >= $${paramIdx++}`);
    params.push(fromDate);
  }

  if (toDate) {
    conditions.push(`s.scheduled_delivery_date <= $${paramIdx++}`);
    params.push(toDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Total Count
    const countRes = await query(
      `SELECT COUNT(*) as total FROM shipments s ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    // Data query with joins
    const dataSql = `
      SELECT s.id, s.tracking_number, s.public_tracking_token, s.status,
             s.recipient_name, s.recipient_phone, s.recipient_address,
             s.goods_value, s.shipping_fee, s.total_cod_amount, s.actual_cod_collected,
             s.weight_kg, s.package_count, s.delivery_notes, s.scheduled_delivery_date,
             s.package_description, s.allow_open_package, s.customer_id,
             s.recipient_latitude, s.recipient_longitude,
             s.created_at, s.updated_at,
             m.business_name as merchant_name,
             u_c.full_name as courier_name,
             c.last_known_lat as courier_lat,
             c.last_known_lng as courier_lng,
             c_dest.name as destination_city,
             z_dest.name as destination_zone,
             b_orig.name as origin_branch,
             b_dest.name as destination_branch
      FROM shipments s
      JOIN merchants m ON m.id = s.merchant_id
      LEFT JOIN couriers c ON c.id = s.assigned_courier_id
      LEFT JOIN users u_c ON u_c.id = c.user_id
      JOIN cities c_dest ON c_dest.id = s.destination_city_id
      JOIN zones z_dest ON z_dest.id = s.destination_zone_id
      JOIN branches b_orig ON b_orig.id = s.origin_branch_id
      JOIN branches b_dest ON b_dest.id = s.destination_branch_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const dataRes = await query(dataSql, [...params, limit, offset]);

    return res.json({
      success: true,
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('List shipments error:', err);
    return res.status(500).json({ success: false, message: 'فشل استعلام الشحنات' });
  }
});

// 2. تفاصيل شحنة واحدة
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const shipmentId = req.params.id;

  try {
    const resDetail = await query(
      `SELECT s.*, m.business_name as merchant_name, u_c.full_name as courier_name,
              c_dest.name as destination_city, z_dest.name as destination_zone,
              pod.pod_type, pod.otp_code, pod.photo_storage_key, pod.signature_storage_key
       FROM shipments s
       JOIN merchants m ON m.id = s.merchant_id
       LEFT JOIN couriers c ON c.id = s.assigned_courier_id
       LEFT JOIN users u_c ON u_c.id = c.user_id
       JOIN cities c_dest ON c_dest.id = s.destination_city_id
       JOIN zones z_dest ON z_dest.id = s.destination_zone_id
       LEFT JOIN proof_of_delivery pod ON pod.shipment_id = s.id
       WHERE s.id = $1`,
      [shipmentId]
    );

    if (resDetail.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'الشحنة غير موجودة' });
    }

    const shipment = resDetail.rows[0];

    // Ownership check
    if (user.role === 'COURIER' && shipment.assigned_courier_id !== user.courierId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بمشاهدة هذه الشحنة' });
    }
    if (user.role === 'MERCHANT' && shipment.merchant_id !== user.merchantId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بمشاهدة هذه الشحنة' });
    }

    // Get History Log
    const historyRes = await query(
      `SELECT ssh.*, u.full_name as changed_by_name
       FROM shipment_status_history ssh
       JOIN users u ON u.id = ssh.changed_by
       WHERE ssh.shipment_id = $1
       ORDER BY ssh.server_timestamp ASC`,
      [shipmentId]
    );

    return res.json({
      success: true,
      data: {
        ...shipment,
        history: historyRes.rows,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الشحنة' });
  }
});

// 3. إنشاء شحنة جديدة (مع حساب السعر التلقائي)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const {
    merchantId,
    originBranchId,
    destinationBranchId,
    recipientName,
    recipientPhone,
    recipientPhoneAlt,
    destinationCityId,
    destinationZoneId,
    recipientAddress,
    deliveryNotes,
    weightKg,
    packageCount,
    goodsValue,
    scheduledDeliveryDate,
    packageDescription,
    allowOpenPackage,
    customerId,
    recipientLatitude,
    recipientLongitude,
  } = req.body;

  // Resolve merchant ID
  const effectiveMerchantId = user.role === 'MERCHANT' ? user.merchantId : (merchantId || 1);

  if (!recipientName || !recipientPhone || !destinationCityId || !destinationZoneId || !recipientAddress) {
    return res.status(400).json({
      success: false,
      message: 'يرجى استكمال جميع بيانات المستلم الإلزامية',
    });
  }

  try {
    // 1. Calculate pricing dynamically
    const parsedWeight = parseFloat(weightKg || '1.0');
    const parsedGoodsValue = parseFloat(goodsValue || '0.0');

    // Fetch pricing rule
    const pricingRes = await query(
      `SELECT base_price, extra_kg_price, base_weight_kg 
       FROM pricing_rules 
       WHERE origin_city_id = 1 AND destination_city_id = $1`,
      [destinationCityId]
    );

    let shippingFee = 50.00; // default
    if (pricingRes.rowCount && pricingRes.rowCount > 0) {
      const rule = pricingRes.rows[0];
      const basePrice = parseFloat(rule.base_price);
      const extraPrice = parseFloat(rule.extra_kg_price);
      const baseWeight = parseFloat(rule.base_weight_kg);
      const extraWeight = Math.max(0, parsedWeight - baseWeight);
      shippingFee = basePrice + extraWeight * extraPrice;
    }

    const totalCod = parsedGoodsValue + shippingFee;
    const trackingNumber = generateSecureTrackingNumber();

    // Auto-link or find customer by phone
    let finalCustId = customerId || null;
    if (!finalCustId && recipientPhone) {
      const existingCust = await query(`SELECT id FROM customers WHERE phone = $1`, [recipientPhone]);
      if (existingCust.rowCount && existingCust.rowCount > 0) {
        finalCustId = existingCust.rows[0].id;
      } else {
        // Auto-code new customer
        const custCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
        const newCustRes = await query(
          `INSERT INTO customers (customer_code, name, phone, phone_alt, city_id, zone_id, address, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            custCode,
            recipientName,
            recipientPhone,
            recipientPhoneAlt || null,
            destinationCityId,
            destinationZoneId,
            recipientAddress,
            recipientLatitude || null,
            recipientLongitude || null,
          ]
        );
        finalCustId = newCustRes.rows[0].id;
      }
    }

    const insertRes = await query(
      `INSERT INTO shipments (
        tracking_number, merchant_id, origin_branch_id, destination_branch_id,
        recipient_name, recipient_phone, recipient_phone_alt, destination_city_id,
        destination_zone_id, recipient_address, delivery_notes, weight_kg,
        package_count, goods_value, shipping_fee, total_cod_amount,
        scheduled_delivery_date, package_description, allow_open_package,
        customer_id, recipient_latitude, recipient_longitude, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        trackingNumber,
        effectiveMerchantId,
        originBranchId || 1,
        destinationBranchId || 1,
        recipientName,
        recipientPhone,
        recipientPhoneAlt || null,
        destinationCityId,
        destinationZoneId,
        recipientAddress,
        deliveryNotes || null,
        parsedWeight,
        packageCount || 1,
        parsedGoodsValue,
        shippingFee,
        totalCod,
        scheduledDeliveryDate || new Date().toISOString().split('T')[0],
        packageDescription || 'طرد بضائع عامة',
        allowOpenPackage !== undefined ? allowOpenPackage : true,
        finalCustId,
        recipientLatitude || null,
        recipientLongitude || null,
        user.id,
      ]
    );

    const newShipment = insertRes.rows[0];

    // Log initial history
    await query(
      `INSERT INTO shipment_status_history (shipment_id, from_status, to_status, changed_by, reason)
       VALUES ($1, NULL, 'NEW', $2, 'إنشاء الشحنة في النظام')`,
      [newShipment.id, user.id]
    );

    return res.status(201).json({
      success: true,
      message: `تم إنشاء الشحنة بنجاح برقم تتبع ${trackingNumber}`,
      data: newShipment,
    });
  } catch (err: any) {
    console.error('Create shipment error:', err);
    return res.status(500).json({ success: false, message: 'فشل إنشاء الشحنة' });
  }
});

// 4. تعيين مندوب للشحنة (مع فحص حظر العهدة المتأخرة X Days)
router.post('/:id/assign', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const shipmentId = parseInt(req.params.id, 10);
  const { courierId } = req.body;

  if (!courierId) {
    return res.status(400).json({ success: false, message: 'يرجى اختيار المندوب' });
  }

  try {
    // 1. Fetch courier details and rules
    const courierRes = await query(
      `SELECT c.id, c.max_unsettled_days, c.is_suspended_from_assignment, u.full_name
       FROM couriers c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [courierId]
    );

    if (courierRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
    }

    const courier = courierRes.rows[0];

    if (courier.is_suspended_from_assignment) {
      return res.status(400).json({
        success: false,
        message: `تم إيقاف المندوب [${courier.full_name}] عن استلام شحنات جديدة بقرار إداري`,
      });
    }

    // 2. فحص شرط العهدة المتأخرة لأكثر من X يوم
    const oldLiabilityRes = await query(
      `SELECT MIN(s.updated_at) as oldest_delivery
       FROM shipments s
       WHERE s.assigned_courier_id = $1 
         AND s.status = 'DELIVERED'
         AND s.actual_cod_collected > 0
         AND s.id NOT IN (
           SELECT reference_id FROM journal_entries WHERE reference_type = 'COURIER_CLEARANCE'
         )`,
      [courierId]
    );

    if (oldLiabilityRes.rows[0]?.oldest_delivery) {
      const oldestDate = new Date(oldLiabilityRes.rows[0].oldest_delivery);
      const diffDays = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= courier.max_unsettled_days) {
        return res.status(400).json({
          success: false,
          message: `ممنوع الإسناد: المندوب [${courier.full_name}] لديه عهدة معلقة منذ ${diffDays} يوم (الحد الأقصى المسموح به هو ${courier.max_unsettled_days} يوم). يجب تسوية العهدة أولاً.`,
        });
      }
    }

    // Update assignment & change status to ASSIGNED
    await query(`UPDATE shipments SET assigned_courier_id = $1 WHERE id = $2`, [courierId, shipmentId]);

    const updated = await transitionShipmentStatus({
      shipmentId,
      toStatus: 'ASSIGNED',
      userId: user.id,
      reason: `تعيين الشحنة للمندوب ${courier.full_name}`,
    });

    return res.json({
      success: true,
      message: `تم تعيين الشحنة للمندوب ${courier.full_name} بنجاح`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'فشل تعيين المندوب' });
  }
});

// 5. تغيير حالة الشحنة (مع فحص الماكينة والإثبات)
router.post('/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const shipmentId = parseInt(req.params.id, 10);
  const {
    toStatus,
    reason,
    latitude,
    longitude,
    podType,
    otpCode,
    photoStorageKey,
    signatureStorageKey,
    recipientNotes,
    actualCodCollected,
  } = req.body;

  try {
    const updated = await transitionShipmentStatus({
      shipmentId,
      toStatus: toStatus as ShipmentStatus,
      userId: user.id,
      reason,
      latitude,
      longitude,
      podType,
      otpCode,
      photoStorageKey,
      signatureStorageKey,
      recipientNotes,
      actualCodCollected: actualCodCollected ? parseFloat(actualCodCollected) : undefined,
    });

    return res.json({
      success: true,
      message: `تم تحديث حالة الشحنة إلى [${toStatus}] بنجاح`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'فشل تغيير حالة الشحنة' });
  }
});

export default router;
