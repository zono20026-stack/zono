import { Router, Response } from 'express';
import { executeTransaction, query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { recordCourierDailySettlement } from '../services/accounting.js';

const router = Router();

// 1. مؤشرات لوحة التحكم المالية والتشغيلية (Executive KPIs)
router.get('/dashboard-kpis', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Total Shipments counts by status
    const statusCountsRes = await query(
      `SELECT status, COUNT(*) as count, SUM(total_cod_amount) as total_amount
       FROM shipments GROUP BY status`
    );

    const counts: Record<string, number> = {};
    let totalShipments = 0;
    statusCountsRes.rows.forEach((r) => {
      counts[r.status] = Number.parseInt(r.count, 10);
      totalShipments += Number.parseInt(r.count, 10);
    });

    // 2. Financial Balances from Ledger (Calculated Dynamically!)
    const balancesRes = await query(
      `SELECT 
        coa.account_code, coa.account_name, coa.account_type,
        COALESCE(SUM(jel.debit), 0.00) as total_debit,
        COALESCE(SUM(jel.credit), 0.00) as total_credit
       FROM chart_of_accounts coa
       LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
       GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type`
    );

    let branchCashBalance = 0;
    let courierOpenLiabilities = 0;
    let merchantPayables = 0;
    let totalRevenue = 0;

    balancesRes.rows.forEach((b) => {
      const debit = Number.parseFloat(b.total_debit);
      const credit = Number.parseFloat(b.total_credit);
      if (b.account_code === '1010') {
        branchCashBalance = debit - credit; // Cash in hand
      } else if (b.account_code === '1020') {
        courierOpenLiabilities = debit - credit; // Courier COD liability
      } else if (b.account_code === '2010') {
        merchantPayables = credit - debit; // Merchant money due
      } else if (b.account_code === '4010') {
        totalRevenue = credit - debit; // Shipping fees earned
      }
    });

    const deliveredCount = counts['DELIVERED'] || 0;
    const deliveryRate = totalShipments > 0 ? ((deliveredCount / totalShipments) * 100).toFixed(1) : '100.0';

    return res.json({
      success: true,
      data: {
        totalShipments,
        deliveredCount,
        deliveryRate: `${deliveryRate}%`,
        outForDeliveryCount: counts['OUT_FOR_DELIVERY'] || 0,
        newCount: counts['NEW'] || 0,
        assignedCount: counts['ASSIGNED'] || 0,
        failedCount: counts['FAILED_DELIVERY'] || 0,
        returnedCount: counts['RETURNED'] || 0,
        financials: {
          branchCashBalance: Math.max(0, branchCashBalance),
          courierOpenLiabilities: Math.max(0, courierOpenLiabilities),
          merchantPayables: Math.max(0, merchantPayables),
          totalRevenue: Math.max(0, totalRevenue),
        },
      },
    });
  } catch (err: any) {
    console.error('KPI error:', err);
    return res.status(500).json({ success: false, message: 'فشل تحميل مؤشرات الأداء' });
  }
});

// 2. تقرير عهد المناديب المفتوحة (Open Liabilities Report)
router.get(
  '/courier-liabilities',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      let branchFilter = '';
      const params: any[] = [];
      if (user.role === 'BRANCH_MANAGER' && user.branchId) {
        branchFilter = 'WHERE c.branch_id = $1';
        params.push(user.branchId);
      }

      const resLiabilities = await query(
        `SELECT 
          c.id as courier_id, u.full_name as courier_name, u.phone,
          b.name as branch_name, c.max_unsettled_days,
          COALESCE(SUM(jel.debit) - SUM(jel.credit), 0.00) as current_liability,
          COUNT(DISTINCT s.id) filter (where s.status = 'DELIVERED' and s.actual_cod_collected > 0) as delivered_shipments_count,
          MIN(s.updated_at) filter (where s.status = 'DELIVERED' and s.actual_cod_collected > 0) as oldest_unsettled_delivery
         FROM couriers c
         JOIN users u ON u.id = c.user_id
         JOIN branches b ON b.id = c.branch_id
         LEFT JOIN journal_entry_lines jel ON jel.courier_id = c.id AND jel.account_id = (
           SELECT id FROM chart_of_accounts WHERE account_code = '1020'
         )
         LEFT JOIN shipments s ON s.assigned_courier_id = c.id
         ${branchFilter}
         GROUP BY c.id, u.full_name, u.phone, b.name, c.max_unsettled_days`,
        params
      );

      const items = resLiabilities.rows.map((row) => {
        const liability = Number.parseFloat(row.current_liability);
        let daysPending = 0;
        let isExceeded = false;

        if (row.oldest_unsettled_delivery && liability > 0) {
          const oldest = new Date(row.oldest_unsettled_delivery);
          daysPending = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24));
          isExceeded = daysPending >= row.max_unsettled_days;
        }

        return {
          courierId: row.courier_id,
          courierName: row.courier_name,
          phone: row.phone,
          branchName: row.branch_name,
          currentLiability: liability,
          deliveredShipmentsCount: Number.parseInt(row.delivered_shipments_count || '0', 10),
          daysPending,
          maxAllowedDays: row.max_unsettled_days,
          isBlockedFromAssignment: isExceeded,
        };
      });

      return res.json({ success: true, data: items });
    } catch (err: any) {
      console.error('Courier liabilities error:', err);
      return res.status(500).json({ success: false, message: 'فشل جلب تقرير العهد' });
    }
  }
);

// 3. تسوية عهدة المندوب وإغلاقها بتوريد النقدية
router.post(
  '/courier-settlements',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT']),
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { courierId, branchId, totalCollected, approvedExpenses, netCashReceived, notes } = req.body;

    if (!courierId || netCashReceived === undefined) {
      return res.status(400).json({ success: false, message: 'يرجى استكمال بيانات التسوية' });
    }

    try {
      const parsedCollected = Number.parseFloat(totalCollected || '0');
      const parsedExpenses = Number.parseFloat(approvedExpenses || '0');
      const parsedCash = Number.parseFloat(netCashReceived || '0');
      const settlementCode = `SETTLE-${Date.now().toString().slice(-6)}`;

      const result = await executeTransaction(async (client) => {
        // Record double entry in General Ledger
        const jvId = await recordCourierDailySettlement(client, {
          courierId: Number.parseInt(courierId, 10),
          branchId: Number.parseInt(branchId || user.branchId || 1, 10),
          accountantId: user.id,
          totalCollected: parsedCollected,
          approvedExpenses: parsedExpenses,
          netCashReceived: parsedCash,
          settlementCode,
          notes,
        });

        // Insert Settlement Record
        const sRes = await client.query(
          `INSERT INTO courier_daily_settlements (
            settlement_code, courier_id, branch_id, accountant_id,
            total_cod_collected, approved_expenses, net_cash_received,
            journal_entry_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            settlementCode,
            courierId,
            branchId || user.branchId || 1,
            user.id,
            parsedCollected,
            parsedExpenses,
            parsedCash,
            jvId,
            notes || null,
          ]
        );

        return sRes.rows[0];
      });

      return res.status(201).json({
        success: true,
        message: `تمت تسوية عهدة المندوب بنجاح برقم قيد [${result.settlement_code}]`,
        data: result,
      });
    } catch (err: any) {
      console.error('Settlement error:', err);
      return res.status(400).json({ success: false, message: err.message || 'فشل تسجيل التسوية' });
    }
  }
);

// 4. تقرير مستحقات التجار
router.get(
  '/merchant-payables',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']),
  async (req: AuthRequest, res: Response) => {
    try {
      const resMerchants = await query(
        `SELECT 
          m.id as merchant_id, m.business_name, u.phone,
          c.name as city_name,
          COALESCE(SUM(jel.credit) - SUM(jel.debit), 0.00) as current_payable,
          COUNT(DISTINCT s.id) filter (where s.status = 'DELIVERED') as delivered_orders_count
         FROM merchants m
         JOIN users u ON u.id = m.user_id
         JOIN cities c ON c.id = m.city_id
         LEFT JOIN journal_entry_lines jel ON jel.merchant_id = m.id AND jel.account_id = (
           SELECT id FROM chart_of_accounts WHERE account_code = '2010'
         )
         LEFT JOIN shipments s ON s.merchant_id = m.id
         GROUP BY m.id, m.business_name, u.phone, c.name`
      );

      return res.json({
        success: true,
        data: resMerchants.rows.map((r) => ({
          merchantId: r.merchant_id,
          businessName: r.business_name,
          phone: r.phone,
          cityName: r.city_name,
          payableAmount: Number.parseFloat(r.current_payable),
          deliveredOrdersCount: Number.parseInt(r.delivered_orders_count || '0', 10),
        })),
      });
    } catch (err: any) {
      console.error('Merchant payables error:', err);
      return res.status(500).json({ success: false, message: 'فشل جلب مستحقات التجار' });
    }
  }
);

// 5. تسجيل صرف مستحقات تاجر (خارج التطبيق)
router.post(
  '/merchant-payouts',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT']),
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { merchantId, amount, externalRef, channel, notes } = req.body;

    if (!merchantId || !amount || !externalRef || !channel) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال مبلغ التحويل ورقم المرجع الخارجي وقناة التحويل',
      });
    }

    try {
      const parsedAmount = Number.parseFloat(amount);
      const settlementCode = `PAY-${Date.now().toString().slice(-6)}`;

      const result = await executeTransaction(async (client) => {
        // Resolve Accounts: Debit Merchant Payables 2010, Credit Cash/Bank 1010
        const accountsRes = await client.query(
          `SELECT id, account_code FROM chart_of_accounts WHERE account_code IN ('1010', '2010')`
        );
        const accMap: Record<string, number> = {};
        accountsRes.rows.forEach((r) => { accMap[r.account_code] = r.id; });

        const periodRes = await client.query(
          `SELECT id FROM accounting_periods WHERE is_closed = false ORDER BY id DESC LIMIT 1`
        );
        const periodId = periodRes.rows[0].id;

        // Journal Entry
        const jvRes = await client.query(
          `INSERT INTO journal_entries (
            entry_number, period_id, reference_type, description, created_by
          ) VALUES ($1, $2, 'MERCHANT_PAYOUT', $3, $4)
          RETURNING id`,
          [
            `JV-${settlementCode}`,
            periodId,
            `صرف مستحقات تاجر كود ${settlementCode} - مرجع: ${externalRef}`,
            user.id,
          ]
        );
        const jvId = jvRes.rows[0].id;

        // 1. مدين: تخفيض مستحقات التاجر
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, account_id, debit, credit, merchant_id, branch_id, line_description
          ) VALUES ($1, $2, $3, 0.00, $4, 1, $5)`,
          [jvId, accMap['2010'], parsedAmount, merchantId, `صرف مستحقات للتاجر`]
        );

        // 2. دائن: خروج نقدية من الخزينة/البنك
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, account_id, debit, credit, branch_id, line_description
          ) VALUES ($1, $2, 0.00, $3, 1, $4)`,
          [jvId, accMap['1010'], parsedAmount, `تحويل خارجي (${channel})`]
        );

        // Record Merchant Settlement
        const payoutRes = await client.query(
          `INSERT INTO merchant_settlements (
            settlement_code, merchant_id, accountant_id, amount_paid,
            external_transfer_date, external_reference_number, transfer_channel,
            journal_entry_id, notes
          ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8)
          RETURNING *`,
          [settlementCode, merchantId, user.id, parsedAmount, externalRef, channel, jvId, notes || null]
        );

        return payoutRes.rows[0];
      });

      return res.status(201).json({
        success: true,
        message: 'تم تسجيل تحويل مستحقات التاجر بنجاح والقيد متزن',
        data: result,
      });
    } catch (err: any) {
      console.error('Merchant payout error:', err);
      return res.status(400).json({ success: false, message: err.message || 'فشل تسجيل التحويل' });
    }
  }
);

// 6. دفتر اليومية المحاسبي (Journal Entries List)
router.get(
  '/journal-entries',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT']),
  async (req: AuthRequest, res: Response) => {
    try {
      const jvRes = await query(
        `SELECT jv.id, jv.entry_number, jv.entry_date, jv.reference_type, jv.description,
                u.full_name as created_by_name,
                json_agg(
                  json_build_object(
                    'accountCode', coa.account_code,
                    'accountName', coa.account_name,
                    'debit', jel.debit,
                    'credit', jel.credit,
                    'description', jel.line_description
                  )
                ) as lines
         FROM journal_entries jv
         JOIN users u ON u.id = jv.created_by
         JOIN journal_entry_lines jel ON jel.journal_entry_id = jv.id
         JOIN chart_of_accounts coa ON coa.id = jel.account_id
         GROUP BY jv.id, jv.entry_number, jv.entry_date, jv.reference_type, jv.description, u.full_name
         ORDER BY jv.created_at DESC
         LIMIT 50`
      );

      return res.json({ success: true, data: jvRes.rows });
    } catch (err: any) {
      console.error('Journal entries error:', err);
      return res.status(500).json({ success: false, message: 'فشل جلب القيود المحاسبية' });
    }
  }
);

// 7. أرصدة الحسابات العامة (Chart of Accounts Overview with Live Balances)
router.get(
  '/chart-of-accounts',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']),
  async (_req: AuthRequest, res: Response) => {
    try {
      const resAccounts = await query(
        `SELECT 
          coa.id, coa.account_code, coa.account_name, coa.account_type,
          COALESCE(SUM(jel.debit), 0.00) as total_debit,
          COALESCE(SUM(jel.credit), 0.00) as total_credit,
          CASE 
            WHEN coa.account_type IN ('ASSET', 'EXPENSE') THEN COALESCE(SUM(jel.debit) - SUM(jel.credit), 0.00)
            ELSE COALESCE(SUM(jel.credit) - SUM(jel.debit), 0.00)
          END as current_balance
         FROM chart_of_accounts coa
         LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
         GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
         ORDER BY coa.account_code ASC`
      );

      return res.json({ success: true, data: resAccounts.rows });
    } catch (err: any) {
      console.error('Chart of accounts error:', err);
      return res.status(500).json({ success: false, message: 'فشل جلب شجرة الحسابات' });
    }
  }
);

// 8. قائمة المصروفات العامة والتشغيلية (General Expenses List)
router.get(
  '/expenses',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']),
  async (_req: AuthRequest, res: Response) => {
    try {
      const resExp = await query(
        `SELECT ge.*, b.name as branch_name, u.full_name as created_by_name
         FROM general_expenses ge
         JOIN branches b ON b.id = ge.branch_id
         JOIN users u ON u.id = ge.created_by
         ORDER BY ge.expense_date DESC, ge.id DESC
         LIMIT 50`
      );

      return res.json({ success: true, data: resExp.rows });
    } catch (err: any) {
      console.error('Expenses error:', err);
      return res.status(500).json({ success: false, message: 'فشل جلب المصروفات' });
    }
  }
);

// 9. تسجيل مصروف عام جديد مع إصدار قيد مزدوج متزن
router.post(
  '/expenses',
  authenticateToken,
  requireRoles(['SUPER_ADMIN', 'ACCOUNTANT']),
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { branchId, category, amount, paidTo, paymentMethod, notes, expenseDate } = req.body;

    if (!category || !amount || !paidTo) {
      return res.status(400).json({
        success: false,
        message: 'يرجى استكمال بنود المصروف (التصنيف، المبلغ، والجهة المدفوع لها)',
      });
    }

    try {
      const parsedAmount = Number.parseFloat(amount);
      const expenseCode = `EXP-${Date.now().toString().slice(-6)}`;

      const result = await executeTransaction(async (client) => {
        // Resolve Accounts: Debit 5010 Operating Expenses, Credit 1010 Branch Vault
        const accountsRes = await client.query(
          `SELECT id, account_code FROM chart_of_accounts WHERE account_code IN ('1010', '5010')`
        );
        const accMap: Record<string, number> = {};
        accountsRes.rows.forEach((r) => { accMap[r.account_code] = r.id; });

        const periodRes = await client.query(
          `SELECT id FROM accounting_periods WHERE is_closed = false ORDER BY id DESC LIMIT 1`
        );
        const periodId = periodRes.rows[0].id;

        // 1. Create balanced journal entry
        const jvRes = await client.query(
          `INSERT INTO journal_entries (
            entry_number, period_id, reference_type, description, created_by
          ) VALUES ($1, $2, 'GENERAL_EXPENSE', $3, $4)
          RETURNING id`,
          [
            `JV-${expenseCode}`,
            periodId,
            `إثبات مصروف [${category}] - المدفوع له: ${paidTo}`,
            user.id,
          ]
        );
        const jvId = jvRes.rows[0].id;

        // Debit Expense
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, account_id, debit, credit, branch_id, line_description
          ) VALUES ($1, $2, $3, 0.00, $4, $5)`,
          [jvId, accMap['5010'], parsedAmount, branchId || 1, `مصروف: ${category} - ${paidTo}`]
        );

        // Credit Cash
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, account_id, debit, credit, branch_id, line_description
          ) VALUES ($1, $2, 0.00, $3, $4, $5)`,
          [jvId, accMap['1010'], parsedAmount, branchId || 1, `صرف نقدي من الخزينة`]
        );

        // 2. Insert expense record
        const expRes = await client.query(
          `INSERT INTO general_expenses (
            expense_code, branch_id, category, amount, expense_date, paid_to,
            payment_method, notes, journal_entry_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            expenseCode,
            branchId || 1,
            category,
            parsedAmount,
            expenseDate || new Date().toISOString().split('T')[0],
            paidTo,
            paymentMethod || 'CASH',
            notes || null,
            jvId,
            user.id,
          ]
        );

        return expRes.rows[0];
      });

      return res.status(201).json({
        success: true,
        message: `تم تسجيل المصروف بنجاح برقم قيد [${result.expense_code}]`,
        data: result,
      });
    } catch (err: any) {
      console.error('Record expense error:', err);
      return res.status(400).json({ success: false, message: err.message || 'فشل تسجيل المصروف' });
    }
  }
);

export default router;
