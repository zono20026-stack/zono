import React, { useState, useEffect } from 'react';
import {
  HREmployee,
  HRDepartment,
  HRAttendance,
  HRSalaryAdjustment,
  HRPayrollItem,
  HRPayrollRun,
  HROverviewStats,
  User,
} from '../types';
import { apiFetch } from '../api';
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  Coins,
  TrendingUp,
  Plus,
  RefreshCw,
  Printer,
  X,
  CheckCircle2,
  DollarSign,
  Award,
  UserMinus,
  Receipt,
  Search,
  Filter,
} from './icons';
import { useLanguage } from '../context/LanguageContext';

interface HRViewProps {
  user: User | null;
}

type HRSubSection = 'employees' | 'attendance' | 'adjustments' | 'payroll' | 'payslips' | 'reports';

export const HRView: React.FC<HRViewProps> = ({ user: _user }) => {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState<HRSubSection>('employees');
  const [stats, setStats] = useState<HROverviewStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Employees State
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [departments, setDepartments] = useState<HRDepartment[]>([]);
  const [searchEmp, setSearchEmp] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);

  // Form State: Add Employee
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empNationalId, setEmpNationalId] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empDeptId, setEmpDeptId] = useState<number | ''>('');
  const [empJobTitle, setEmpJobTitle] = useState('');
  const [empHireDate, setEmpHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [empBasicSalary, setEmpBasicSalary] = useState('4500');
  const [empHousingAllowance, setEmpHousingAllowance] = useState('0');
  const [empTransportAllowance, setEmpTransportAllowance] = useState('500');
  const [empOtherAllowances, setEmpOtherAllowances] = useState('0');
  const [empShiftHours, setEmpShiftHours] = useState('8');
  const [empNotes, setEmpNotes] = useState('');

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<HRAttendance[]>([]);
  const [isLogAttendanceModalOpen, setIsLogAttendanceModalOpen] = useState(false);
  const [selectedEmpForAtt, setSelectedEmpForAtt] = useState<number | ''>('');
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'>('PRESENT');
  const [attCheckIn, setAttCheckIn] = useState('09:00');
  const [attCheckOut, setAttCheckOut] = useState('17:00');
  const [attLateMinutes, setAttLateMinutes] = useState('0');
  const [attOvertimeHours, setAttOvertimeHours] = useState('0');

  // Adjustments State
  const [adjustments, setAdjustments] = useState<HRSalaryAdjustment[]>([]);
  const [adjTypeFilter, setAdjTypeFilter] = useState('');
  const [isAddAdjModalOpen, setIsAddAdjModalOpen] = useState(false);
  const [adjEmpId, setAdjEmpId] = useState<number | ''>('');
  const [adjType, setAdjType] = useState<'ADVANCE' | 'BONUS' | 'DEDUCTION'>('ADVANCE');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Payroll Calculation State
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollPreviewItems, setPayrollPreviewItems] = useState<HRPayrollItem[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [pastPayrollRuns, setPastPayrollRuns] = useState<HRPayrollRun[]>([]);
  const [calculatingPayroll, setCalculatingPayroll] = useState(false);

  // Printable Payslip Modal
  const [printPayslipItem, setPrintPayslipItem] = useState<HRPayrollItem | null>(null);

  // Load Overview & Initial Data
  const loadOverview = async () => {
    try {
      const res = await apiFetch('/hr/overview');
      if (res.success) setStats(res.data);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await apiFetch('/hr/departments');
      if (res.success) setDepartments(res.data);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      let url = '/hr/employees?activeOnly=false';
      if (searchEmp) url += `&search=${encodeURIComponent(searchEmp)}`;
      if (deptFilter) url += `&departmentId=${deptFilter}`;
      const res = await apiFetch(url);
      if (res.success) setEmployees(res.data);
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'فشل تحميل بيانات الموظفين' });
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/hr/attendance?date=${attendanceDate}`);
      if (res.success) setAttendanceRecords(res.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      let url = '/hr/adjustments?';
      if (adjTypeFilter) url += `type=${adjTypeFilter}`;
      const res = await apiFetch(url);
      if (res.success) setAdjustments(res.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollPreview = async () => {
    setCalculatingPayroll(true);
    try {
      const res = await apiFetch(`/hr/payroll/calculate?month=${payrollMonth}`);
      if (res.success) {
        setPayrollPreviewItems(res.data.items);
        setPayrollSummary(res.data.summary);
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'فشل احتساب مسير الرواتب' });
    } finally {
      setCalculatingPayroll(false);
    }
  };

  const loadPastPayrollRuns = async () => {
    try {
      const res = await apiFetch('/hr/payroll/runs');
      if (res.success) setPastPayrollRuns(res.data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOverview();
    loadDepartments();
  }, []);

  useEffect(() => {
    if (activeSection === 'employees') loadEmployees();
    if (activeSection === 'attendance') loadAttendance();
    if (activeSection === 'adjustments') loadAdjustments();
    if (activeSection === 'payroll' || activeSection === 'payslips') {
      loadPayrollPreview();
      loadPastPayrollRuns();
    }
  }, [activeSection, deptFilter, attendanceDate, adjTypeFilter, payrollMonth]);

  // Handler: Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/hr/employees', {
        method: 'POST',
        body: JSON.stringify({
          name: empName,
          phone: empPhone,
          nationalId: empNationalId,
          email: empEmail,
          departmentId: empDeptId || undefined,
          jobTitle: empJobTitle,
          hireDate: empHireDate,
          basicSalary: empBasicSalary,
          housingAllowance: empHousingAllowance,
          transportAllowance: empTransportAllowance,
          otherAllowances: empOtherAllowances,
          shiftHours: empShiftHours,
          notes: empNotes,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsAddEmpModalOpen(false);
        // Reset
        setEmpName('');
        setEmpPhone('');
        setEmpNationalId('');
        setEmpJobTitle('');
        loadEmployees();
        loadOverview();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'فشل إضافة الموظف' });
    }
  };

  // Handler: Log Attendance
  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAtt) return;

    try {
      const res = await apiFetch('/hr/attendance', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedEmpForAtt,
          attendanceDate,
          status: attStatus,
          checkInTime: attCheckIn,
          checkOutTime: attCheckOut,
          lateMinutes: attLateMinutes,
          overtimeHours: attOvertimeHours,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsLogAttendanceModalOpen(false);
        loadAttendance();
        loadOverview();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'فشل تسجيل الحضور' });
    }
  };

  // Handler: Add Adjustment
  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmpId || !adjAmount || !adjReason) return;

    try {
      const res = await apiFetch('/hr/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: adjEmpId,
          type: adjType,
          amount: adjAmount,
          reason: adjReason,
          cycleMonth: payrollMonth,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsAddAdjModalOpen(false);
        setAdjAmount('');
        setAdjReason('');
        loadAdjustments();
        loadOverview();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'فشل قيد التسوية' });
    }
  };

  // Handler: Save & Approve Payroll Run
  const handleSavePayrollRun = async () => {
    if (!confirm(`هل أنت متأكد من حفظ واعتماد مسير رواتب شهر (${payrollMonth})؟`)) return;

    try {
      const saveRes = await apiFetch('/hr/payroll/save', {
        method: 'POST',
        body: JSON.stringify({ cycleMonth: payrollMonth }),
      });

      if (saveRes.success && saveRes.data?.runId) {
        const appRes = await apiFetch(`/hr/payroll/runs/${saveRes.data.runId}/approve`, {
          method: 'POST',
        });
        setFeedback({ type: 'success', message: appRes.message || 'تم اعتماد مسير الرواتب بنجاح!' });
        loadPastPayrollRuns();
        loadOverview();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'فشل اعتماد مسير الرواتب' });
    }
  };

  // Sub-sections Circular Hub definitions
  const hrSections = [
    {
      id: 'employees' as HRSubSection,
      title: language === 'ar' ? 'تكويد الموظفين' : 'Staff Directory',
      subtitle: language === 'ar' ? 'العقود والرواتب' : 'Profiles & Wages',
      icon: <Users size={22} />,
      colorClass: 'subhub-purple',
    },
    {
      id: 'attendance' as HRSubSection,
      title: language === 'ar' ? 'الحضور والانصراف' : 'Attendance',
      subtitle: language === 'ar' ? 'الورديات والتأخيرات' : 'Shifts & Delays',
      icon: <Clock size={22} />,
      colorClass: 'subhub-blue',
    },
    {
      id: 'adjustments' as HRSubSection,
      title: language === 'ar' ? 'السلف والمكافآت' : 'Adjustments',
      subtitle: language === 'ar' ? 'الخصومات والحوافز' : 'Advances & Penalties',
      icon: <Coins size={22} />,
      colorClass: 'subhub-amber',
    },
    {
      id: 'payroll' as HRSubSection,
      title: language === 'ar' ? 'مسير الرواتب' : 'Payroll Run',
      subtitle: language === 'ar' ? 'احتساب المسير آلياً' : 'Monthly Calculation',
      icon: <DollarSign size={22} />,
      colorClass: 'subhub-green',
    },
    {
      id: 'payslips' as HRSubSection,
      title: language === 'ar' ? 'سراكي الرواتب' : 'Payslips',
      subtitle: language === 'ar' ? 'طباعة قسائم A4' : 'Printable Slips',
      icon: <Receipt size={22} />,
      colorClass: 'subhub-orange',
    },
    {
      id: 'reports' as HRSubSection,
      title: language === 'ar' ? 'تقارير الموارد' : 'HR Analytics',
      subtitle: language === 'ar' ? 'إجماليات وتكاليف' : 'Cost Breakdown',
      icon: <TrendingUp size={22} />,
      colorClass: 'subhub-rose',
    },
  ];

  return (
    <div className="hr-module-container">
      {/* Feedback message banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            backgroundColor: feedback.type === 'success' ? 'var(--accent-green-light)' : 'var(--danger-red-light)',
            color: feedback.type === 'success' ? 'var(--accent-green)' : 'var(--danger-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
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

      {/* Header Banner */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, #111827 0%, #1E293B 100%)', color: '#fff', border: '1px solid var(--border-orange)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255, 102, 0, 0.2)', border: '2px solid var(--primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-orange)' }}>
              <Briefcase size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff' }}>
                {language === 'ar' ? 'الموارد البشرية وشؤون الموظفين' : 'HR & Staff Operations'}
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                {language === 'ar' ? 'منظومة ZONO المتكاملة لتكويد الموظفين، الحضور والانصراف، السلف، ومسير الرواتب الشهري' : 'ZONO Staff management, biometric shifts, advances, and payroll automation'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                loadOverview();
                if (activeSection === 'employees') loadEmployees();
                if (activeSection === 'attendance') loadAttendance();
                if (activeSection === 'adjustments') loadAdjustments();
                if (activeSection === 'payroll') loadPayrollPreview();
              }}
              className="btn btn-secondary btn-sm"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
            >
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
              <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => setIsAddEmpModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة موظف جديد' : 'New Employee'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{language === 'ar' ? 'إجمالي الموظفين النشطين' : 'Active Staff'}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
              {stats?.activeEmployees ?? 0} {language === 'ar' ? 'موظف' : 'employees'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{language === 'ar' ? 'حضور اليوم' : 'Present Today'}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-green)' }}>
              {stats?.presentToday ?? 0} {language === 'ar' ? 'حاضر' : 'present'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{language === 'ar' ? 'سلف قائمة غير مسواة' : 'Open Advances'}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--warning-amber)' }}>
              {stats?.openAdvances ? Number(stats.openAdvances).toLocaleString() : '0'} {language === 'ar' ? 'ج.م' : 'EGP'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{language === 'ar' ? 'إجمالي كتلة الرواتب التقديرية' : 'Est. Monthly Payroll'}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38BDF8' }}>
              {stats?.totalMonthlyPayroll ? Number(stats.totalMonthlyPayroll).toLocaleString() : '0'} {language === 'ar' ? 'ج.م' : 'EGP'}
            </div>
          </div>
        </div>
      </div>

      {/* USER REQUIREMENT: Separate circular sub-tabs hub inside HR module ("دواير منفصلة اختار منها تفاصيل الموديول") */}
      <div className="zono-hr-subhub-selector">
        <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          {language === 'ar' ? 'اختر قسم الموارد البشرية المطلوب:' : 'Select HR Sub-Module:'}
        </div>
        <div className="zono-subhubs-grid">
          {hrSections.map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`zono-subhub-card ${sec.colorClass} ${isSelected ? 'active-subhub' : ''}`}
              >
                <div className="subhub-circle-icon">
                  {sec.icon}
                </div>
                <div className="subhub-text-wrap">
                  <div className="subhub-title">{sec.title}</div>
                  <div className="subhub-subtitle">{sec.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================================== */}
      {/* SECTION 1: EMPLOYEES DIRECTORY */}
      {/* ============================================================================== */}
      {activeSection === 'employees' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Users size={20} />
              <span>{language === 'ar' ? 'دليل وسجلات الموظفين' : 'Employees Master Directory'}</span>
            </div>
            <button onClick={() => setIsAddEmpModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة موظف' : 'Add Employee'}</span>
            </button>
          </div>

          {/* Search & Department Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingRight: '38px' }}
                placeholder={language === 'ar' ? 'بحث بالاسم، كود الموظف، أو الهاتف...' : 'Search employee...'}
                value={searchEmp}
                onChange={(e) => setSearchEmp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
              />
            </div>

            <div style={{ minWidth: '180px' }}>
              <select
                className="form-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="">{language === 'ar' ? 'جميع الأقسام' : 'All Departments'}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'كود الموظف' : 'Code'}</th>
                  <th>{language === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th>{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th>{language === 'ar' ? 'القسم' : 'Department'}</th>
                  <th>{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</th>
                  <th>{language === 'ar' ? 'المرتب الأساسي' : 'Basic Salary'}</th>
                  <th>{language === 'ar' ? 'إجمالي البدلات' : 'Allowances'}</th>
                  <th>{language === 'ar' ? 'تاريخ التعيين' : 'Hire Date'}</th>
                  <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {language === 'ar' ? 'لا يوجد موظفون مسجلون حالياً. انقر على "إضافة موظف جديد" للبدء.' : 'No employees found.'}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const totalAllow =
                      Number(emp.housing_allowance || 0) +
                      Number(emp.transport_allowance || 0) +
                      Number(emp.other_allowances || 0);

                    return (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>
                          {emp.employee_code}
                        </td>
                        <td style={{ fontWeight: 700 }}>{emp.name}</td>
                        <td style={{ direction: 'ltr', textAlign: language === 'ar' ? 'right' : 'left' }}>{emp.phone}</td>
                        <td>
                          <span className="badge badge-blue">{emp.department_name || 'عام'}</span>
                        </td>
                        <td>{emp.job_title}</td>
                        <td style={{ fontWeight: 700 }}>
                          {Number(emp.basic_salary).toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                        </td>
                        <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                          {totalAllow.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{emp.hire_date}</td>
                        <td>
                          <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-red'}`}>
                            {emp.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطل' : 'Inactive')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SECTION 2: ATTENDANCE & SHIFTS */}
      {/* ============================================================================== */}
      {activeSection === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={20} />
              <span>{language === 'ar' ? 'سجل الحضور والانصراف اليومي' : 'Daily Attendance Log'}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
              <button
                onClick={() => setIsLogAttendanceModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'تسجيل حضور' : 'Log Attendance'}</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'كود الموظف' : 'Code'}</th>
                  <th>{language === 'ar' ? 'اسم الموظف' : 'Employee'}</th>
                  <th>{language === 'ar' ? 'القسم' : 'Department'}</th>
                  <th>{language === 'ar' ? 'وقت الحضور' : 'Check In'}</th>
                  <th>{language === 'ar' ? 'وقت الانصراف' : 'Check Out'}</th>
                  <th>{language === 'ar' ? 'تأخير (دقائق)' : 'Late (Mins)'}</th>
                  <th>{language === 'ar' ? 'إضافي (ساعات)' : 'Overtime (Hrs)'}</th>
                  <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {language === 'ar' ? `لم يتم تسجيل حضور بتاريخ ${attendanceDate}. انقر على "تسجيل حضور" لقيد اليوم.` : 'No records for this date.'}
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((att) => (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{att.employee_code}</td>
                      <td style={{ fontWeight: 700 }}>{att.employee_name}</td>
                      <td>{att.department_name || 'عام'}</td>
                      <td>{att.check_in_time || '—'}</td>
                      <td>{att.check_out_time || '—'}</td>
                      <td style={{ color: att.late_minutes > 0 ? 'var(--danger-red)' : 'inherit', fontWeight: att.late_minutes > 0 ? 700 : 400 }}>
                        {att.late_minutes} {language === 'ar' ? 'دقيقة' : 'm'}
                      </td>
                      <td style={{ color: Number(att.overtime_hours) > 0 ? 'var(--accent-green)' : 'inherit', fontWeight: Number(att.overtime_hours) > 0 ? 700 : 400 }}>
                        {att.overtime_hours} {language === 'ar' ? 'ساعة' : 'h'}
                      </td>
                      <td>
                        <span className={`badge ${att.status === 'PRESENT' ? 'badge-green' : att.status === 'ABSENT' ? 'badge-red' : 'badge-amber'}`}>
                          {att.status === 'PRESENT' ? 'حاضر' : att.status === 'ABSENT' ? 'غائب' : att.status === 'LATE' ? 'متأخر' : att.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SECTION 3: SALARY ADJUSTMENTS (Advances, Bonuses, Deductions) */}
      {/* ============================================================================== */}
      {activeSection === 'adjustments' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Coins size={20} />
              <span>{language === 'ar' ? 'السلف، المكافآت، والخصومات والجزاءات' : 'Salary Adjustments & Deductions'}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={adjTypeFilter}
                onChange={(e) => setAdjTypeFilter(e.target.value)}
              >
                <option value="">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
                <option value="ADVANCE">{language === 'ar' ? 'سلف موظفين' : 'Advances'}</option>
                <option value="BONUS">{language === 'ar' ? 'مكافآت وحوافز' : 'Bonuses'}</option>
                <option value="DEDUCTION">{language === 'ar' ? 'خصومات وجزاءات' : 'Deductions'}</option>
              </select>
              <button onClick={() => setIsAddAdjModalOpen(true)} className="btn btn-primary btn-sm">
                <Plus size={16} />
                <span>{language === 'ar' ? 'قيد تسوية جديدة' : 'New Adjustment'}</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'كود الموظف' : 'Code'}</th>
                  <th>{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                  <th>{language === 'ar' ? 'النوع' : 'Type'}</th>
                  <th>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th>{language === 'ar' ? 'السبب والبيان' : 'Reason'}</th>
                  <th>{language === 'ar' ? 'تاريخ السريان' : 'Date'}</th>
                  <th>{language === 'ar' ? 'الشهر المالي' : 'Cycle'}</th>
                  <th>{language === 'ar' ? 'حالة التسوية' : 'Settlement'}</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {language === 'ar' ? 'لا توجد تسويات مالية مسجلة.' : 'No adjustments found.'}
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{adj.employee_code}</td>
                      <td style={{ fontWeight: 700 }}>{adj.employee_name}</td>
                      <td>
                        <span className={`badge ${adj.type === 'BONUS' ? 'badge-green' : adj.type === 'ADVANCE' ? 'badge-amber' : 'badge-red'}`}>
                          {adj.type === 'ADVANCE' ? 'سلفة' : adj.type === 'BONUS' ? 'مكافأة' : 'خصم/جزاء'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: adj.type === 'BONUS' ? 'var(--accent-green)' : 'var(--text-main)' }}>
                        {Number(adj.amount).toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                      </td>
                      <td>{adj.reason}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{adj.effective_date}</td>
                      <td><span className="badge badge-gray">{adj.cycle_month}</span></td>
                      <td>
                        <span className={`badge ${adj.is_settled ? 'badge-green' : 'badge-amber'}`}>
                          {adj.is_settled ? (language === 'ar' ? 'تمت التسوية' : 'Settled') : (language === 'ar' ? 'معلقة' : 'Pending')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SECTION 4 & 5: PAYROLL RUN & PAYSLIPS */}
      {/* ============================================================================== */}
      {(activeSection === 'payroll' || activeSection === 'payslips') && (
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <DollarSign size={20} />
                <span>
                  {activeSection === 'payroll'
                    ? (language === 'ar' ? 'مسير الرواتب الشهري الآلي' : 'Monthly Payroll Engine')
                    : (language === 'ar' ? 'سراكي وقسائم الرواتب للطباعة' : 'Employee Payslips (Sarki)')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>{language === 'ar' ? 'الشهر المالي:' : 'Cycle:'}</label>
                <input
                  type="month"
                  className="form-input"
                  style={{ width: 'auto', padding: '6px 12px' }}
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                />
                <button
                  onClick={loadPayrollPreview}
                  className="btn btn-secondary btn-sm"
                  disabled={calculatingPayroll}
                >
                  <RefreshCw size={14} className={calculatingPayroll ? 'spin-icon' : ''} />
                  <span>{language === 'ar' ? 'إعادة احتساب' : 'Recalculate'}</span>
                </button>
                {activeSection === 'payroll' && (
                  <button
                    onClick={handleSavePayrollRun}
                    className="btn btn-success btn-sm"
                  >
                    <CheckCircle2 size={16} />
                    <span>{language === 'ar' ? 'اعتماد وإغلاق المسير' : 'Approve & Lock'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Summary Highlights */}
            {payrollSummary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'إجمالي الأساسي' : 'Basic Total'}</div>
                  <div style={{ fontWeight: 800 }}>{payrollSummary.totalBasic?.toLocaleString()} ج.م</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'إجمالي البدلات' : 'Allowances'}</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-green)' }}>+{payrollSummary.totalAllowances?.toLocaleString()} ج.م</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'الإضافي والمكافآت' : 'Overtime & Bonuses'}</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-green)' }}>+{(payrollSummary.totalOvertime + payrollSummary.totalBonuses)?.toLocaleString()} ج.م</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'الخصومات والسلف' : 'Deductions & Advances'}</div>
                  <div style={{ fontWeight: 800, color: 'var(--danger-red)' }}>-{(payrollSummary.totalDeductions + payrollSummary.totalAdvances)?.toLocaleString()} ج.م</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'صافي المسير المستحق' : 'Net Total Payable'}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
                    {payrollSummary.totalNetPayable?.toLocaleString()} ج.م
                  </div>
                </div>
              </div>
            )}

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{language === 'ar' ? 'كود' : 'Code'}</th>
                    <th>{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                    <th>{language === 'ar' ? 'القسم' : 'Dept'}</th>
                    <th>{language === 'ar' ? 'المرتب الأساسي' : 'Basic'}</th>
                    <th>{language === 'ar' ? 'البدلات' : 'Allowances'}</th>
                    <th>{language === 'ar' ? 'الإضافي' : 'Overtime'}</th>
                    <th>{language === 'ar' ? 'المكافآت' : 'Bonuses'}</th>
                    <th>{language === 'ar' ? 'الخصومات' : 'Deductions'}</th>
                    <th>{language === 'ar' ? 'السلف' : 'Advances'}</th>
                    <th>{language === 'ar' ? 'صافي الراتب المستحق' : 'Net Salary'}</th>
                    <th>{language === 'ar' ? 'سركي الطباعة' : 'Payslip'}</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollPreviewItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        {language === 'ar' ? 'لا توجد بيانات موظفين لاحتساب المسير. يرجى تكويد موظفين أولاً.' : 'No data to calculate.'}
                      </td>
                    </tr>
                  ) : (
                    payrollPreviewItems.map((item) => (
                      <tr key={item.employeeId}>
                        <td style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{item.employeeCode}</td>
                        <td style={{ fontWeight: 700 }}>{item.employeeName}</td>
                        <td>{item.departmentName}</td>
                        <td>{item.basicSalary.toLocaleString()}</td>
                        <td style={{ color: 'var(--accent-green)' }}>+{item.allowances.toLocaleString()}</td>
                        <td style={{ color: 'var(--accent-green)' }}>+{item.overtimeAmount.toLocaleString()}</td>
                        <td style={{ color: 'var(--accent-green)' }}>+{item.bonusesAmount.toLocaleString()}</td>
                        <td style={{ color: 'var(--danger-red)' }}>-{item.deductionsAmount.toLocaleString()}</td>
                        <td style={{ color: 'var(--warning-amber)' }}>-{item.advancesAmount.toLocaleString()}</td>
                        <td style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
                          {item.netSalary.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setPrintPayslipItem(item)}
                            className="btn btn-secondary btn-sm"
                            title={language === 'ar' ? 'عرض وطباعة سركي الراتب الفردي' : 'Print Payslip'}
                          >
                            <Printer size={14} />
                            <span>{language === 'ar' ? 'سركي' : 'Slip'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SECTION 6: HR REPORTS & ARCHIVES */}
      {/* ============================================================================== */}
      {activeSection === 'reports' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={20} />
              <span>{language === 'ar' ? 'تقارير وأرشيف الموارد البشرية ومسيرات الرواتب السابقة' : 'HR Archives & Past Payroll Runs'}</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'كود المسير' : 'Run Code'}</th>
                  <th>{language === 'ar' ? 'اسم الدورة المالية' : 'Cycle Name'}</th>
                  <th>{language === 'ar' ? 'الفترة' : 'Period'}</th>
                  <th>{language === 'ar' ? 'عدد الموظفين' : 'Staff Count'}</th>
                  <th>{language === 'ar' ? 'إجمالي الصافي المنصرف' : 'Total Net Paid'}</th>
                  <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th>{language === 'ar' ? 'الاعتماد' : 'Approved By'}</th>
                </tr>
              </thead>
              <tbody>
                {pastPayrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {language === 'ar' ? 'لا توجد مسيرات رواتب معتمدة سابقة حتى الآن.' : 'No past payroll runs.'}
                    </td>
                  </tr>
                ) : (
                  pastPayrollRuns.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{run.cycle_code}</td>
                      <td style={{ fontWeight: 700 }}>{run.cycle_name}</td>
                      <td style={{ fontSize: '0.82rem' }}>{run.start_date} إلى {run.end_date}</td>
                      <td>{run.employee_count} {language === 'ar' ? 'موظف' : 'staff'}</td>
                      <td style={{ fontWeight: 900, color: 'var(--accent-green)' }}>
                        {Number(run.total_net_payable).toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                      </td>
                      <td>
                        <span className={`badge ${run.status === 'APPROVED' ? 'badge-green' : 'badge-amber'}`}>
                          {run.status === 'APPROVED' ? 'معتمد ومغلق' : 'مسودة'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{run.approved_by_name || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: ADD EMPLOYEE */}
      {/* ============================================================================== */}
      {isAddEmpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                {language === 'ar' ? 'تكويد موظف جديد في منظومة ZONO' : 'New Employee Onboarding'}
              </h3>
              <button onClick={() => setIsAddEmpModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">{language === 'ar' ? 'اسم الموظف ثلاثي / رباعي:' : 'Full Name:'}</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="مثال: أحمد محمد علي"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'رقم الهاتف (موبايل):' : 'Phone:'}</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'الرقم القومي (14 رقم):' : 'National ID:'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empNationalId}
                    onChange={(e) => setEmpNationalId(e.target.value)}
                    placeholder="298XXXXXXXXXXX"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'القسم / الإدارة:' : 'Department:'}</label>
                  <select
                    className="form-select"
                    value={empDeptId}
                    onChange={(e) => setEmpDeptId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">{language === 'ar' ? 'اختر القسم' : 'Select Dept'}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'المسمى الوظيفي:' : 'Job Title:'}</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={empJobTitle}
                    onChange={(e) => setEmpJobTitle(e.target.value)}
                    placeholder="مثال: مندوب توصيل / محاسب فرع"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'المرتب الأساسي الشهري (ج.م):' : 'Basic Salary:'}</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="form-input"
                    value={empBasicSalary}
                    onChange={(e) => setEmpBasicSalary(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'بدل الانتقال / الوقود (ج.م):' : 'Transport Allowance:'}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={empTransportAllowance}
                    onChange={(e) => setEmpTransportAllowance(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'بدل السكن / المعيشة (ج.م):' : 'Housing Allowance:'}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={empHousingAllowance}
                    onChange={(e) => setEmpHousingAllowance(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'ساعات الوردية اليومية:' : 'Shift Hours:'}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={empShiftHours}
                    onChange={(e) => setEmpShiftHours(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddEmpModalOpen(false)} className="btn btn-secondary">
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'ar' ? 'حفظ وتكويد الموظف' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: LOG ATTENDANCE */}
      {/* ============================================================================== */}
      {isLogAttendanceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                {language === 'ar' ? 'تسجيل حضور / وردية موظف' : 'Log Attendance Punch'}
              </h3>
              <button onClick={() => setIsLogAttendanceModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogAttendance}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'اختر الموظف:' : 'Employee:'}</label>
                  <select
                    required
                    className="form-select"
                    value={selectedEmpForAtt}
                    onChange={(e) => setSelectedEmpForAtt(Number(e.target.value))}
                  >
                    <option value="">{language === 'ar' ? '-- اختر الموظف --' : 'Select Employee'}</option>
                    {employees.filter((e) => e.is_active).map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'حالة الحضور:' : 'Status:'}</label>
                  <select
                    className="form-select"
                    value={attStatus}
                    onChange={(e) => setAttStatus(e.target.value as any)}
                  >
                    <option value="PRESENT">{language === 'ar' ? 'حاضر (Present)' : 'Present'}</option>
                    <option value="LATE">{language === 'ar' ? 'متأخر (Late)' : 'Late'}</option>
                    <option value="ABSENT">{language === 'ar' ? 'غائب بدون إذن (Absent)' : 'Absent'}</option>
                    <option value="EXCUSED">{language === 'ar' ? 'إجازة / عذر رسمي (Excused)' : 'Excused'}</option>
                  </select>
                </div>

                {attStatus !== 'ABSENT' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">{language === 'ar' ? 'وقت الحضور:' : 'In:'}</label>
                      <input
                        type="time"
                        className="form-input"
                        value={attCheckIn}
                        onChange={(e) => setAttCheckIn(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{language === 'ar' ? 'وقت الانصراف:' : 'Out:'}</label>
                      <input
                        type="time"
                        className="form-input"
                        value={attCheckOut}
                        onChange={(e) => setAttCheckOut(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{language === 'ar' ? 'تأخير (بالدقائق):' : 'Late (Mins):'}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={attLateMinutes}
                        onChange={(e) => setAttLateMinutes(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{language === 'ar' ? 'إضافي (ساعات):' : 'Overtime (Hrs):'}</label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-input"
                        value={attOvertimeHours}
                        onChange={(e) => setAttOvertimeHours(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsLogAttendanceModalOpen(false)} className="btn btn-secondary">
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'ar' ? 'حفظ الحضور' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: ADD SALARY ADJUSTMENT (Advance / Bonus / Deduction) */}
      {/* ============================================================================== */}
      {isAddAdjModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                {language === 'ar' ? 'قيد سلفة / مكافأة / خصم لموظف' : 'New Salary Adjustment'}
              </h3>
              <button onClick={() => setIsAddAdjModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAdjustment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'اختر الموظف:' : 'Employee:'}</label>
                  <select
                    required
                    className="form-select"
                    value={adjEmpId}
                    onChange={(e) => setAdjEmpId(Number(e.target.value))}
                  >
                    <option value="">{language === 'ar' ? '-- اختر الموظف --' : 'Select Employee'}</option>
                    {employees.filter((e) => e.is_active).map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'نوع التسوية المالية:' : 'Type:'}</label>
                  <select
                    className="form-select"
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                  >
                    <option value="ADVANCE">{language === 'ar' ? 'سلفة على الراتب (Advance)' : 'Salary Advance'}</option>
                    <option value="BONUS">{language === 'ar' ? 'مكافأة / حافز إنجاز (Bonus)' : 'Performance Bonus'}</option>
                    <option value="DEDUCTION">{language === 'ar' ? 'خصم / جزاء مالي (Deduction)' : 'Penalty/Deduction'}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'المبلغ (ج.م):' : 'Amount (EGP):'}</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="form-input"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="مثال: 500"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'ar' ? 'السبب والبيان التوضيحي:' : 'Reason / Note:'}</label>
                  <textarea
                    required
                    rows={2}
                    className="form-textarea"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب سبب السلفة أو المكافأة...' : 'Reason for adjustment...'}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddAdjModalOpen(false)} className="btn btn-secondary">
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'ar' ? 'قيد وحفظ التسوية' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: PRINTABLE PAYSLIP (A4 SARKI) */}
      {/* ============================================================================== */}
      {printPayslipItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }} className="no-print">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                {language === 'ar' ? 'سركي مفردات المرتب الرسمي' : 'Official Employee Payslip'}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                >
                  <Printer size={16} />
                  <span>{language === 'ar' ? 'طباعة A4' : 'Print'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPayslipItem(null)}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* The Printable Payslip Card */}
            <div className="printable-statement" style={{ border: '2px solid var(--border-orange)', borderRadius: 'var(--radius-lg)', padding: '24px', background: '#fff', color: '#0F172A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary-orange)', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src="/assets/zono_logo.jpeg" alt="ZONO" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--primary-orange)' }} />
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary-orange)', margin: 0 }}>
                      ZONO Delivery Services
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                      أنظمة الشحن والخدمات اللوجستية | إدارة الموارد البشرية
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span className="badge badge-blue" style={{ fontSize: '0.85rem' }}>
                    دورة شهر: {payrollMonth}
                  </span>
                </div>
              </div>

              {/* Employee Bio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem' }}>
                <div><strong>كود الموظف:</strong> {printPayslipItem.employeeCode}</div>
                <div><strong>الاسم:</strong> {printPayslipItem.employeeName}</div>
                <div><strong>القسم:</strong> {printPayslipItem.departmentName}</div>
                <div><strong>المسمى الوظيفي:</strong> {printPayslipItem.jobTitle}</div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ border: '1px solid #CBD5E1', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <h4 style={{ color: 'var(--accent-green)', fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '8px' }}>
                    الاستحقاقات والإضافات (+)
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                    <span>المرتب الأساسي:</span>
                    <strong>{printPayslipItem.basicSalary.toLocaleString()} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                    <span>إجمالي البدلات:</span>
                    <strong>{printPayslipItem.allowances.toLocaleString()} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                    <span>الإضافي ({printPayslipItem.overtimeHours} س):</span>
                    <strong>{printPayslipItem.overtimeAmount.toLocaleString()} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span>المكافآت والحوافز:</span>
                    <strong>{printPayslipItem.bonusesAmount.toLocaleString()} ج.م</strong>
                  </div>
                </div>

                <div style={{ border: '1px solid #CBD5E1', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <h4 style={{ color: 'var(--danger-red)', fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '8px' }}>
                    الاستقطاعات والخصومات (-)
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                    <span>الخصومات والغياب ({printPayslipItem.absentDays} يوم):</span>
                    <strong>{printPayslipItem.deductionsAmount.toLocaleString()} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span>السلف المستردة:</span>
                    <strong>{printPayslipItem.advancesAmount.toLocaleString()} ج.م</strong>
                  </div>
                </div>
              </div>

              {/* Net Payable Highlight */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-orange-light)', border: '2px dashed var(--primary-orange)', padding: '14px 20px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-orange-dark)' }}>
                  صافي الراتب المستحق للصرف:
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
                  {printPayslipItem.netSalary.toLocaleString()} جنيه مصري
                </span>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', fontSize: '0.85rem', marginTop: '30px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: '24px' }}>توقيع الموظف بالاستلام</p>
                  <p style={{ color: '#94A3B8' }}>................................</p>
                </div>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: '24px' }}>المحاسب المالي</p>
                  <p style={{ color: '#94A3B8' }}>................................</p>
                </div>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: '24px' }}>اعتماد الإدارة العامة</p>
                  <p style={{ color: '#94A3B8' }}>................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
