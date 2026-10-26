import { PoolClient } from 'pg';
import { query } from '../config/db.js';

export interface DeliveryAccountingParams {
  shipmentId: number;
  trackingNumber: string;
  courierId: number;
  merchantId: number;
  branchId: number;
  goodsValue: number;
  shippingFee: number;
  codCollected: number;
  userId: number;
}

export interface CourierSettlementParams {
  courierId: number;
  branchId: number;
  accountantId: number;
  totalCollected: number;
  approvedExpenses: number;
  netCashReceived: number;
  settlementCode: string;
  notes?: string;
}

export interface MerchantPayoutParams {
  merchantId: number;
  accountantId: number;
  branchId: number;
  amount: number;
  settlementCode: string;
  externalRef: string;
  channel: string;
  notes?: string;
}

// 1. إثبات تحصيل الشحنة كعهدة على المندوب ومستحقات للتاجر وإيراد للشركة
export const recordDeliveryAccounting = async (
  client: PoolClient,
  params: DeliveryAccountingParams
) => {
  // Get active accounting period
  const periodRes = await client.query(
    `SELECT id FROM accounting_periods WHERE is_closed = false ORDER BY id DESC LIMIT 1`
  );
  if (periodRes.rowCount === 0) {
    throw new Error('لا توجد فترة محاسبية مفتوحة لتسجيل القيود');
  }
  const periodId = periodRes.rows[0].id;

  // Resolve account IDs
  const accountsRes = await client.query(
    `SELECT id, account_code FROM chart_of_accounts WHERE account_code IN ('1020', '2010', '4010')`
  );
  const accountMap: Record<string, number> = {};
  accountsRes.rows.forEach((r) => {
    accountMap[r.account_code] = r.id;
  });

  const courierAccId = accountMap['1020']; // عهد المناديب (مدين)
  const merchantAccId = accountMap['2010']; // مستحقات التجار (دائن)
  const revenueAccId = accountMap['4010']; // إيرادات الشحن (دائن)

  const debitTotal = params.codCollected;
  const creditTotal = params.goodsValue + params.shippingFee;

  // Strict double-entry balance check
  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    throw new Error(
      `خلل محاسبي: القيد غير متزن! المدين (${debitTotal}) لا يساوي الدائن (${creditTotal})`
    );
  }

  // Create Journal Entry Header
  const entryNumber = `JV-SHP-${params.trackingNumber}-${Date.now().toString().slice(-4)}`;
  const jvRes = await client.query(
    `INSERT INTO journal_entries (
      entry_number, period_id, reference_type, reference_id, description, created_by
    ) VALUES ($1, $2, 'SHIPMENT_DELIVERY', $3, $4, $5)
    RETURNING id`,
    [
      entryNumber,
      periodId,
      params.shipmentId,
      `إثبات تسليم وتحصيل الشحنة رقم ${params.trackingNumber}`,
      params.userId,
    ]
  );
  const jvId = jvRes.rows[0].id;

  // 1. مدين: عهدة على المندوب
  await client.query(
    `INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, debit, credit, courier_id, branch_id, line_description
    ) VALUES ($1, $2, $3, 0.00, $4, $5, $6)`,
    [
      jvId,
      courierAccId,
      params.codCollected,
      params.courierId,
      params.branchId,
      `تحصيل COD شحنة ${params.trackingNumber}`,
    ]
  );

  // 2. دائن: مستحقات التاجر
  if (params.goodsValue > 0) {
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, merchant_id, branch_id, line_description
      ) VALUES ($1, $2, 0.00, $3, $4, $5, $6)`,
      [
        jvId,
        merchantAccId,
        params.goodsValue,
        params.merchantId,
        params.branchId,
        `مستحقات بضاعة شحنة ${params.trackingNumber}`,
      ]
    );
  }

  // 3. دائن: إيراد خدمة الشحن
  if (params.shippingFee > 0) {
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, branch_id, line_description
      ) VALUES ($1, $2, 0.00, $3, $4, $5)`,
      [
        jvId,
        revenueAccId,
        params.shippingFee,
        params.branchId,
        `رسوم شحن شحنة ${params.trackingNumber}`,
      ]
    );
  }

  return jvId;
};

// 2. تسوية عهدة المندوب اليومية وتوريد الكاش للخزينة
export const recordCourierDailySettlement = async (
  client: PoolClient,
  params: CourierSettlementParams
) => {
  const periodRes = await client.query(
    `SELECT id FROM accounting_periods WHERE is_closed = false ORDER BY id DESC LIMIT 1`
  );
  if (periodRes.rowCount === 0) throw new Error('لا توجد فترة محاسبية مفتوحة');
  const periodId = periodRes.rows[0].id;

  const accountsRes = await client.query(
    `SELECT id, account_code FROM chart_of_accounts WHERE account_code IN ('1010', '1020', '5010')`
  );
  const accountMap: Record<string, number> = {};
  accountsRes.rows.forEach((r) => { accountMap[r.account_code] = r.id; });

  const cashAccId = accountMap['1010'];    // الخزينة (مدين بالوارد)
  const expenseAccId = accountMap['5010']; // المصروفات (مدين)
  const courierAccId = accountMap['1020']; // عهد المناديب (دائن بالتصفية)

  // Double entry: Debit Cash + Debit Expenses = Credit Courier Liability
  const debitTotal = params.netCashReceived + params.approvedExpenses;
  const creditTotal = params.totalCollected;

  const entryNumber = `JV-SETTLE-${params.settlementCode}`;
  const jvRes = await client.query(
    `INSERT INTO journal_entries (
      entry_number, period_id, reference_type, description, created_by
    ) VALUES ($1, $2, 'COURIER_CLEARANCE', $3, $4)
    RETURNING id`,
    [
      entryNumber,
      periodId,
      `تسوية عهدة مندوب يومية - كود ${params.settlementCode}`,
      params.accountantId,
    ]
  );
  const jvId = jvRes.rows[0].id;

  // 1. مدين: الخزينة بالكاش المستلم
  if (params.netCashReceived > 0) {
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, branch_id, line_description
      ) VALUES ($1, $2, $3, 0.00, $4, $5)`,
      [jvId, cashAccId, params.netCashReceived, params.branchId, `توريد كاش عهدة مندوب`]
    );
  }

  // 2. مدين: المصروفات المقبولة
  if (params.approvedExpenses > 0) {
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, courier_id, branch_id, line_description
      ) VALUES ($1, $2, $3, 0.00, $4, $5, $6)`,
      [jvId, expenseAccId, params.approvedExpenses, params.courierId, params.branchId, `مصروفات تشغيلية للمندوب`]
    );
  }

  // 3. دائن: تبرئة ذمة عهدة المندوب
  if (params.totalCollected > 0) {
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, courier_id, branch_id, line_description
      ) VALUES ($1, $2, 0.00, $3, $4, $5, $6)`,
      [jvId, courierAccId, params.totalCollected, params.courierId, params.branchId, `تصفية عهدة التحصيلات`]
    );
  }

  return jvId;
};

// 3. استعلام رصيد عهدة المندوب الحالية المحسوبة ديناميكياً من القيود
export const getCourierCurrentLiability = async (courierId: number): Promise<number> => {
  const res = await query(
    `SELECT COALESCE(SUM(jel.debit) - SUM(jel.credit), 0.00) as balance
     FROM journal_entry_lines jel
     JOIN chart_of_accounts coa ON coa.id = jel.account_id
     WHERE coa.account_code = '1020' AND jel.courier_id = $1`,
    [courierId]
  );
  return parseFloat(res.rows[0]?.balance || '0.00');
};

// 4. استعلام مستحقات التاجر الحالية المحسوبة ديناميكياً من القيود
export const getMerchantCurrentPayable = async (merchantId: number): Promise<number> => {
  const res = await query(
    `SELECT COALESCE(SUM(jel.credit) - SUM(jel.debit), 0.00) as balance
     FROM journal_entry_lines jel
     JOIN chart_of_accounts coa ON coa.id = jel.account_id
     WHERE coa.account_code = '2010' AND jel.merchant_id = $1`,
    [merchantId]
  );
  return parseFloat(res.rows[0]?.balance || '0.00');
};
