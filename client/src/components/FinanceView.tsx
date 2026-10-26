import React, { useState, useEffect } from 'react';
import { CourierLiability, MerchantPayable, JournalEntry, User, AccountBalance, GeneralExpense } from '../types';
import { apiFetch } from '../api';
import {
  Wallet,
  Coins,
  BookOpen,
  X,
  CreditCard,
  Plus,
  TrendingUp,
  RefreshCw,
  FileText,
  CheckCircle2,
  Printer
} from './icons';

interface FinanceViewProps {
  user: User | null;
}

type FinanceSubTab = 'accounts' | 'expenses' | 'couriers' | 'merchants' | 'journal';

export const FinanceView: React.FC<FinanceViewProps> = ({ user: _user }) => {
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>('accounts');
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [courierLiabilities, setCourierLiabilities] = useState<CourierLiability[]>([]);
  const [merchantPayables, setMerchantPayables] = useState<MerchantPayable[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Settlement Modal state
  const [selectedCourier, setSelectedCourier] = useState<CourierLiability | null>(null);
  const [cashToReceive, setCashToReceive] = useState<string>('');
  const [approvedExpenses, setApprovedExpenses] = useState<string>('0');
  const [settlementNotes, setSettlementNotes] = useState<string>('');

  // Merchant Payout Modal state
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantPayable | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [externalRef, setExternalRef] = useState<string>('');
  const [transferChannel, setTransferChannel] = useState<string>('INSTAPAY');
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // General Expense Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseCategory, setExpenseCategory] = useState<string>('وقود وبنزين');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expensePaidTo, setExpensePaidTo] = useState<string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<string>('CASH');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  // Statement Modal state (for Couriers and Merchants)
  const [statementModal, setStatementModal] = useState<{
    open: boolean;
    title: string;
    type: 'courier' | 'merchant';
    name: string;
    loading: boolean;
    summary: Record<string, unknown> | null;
    lines: Array<{
      id?: string | number;
      entry_number: string;
      entry_date: string;
      description?: string;
      line_description?: string;
      debit: string;
      credit: string;
    }>;
  }>({
    open: false,
    title: '',
    type: 'courier',
    name: '',
    loading: false,
    summary: null,
    lines: [],
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSubTabData = async (tab: FinanceSubTab) => {
    switch (tab) {
      case 'accounts': {
        const res = await apiFetch('/finance/chart-of-accounts');
        if (res.success) setAccounts(res.data);
        break;
      }
      case 'expenses': {
        const res = await apiFetch('/finance/expenses');
        if (res.success) setExpenses(res.data);
        break;
      }
      case 'couriers': {
        const res = await apiFetch('/finance/courier-liabilities');
        if (res.success) setCourierLiabilities(res.data);
        break;
      }
      case 'merchants': {
        const res = await apiFetch('/finance/merchant-payables');
        if (res.success) setMerchantPayables(res.data);
        break;
      }
      case 'journal': {
        const res = await apiFetch('/finance/journal-entries');
        if (res.success) setJournalEntries(res.data);
        break;
      }
    }
  };

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      await fetchSubTabData(activeSubTab);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل جلب البيانات المالية';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFinanceData();
  }, [activeSubTab]);

  const handleCourierSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return;

    try {
      const res = await apiFetch('/finance/courier-settlements', {
        method: 'POST',
        body: JSON.stringify({
          courierId: selectedCourier.courierId,
          totalCollected: selectedCourier.currentLiability,
          netCashReceived: cashToReceive,
          approvedExpenses,
          notes: settlementNotes,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setSelectedCourier(null);
        setCashToReceive('');
        setApprovedExpenses('0');
        setSettlementNotes('');
        void loadFinanceData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل اعتماد التسوية';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleMerchantPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;

    try {
      const res = await apiFetch('/finance/merchant-payouts', {
        method: 'POST',
        body: JSON.stringify({
          merchantId: selectedMerchant.merchantId,
          amount: payoutAmount,
          externalRef,
          channel: transferChannel,
          notes: payoutNotes,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setSelectedMerchant(null);
        setPayoutAmount('');
        setExternalRef('');
        setPayoutNotes('');
        void loadFinanceData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل صرف المستحقات';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expensePaidTo) {
      setFeedback({ type: 'error', message: 'يرجى إدخال مبلغ المصروف والجهة المدفوع لها' });
      return;
    }

    try {
      const res = await apiFetch('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: expenseCategory,
          amount: expenseAmount,
          paidTo: expensePaidTo,
          paymentMethod: expensePaymentMethod,
          expenseDate,
          notes: expenseNotes,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsExpenseModalOpen(false);
        setExpenseAmount('');
        setExpensePaidTo('');
        setExpenseNotes('');
        void loadFinanceData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل المصروف';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const openStatement = async (type: 'courier' | 'merchant', id: number, name: string) => {
    setStatementModal({
      open: true,
      title: `كشف حساب تفصيلي: ${name}`,
      type,
      name,
      loading: true,
      summary: null,
      lines: [],
    });

    try {
      const endpoint = type === 'courier'
        ? `/master/couriers/${id}/statement`
        : `/master/merchants/${id}/statement`;
      const res = await apiFetch(endpoint);
      if (res.success) {
        setStatementModal((prev) => ({
          ...prev,
          summary: (res.data.courier || res.data.merchant || {}) as Record<string, unknown>,
          lines: (res.data.transactions || res.data.lines || []),
          loading: false,
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل جلب كشف الحساب';
      setFeedback({ type: 'error', message: msg });
      setStatementModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'أصول (Assets)';
      case 'LIABILITY':
        return 'التزامات (Liabilities)';
      case 'EQUITY':
        return 'حقوق ملكية';
      case 'REVENUE':
        return 'إيرادات (Revenues)';
      case 'EXPENSE':
        return 'مصروفات (Expenses)';
      default:
        return type;
    }
  };

  // Helper values for accounts overview
  const vaultBalance = accounts.find((a) => a.account_code === '1010')?.current_balance || '0.00';
  const couriersCodBalance = accounts.find((a) => a.account_code === '1020')?.current_balance || '0.00';
  const merchantsPayableBalance = accounts.find((a) => a.account_code === '2010')?.current_balance || '0.00';
  const revenuesBalance = accounts.find((a) => a.account_code === '4010')?.current_balance || '0.00';
  const expensesBalance = accounts.find((a) => a.account_code === '5010')?.current_balance || '0.00';

  return (
    <div>
      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            backgroundColor: feedback.type === 'success' ? 'var(--accent-green-light)' : 'var(--danger-red-light)',
            color: feedback.type === 'success' ? 'var(--accent-green)' : 'var(--danger-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
            الإدارة المالية وشجرة الحسابات (القيد المزدوج المتزن)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            أرصدة الحسابات الحية، تسجيل المصروفات، تسويات عهد المناديب، وصرف مستحقات التجار
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { void loadFinanceData(); }} className="btn btn-secondary btn-sm" title="تحديث الأرصدة">
            <RefreshCw size={15} />
            <span>تحديث</span>
          </button>
          <button onClick={() => setIsExpenseModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeSubTab === 'accounts' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSubTab('accounts')}
        >
          <TrendingUp size={16} />
          <span>أرصدة الحسابات العامة (شجرة الحسابات)</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'expenses' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSubTab('expenses')}
        >
          <Wallet size={16} />
          <span>المصروفات العامة والتشغيلية</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'couriers' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSubTab('couriers')}
        >
          <Coins size={16} />
          <span>عهد المناديب المعلقة والتحصيلات</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'merchants' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSubTab('merchants')}
        >
          <CreditCard size={16} />
          <span>مستحقات التجار وصرف الحسابات</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'journal' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSubTab('journal')}
        >
          <BookOpen size={16} />
          <span>دفتر القيود اليومية (General Journal)</span>
        </button>
      </div>

      {/* TAB 1: CHART OF ACCOUNTS & LIVE BALANCES */}
      {activeSubTab === 'accounts' && (
        <div>
          {/* Core Balance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '18px', borderRight: '4px solid var(--accent-green)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>1010 - النقدية بخزينة الفرع</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)', marginTop: '4px' }}>
                {Number.parseFloat(vaultBalance).toLocaleString('ar-EG')} ج.م
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                أصل متداول متاح للصرف والتحويل
              </div>
            </div>

            <div className="card" style={{ padding: '18px', borderRight: '4px solid var(--primary-blue)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>1020 - عهد المناديب المحصلة (COD)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-blue)', marginTop: '4px' }}>
                {Number.parseFloat(couriersCodBalance).toLocaleString('ar-EG')} ج.م
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                تحصيلات نقدية في ذمة المناديب
              </div>
            </div>

            <div className="card" style={{ padding: '18px', borderRight: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>2010 - مستحقات التجار المعلقة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', marginTop: '4px' }}>
                {Number.parseFloat(merchantsPayableBalance).toLocaleString('ar-EG')} ج.م
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                التزام مستحق للتجار عن الطرود المسلمة
              </div>
            </div>

            <div className="card" style={{ padding: '18px', borderRight: '4px solid #059669' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>4010 - إيرادات خدمات الشحن</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
                {Number.parseFloat(revenuesBalance).toLocaleString('ar-EG')} ج.م
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                أرباح وعمولات الشحن المحققة
              </div>
            </div>

            <div className="card" style={{ padding: '18px', borderRight: '4px solid var(--danger-red)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>5010 - المصروفات التشغيلية</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--danger-red)', marginTop: '4px' }}>
                {Number.parseFloat(expensesBalance).toLocaleString('ar-EG')} ج.م
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                وقود، صيانة، إيجارات ونثريات
              </div>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px', background: 'var(--bg-offwhite)', borderBottom: '1px solid var(--border-subtle)', fontWeight: 800 }}>
              دليل وأرصدة شجرة الحسابات العامة (Chart of Accounts)
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>كود الحساب</th>
                    <th>اسم الحساب</th>
                    <th>طبيعة الحساب</th>
                    <th>إجمالي مدين (Debit)</th>
                    <th>إجمالي دائن (Credit)</th>
                    <th>الرصيد الصافي الفعلي</th>
                    <th>الحالة المحاسبية</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const bal = Number.parseFloat(acc.current_balance);
                    return (
                      <tr key={acc.id}>
                        <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>{acc.account_code}</td>
                        <td style={{ fontWeight: 700 }}>{acc.account_name}</td>
                        <td>
                          <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                            {getAccountTypeLabel(acc.account_type)}
                          </span>
                        </td>
                        <td style={{ color: 'var(--primary-blue)', fontWeight: 700 }}>
                          {Number.parseFloat(acc.total_debit).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
                          {Number.parseFloat(acc.total_credit).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td style={{ fontWeight: 900, fontSize: '1rem', color: bal >= 0 ? 'var(--text-main)' : 'var(--danger-red)' }}>
                          {bal.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td>
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                            <CheckCircle2 size={12} />
                            <span>متزن آلياً</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {accounts.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        لا توجد حسابات مسجلة حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL EXPENSES */}
      {activeSubTab === 'expenses' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px', background: 'var(--bg-offwhite)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>سجل المصروفات العامة والتشغيلية المعتمدة</span>
            <button onClick={() => setIsExpenseModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>تسجيل مصروف جديد</span>
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود المصروف</th>
                  <th>الفرع</th>
                  <th>التصنيف / البند</th>
                  <th>المبلغ</th>
                  <th>تاريخ الصرف</th>
                  <th>الجهة المدفوع لها</th>
                  <th>طريقة الصرف</th>
                  <th>ملاحظات</th>
                  <th>الموظف المسجل</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>{exp.expense_code}</td>
                    <td>{exp.branch_name}</td>
                    <td>
                      <span className="badge badge-blue">{exp.category}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--danger-red)' }}>
                      {Number.parseFloat(exp.amount).toLocaleString('ar-EG')} ج.م
                    </td>
                    <td>{new Date(exp.expense_date).toLocaleDateString('ar-EG')}</td>
                    <td style={{ fontWeight: 600 }}>{exp.paid_to}</td>
                    <td>
                      <span className="badge badge-gray">{exp.payment_method}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{exp.notes || '-'}</td>
                    <td>{exp.created_by_name}</td>
                  </tr>
                ))}
                {expenses.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      لم يتم تسجيل مصروفات بعد. انقر على "تسجيل مصروف جديد" لإضافة أول بند.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COURIER LIABILITIES */}
      {activeSubTab === 'couriers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>المندوب</th>
                  <th>الهاتف</th>
                  <th>الفرع</th>
                  <th>عدد الشحنات المسلمة</th>
                  <th>العهدة النقدية الحالية (COD)</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {courierLiabilities.map((c) => (
                  <tr key={c.courierId}>
                    <td style={{ fontWeight: 700 }}>{c.courierName}</td>
                    <td>{c.phone}</td>
                    <td>{c.branchName}</td>
                    <td>{c.deliveredShipmentsCount} شحنة</td>
                    <td style={{ fontWeight: 900, color: c.currentLiability > 0 ? 'var(--danger-red)' : 'var(--accent-green)' }}>
                      {c.currentLiability.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td>
                      {c.currentLiability > 0 ? (
                        <span className="badge badge-amber">بانتظار التوريد</span>
                      ) : (
                        <span className="badge badge-green">مورد بالكامل</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {c.currentLiability > 0 && (
                          <button
                            onClick={() => {
                              setSelectedCourier(c);
                              setCashToReceive(c.currentLiability.toString());
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            <Coins size={14} />
                            <span>تسوية العهدة</span>
                          </button>
                        )}
                        <button
                          onClick={() => { void openStatement('courier', c.courierId, c.courierName); }}
                          className="btn btn-secondary btn-sm"
                          title="عرض كشف الحساب التفصيلي للمندوب"
                        >
                          <FileText size={14} />
                          <span>كشف الحساب</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MERCHANT PAYABLES */}
      {activeSubTab === 'merchants' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>التاجر</th>
                  <th>الهاتف</th>
                  <th>المدينة</th>
                  <th>الشحنات المسلمة</th>
                  <th>المستحقات المعلقة للصرف</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {merchantPayables.map((m) => (
                  <tr key={m.merchantId}>
                    <td style={{ fontWeight: 700 }}>{m.businessName}</td>
                    <td>{m.phone}</td>
                    <td>{m.cityName}</td>
                    <td>{m.deliveredOrdersCount} شحنة</td>
                    <td style={{ fontWeight: 900, color: m.payableAmount > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {m.payableAmount.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td>
                      {m.payableAmount > 0 ? (
                        <span className="badge badge-green">مستحق للصرف</span>
                      ) : (
                        <span className="badge badge-gray">لا توجد مستحقات</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {m.payableAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedMerchant(m);
                              setPayoutAmount(m.payableAmount.toString());
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            <CreditCard size={14} />
                            <span>صرف المستحقات</span>
                          </button>
                        )}
                        <button
                          onClick={() => { void openStatement('merchant', m.merchantId, m.businessName); }}
                          className="btn btn-secondary btn-sm"
                          title="عرض كشف الحساب التفصيلي للتاجر"
                        >
                          <FileText size={14} />
                          <span>كشف الحساب</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: JOURNAL ENTRIES */}
      {activeSubTab === 'journal' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم القيد</th>
                  <th>التاريخ</th>
                  <th>البيان</th>
                  <th>نوع المرجع</th>
                  <th>المسؤول</th>
                  <th>طرفي القيد (المدين والدائن)</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.map((jv) => (
                  <tr key={jv.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>{jv.entry_number}</td>
                    <td>{new Date(jv.entry_date).toLocaleDateString('ar-EG')}</td>
                    <td style={{ fontWeight: 600 }}>{jv.description}</td>
                    <td>
                      <span className="badge badge-gray">{jv.reference_type}</span>
                    </td>
                    <td>{jv.created_by_name || jv.full_name}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                        {jv.lines?.map((line, idx) => (
                          <div key={`${jv.id}-${line.accountCode}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '2px 4px', background: 'var(--bg-offwhite)', borderRadius: '4px' }}>
                            <span>
                              [{line.accountCode}] {line.accountName}
                            </span>
                            <span style={{ fontWeight: 700, color: Number.parseFloat(line.debit) > 0 ? 'var(--primary-blue)' : 'var(--accent-green)' }}>
                              {Number.parseFloat(line.debit) > 0 ? `مدين: ${line.debit}` : `دائن: ${line.credit}`} ج.م
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Record General Expense */}
      {isExpenseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                تسجيل مصروف عام جديد (إصدار قيد مزدوج آلي)
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordExpense}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="expCategorySelect" className="form-label">تصنيف / بند المصروف:</label>
                    <select
                      id="expCategorySelect"
                      className="form-select"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    >
                      <option value="وقود وبنزين">وقود وبنزين مركبات</option>
                      <option value="صيانة مركبات">صيانة وقطع غيار مركبات</option>
                      <option value="إيجار فرع">إيجار مقر الفرع</option>
                      <option value="نثريات وضيافة">نثريات وضيافة ونظافة</option>
                      <option value="بوالص وأدوات مكتبية">بوالص وطباعة ومستلزمات مكتبية</option>
                      <option value="رواتب وحوافز">رواتب ومكافآت وحوافز</option>
                      <option value="أخرى">مصروفات تشغيلية أخرى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="expAmountInput" className="form-label">المبلغ المطلوب صرفه (ج.م):</label>
                    <input
                      id="expAmountInput"
                      type="number"
                      step="1"
                      required
                      className="form-input"
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="expPaidToInput" className="form-label">الجهة أو الشخص المدفوع له:</label>
                    <input
                      id="expPaidToInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="مثال: محطة مصر للبترول / مالك العقار"
                      value={expensePaidTo}
                      onChange={(e) => setExpensePaidTo(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="expPaymentMethodSelect" className="form-label">طريقة السداد:</label>
                    <select
                      id="expPaymentMethodSelect"
                      className="form-select"
                      value={expensePaymentMethod}
                      onChange={(e) => setExpensePaymentMethod(e.target.value)}
                    >
                      <option value="CASH">نقداً من الخزينة (حساب 1010)</option>
                      <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="PETTY_CASH">سلفة عهدة نقدية</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="expDateInput" className="form-label">تاريخ الصرف:</label>
                  <input
                    id="expDateInput"
                    type="date"
                    required
                    className="form-input"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expNotesInput" className="form-label">ملاحظات وبيان المصروف:</label>
                  <input
                    id="expNotesInput"
                    type="text"
                    className="form-input"
                    placeholder="رقم الفاتورة أو تفاصيل إضافية عن الصرف"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                  />
                </div>

                <div style={{ background: 'var(--bg-offwhite)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  سيتم آلياً توليد قيد مزدوج متزن: مدين [5010 مصروفات تشغيلية] ودائن [1010 خزينة الفرع] وتحديث الأرصدة لحظياً.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  اعتماد وصرف المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Courier Settlement */}
      {selectedCourier && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                تسوية عهدة المندوب: {selectedCourier.courierName}
              </h3>
              <button onClick={() => setSelectedCourier(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCourierSettlement}>
              <div className="modal-body">
                <div style={{ padding: '14px', background: 'var(--bg-offwhite)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>إجمالي المبالغ المحصلة (COD) من الشحنات:</span>
                    <strong style={{ color: 'var(--primary-blue)' }}>
                      {selectedCourier.currentLiability.toLocaleString('ar-EG')} ج.م
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>عدد الشحنات المسلمة:</span>
                    <strong>{selectedCourier.deliveredShipmentsCount} شحنة</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="courierCashInput" className="form-label">صافي النقدية المستلمة في الخزينة:</label>
                    <input
                      id="courierCashInput"
                      type="number"
                      step="0.5"
                      required
                      className="form-input"
                      value={cashToReceive}
                      onChange={(e) => setCashToReceive(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="courierExpensesInput" className="form-label">مصروفات معتمدة ومخصومة للمندوب:</label>
                    <input
                      id="courierExpensesInput"
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={approvedExpenses}
                      onChange={(e) => setApprovedExpenses(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="courierSettlementNotesInput" className="form-label">ملاحظات التسوية:</label>
                  <input
                    id="courierSettlementNotesInput"
                    type="text"
                    className="form-input"
                    placeholder="رقم إيصال التوريد أو بيان العهدة"
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedCourier(null)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  اعتماد التسوية وإيداع النقدية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Merchant Payout */}
      {selectedMerchant && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                صرف مستحقات التاجر: {selectedMerchant.businessName}
              </h3>
              <button onClick={() => setSelectedMerchant(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleMerchantPayout}>
              <div className="modal-body">
                <div style={{ padding: '14px', background: 'var(--bg-offwhite)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>إجمالي المستحقات الجاهزة للصرف:</span>
                    <strong style={{ color: 'var(--accent-green)', fontSize: '1.1rem' }}>
                      {selectedMerchant.payableAmount.toLocaleString('ar-EG')} ج.م
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="merchantPayoutAmountInput" className="form-label">المبلغ المراد صرفه (ج.م):</label>
                  <input
                    id="merchantPayoutAmountInput"
                    type="number"
                    step="0.5"
                    required
                    max={selectedMerchant.payableAmount}
                    className="form-input"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="merchantTransferChannelSelect" className="form-label">طريقة وقناة التحويل:</label>
                    <select
                      id="merchantTransferChannelSelect"
                      className="form-select"
                      value={transferChannel}
                      onChange={(e) => setTransferChannel(e.target.value)}
                    >
                      <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                      <option value="BANK_TRANSFER">تحويل بنكي مباشر</option>
                      <option value="VODAFONE_CASH">محفظة إلكترونية (فودافون كاش)</option>
                      <option value="CASH">نقداً من الخزينة</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="merchantExternalRefInput" className="form-label">رقم المرجع الخارجي (رقم المعاملة):</label>
                    <input
                      id="merchantExternalRefInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="رقم إشعار التحويل البنكي"
                      value={externalRef}
                      onChange={(e) => setExternalRef(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="merchantPayoutNotesInput" className="form-label">ملاحظات التحويل:</label>
                  <input
                    id="merchantPayoutNotesInput"
                    type="text"
                    className="form-input"
                    placeholder="اسم البنك أو رقم الحساب المحول إليه"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedMerchant(null)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  إثبات صرف المستحقات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detailed Statement View (Couriers & Merchants) */}
      {statementModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                {statementModal.title}
              </h3>
              <button
                onClick={() => setStatementModal((prev) => ({ ...prev, open: false }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body printable-statement">
              {/* Official ZONO Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FF6600', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src="/assets/zono_logo.jpeg"
                    alt="ZONO Delivery Logo"
                    style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #FF6600' }}
                  />
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FF6600', margin: 0 }}>
                      ZONO Delivery Services
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
                      زونو لخدمات التوصيل والشحن السريع | من متجرك .. لباب عميلك
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{statementModal.title}</div>
                </div>
              </div>

              {statementModal.loading ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>جاري تحميل كشف الحساب من الدفتر العام...</div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '14px', background: 'var(--bg-offwhite)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الاسم:</div>
                      <div style={{ fontWeight: 800 }}>{statementModal.name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي العمليات المسجلة:</div>
                      <div style={{ fontWeight: 800 }}>{statementModal.lines.length} حركة</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>نوع الحساب المالي:</div>
                      <div style={{ fontWeight: 800 }}>
                        {statementModal.type === 'courier' ? 'حساب 1020 عهدة مندوب' : 'حساب 2010 مستحقات تاجر'}
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>رقم القيد</th>
                          <th>التاريخ</th>
                          <th>البيان المحاسبي</th>
                          <th>مدين (Debit)</th>
                          <th>دائن (Credit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementModal.lines.map((ln, idx) => (
                          <tr key={`${statementModal.type}-${ln.id || idx}`}>
                            <td style={{ fontWeight: 700, color: 'var(--primary-orange)' }}>{ln.entry_number}</td>
                            <td>{new Date(ln.entry_date).toLocaleDateString('ar-EG')}</td>
                            <td>{ln.description || ln.line_description}</td>
                            <td style={{ fontWeight: 700, color: Number.parseFloat(ln.debit) > 0 ? 'var(--primary-orange)' : 'inherit' }}>
                              {Number.parseFloat(ln.debit) > 0 ? `${Number.parseFloat(ln.debit).toLocaleString('ar-EG')} ج.م` : '-'}
                            </td>
                            <td style={{ fontWeight: 700, color: Number.parseFloat(ln.credit) > 0 ? 'var(--accent-green)' : 'inherit' }}>
                              {Number.parseFloat(ln.credit) > 0 ? `${Number.parseFloat(ln.credit).toLocaleString('ar-EG')} ج.م` : '-'}
                            </td>
                          </tr>
                        ))}
                        {statementModal.lines.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                              لا توجد قيود أو حركات مسجلة لهذا الحساب
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
              >
                <Printer size={16} />
                <span>طباعة كشف الحساب</span>
              </button>
              <button
                type="button"
                onClick={() => setStatementModal((prev) => ({ ...prev, open: false }))}
                className="btn btn-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
