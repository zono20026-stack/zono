import React, { useState, useEffect, useRef } from 'react';
import {
  HREmployee,
  HRDepartment,
  HRAttendance,
  HRSalaryAdjustment,
  HRPayrollItem,
  HRPayrollRun,
  HROverviewStats,
  HRBiometricPunch,
  HRLeave,
  HRAuditComparisonRow,
  User,
} from '../types';
import { apiFetch } from '../api';
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
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
  Fingerprint,
  Camera,
  MapPin,
  FileSpreadsheet,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from './icons';
import { useLanguage } from '../context/LanguageContext';

interface HRViewProps {
  user: User | null;
}

type HRSubSection =
  | 'portal'
  | 'employees'
  | 'punches'
  | 'attendance'
  | 'audit'
  | 'leaves'
  | 'adjustments'
  | 'payroll'
  | 'payslips'
  | 'reports'
  | 'roles';

export const HRView: React.FC<HRViewProps> = ({ user }) => {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState<HRSubSection>('portal');
  const [stats, setStats] = useState<HROverviewStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ----------------------------------------------------
  // 1. Employees State & Modal
  // ----------------------------------------------------
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [departments, setDepartments] = useState<HRDepartment[]>([]);
  const [searchEmp, setSearchEmp] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<HREmployee | null>(null);

  // Form State: Employee
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
  const [empBiometricMethod, setEmpBiometricMethod] = useState<'TIME_ENTRY' | 'GPS_LOCATION' | 'FACE_RECOGNITION' | 'GPS_AND_FACE'>('TIME_ENTRY');
  const [empLocationLat, setEmpLocationLat] = useState('');
  const [empLocationLng, setEmpLocationLng] = useState('');
  const [empRadiusMeters, setEmpRadiusMeters] = useState('150');
  const [empNotes, setEmpNotes] = useState('');

  // ----------------------------------------------------
  // 2. Punches (Biometric / GPS / Face) State
  // ----------------------------------------------------
  const [punches, setPunches] = useState<HRBiometricPunch[]>([]);
  const [punchDateFilter, setPunchDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [punchMethodFilter, setPunchMethodFilter] = useState('');
  const [isLogPunchModalOpen, setIsLogPunchModalOpen] = useState(false);
  const [isImportPunchesModalOpen, setIsImportPunchesModalOpen] = useState(false);

  // Form State: Log Punch
  const [punchEmpId, setPunchEmpId] = useState<number | ''>('');
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [punchMethod, setPunchMethod] = useState<'TIME_ENTRY' | 'GPS_LOCATION' | 'FACE_RECOGNITION' | 'DEVICE_IMPORT'>('TIME_ENTRY');
  const [punchNotes, setPunchNotes] = useState('');
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [capturedFaceData, setCapturedFaceData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Import Punches State
  const [importPunchesText, setImportPunchesText] = useState('');

  // ----------------------------------------------------
  // 3. Attendance Comparison & Audit State
  // ----------------------------------------------------
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [auditRows, setAuditRows] = useState<HRAuditComparisonRow[]>([]);

  // ----------------------------------------------------
  // 4. Daily Attendance State
  // ----------------------------------------------------
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<HRAttendance[]>([]);
  const [isLogAttendanceModalOpen, setIsLogAttendanceModalOpen] = useState(false);
  const [selectedEmpForAtt, setSelectedEmpForAtt] = useState<number | ''>('');
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'>('PRESENT');
  const [attCheckIn, setAttCheckIn] = useState('09:00');
  const [attCheckOut, setAttCheckOut] = useState('17:00');
  const [attLateMinutes, setAttLateMinutes] = useState('0');
  const [attOvertimeHours, setAttOvertimeHours] = useState('0');

  // ----------------------------------------------------
  // 5. Leaves & Permissions State
  // ----------------------------------------------------
  const [leaves, setLeaves] = useState<HRLeave[]>([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('');
  const [isAddLeaveModalOpen, setIsAddLeaveModalOpen] = useState(false);
  const [leaveEmpId, setLeaveEmpId] = useState<number | ''>('');
  const [leaveType, setLeaveType] = useState<'ANNUAL' | 'CASUAL' | 'SICK' | 'UNPAID' | 'PERMISSION_HOURS'>('ANNUAL');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveHours, setLeaveHours] = useState('0');
  const [leaveReason, setLeaveReason] = useState('');

  // ----------------------------------------------------
  // 6. Adjustments (Advances / Bonuses / Deductions) State
  // ----------------------------------------------------
  const [adjustments, setAdjustments] = useState<HRSalaryAdjustment[]>([]);
  const [adjTypeFilter, setAdjTypeFilter] = useState('');
  const [isAddAdjModalOpen, setIsAddAdjModalOpen] = useState(false);
  const [adjEmpId, setAdjEmpId] = useState<number | ''>('');
  const [adjType, setAdjType] = useState<'ADVANCE' | 'BONUS' | 'DEDUCTION'>('ADVANCE');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // ----------------------------------------------------
  // 7. Payroll State
  // ----------------------------------------------------
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollPreviewItems, setPayrollPreviewItems] = useState<HRPayrollItem[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [pastPayrollRuns, setPastPayrollRuns] = useState<HRPayrollRun[]>([]);
  const [calculatingPayroll, setCalculatingPayroll] = useState(false);
  const [printPayslipItem, setPrintPayslipItem] = useState<HRPayrollItem | null>(null);

  // ----------------------------------------------------
  // 8. Comprehensive Reports State
  // ----------------------------------------------------
  const [reportSubTab, setReportSubTab] = useState<'employee360' | 'totals'>('employee360');
  const [selectedReportEmpId, setSelectedReportEmpId] = useState<number | ''>('');
  const [empReportData, setEmpReportData] = useState<any>(null);
  const [totalsReportData, setTotalsReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // ----------------------------------------------------
  // 9. HR Users & Roles / Screen Permissions State
  // ----------------------------------------------------
  const [hrUsers, setHrUsers] = useState<any[]>([]);
  const [hrPermissions, setHrPermissions] = useState<any[]>([]);

  // ----------------------------------------------------
  // Data Loaders
  // ----------------------------------------------------
  const loadOverview = async () => {
    try {
      const res = await apiFetch('/hr/overview');
      if (res.success) setStats(res.data);
    } catch (err: any) {
      console.error('Failed to load HR overview:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await apiFetch('/hr/departments');
      if (res.success) setDepartments(res.data);
    } catch (err: any) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      let url = '/hr/employees?';
      if (searchEmp) url += `search=${encodeURIComponent(searchEmp)}&`;
      if (deptFilter) url += `departmentId=${deptFilter}&`;
      const res = await apiFetch(url);
      if (res.success) setEmployees(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تحميل الموظفين' });
    } finally {
      setLoading(false);
    }
  };

  const loadPunches = async () => {
    try {
      setLoading(true);
      let url = `/hr/punches?date=${punchDateFilter}&`;
      if (punchMethodFilter) url += `method=${punchMethodFilter}&`;
      const res = await apiFetch(url);
      if (res.success) setPunches(res.data);
    } catch (err: any) {
      console.error('Failed to load punches:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditComparison = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/hr/punches/audit-comparison?date=${auditDate}`);
      if (res.success) setAuditRows(res.data);
    } catch (err: any) {
      console.error('Failed to load audit:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/hr/attendance?date=${attendanceDate}`);
      if (res.success) setAttendanceRecords(res.data);
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaves = async () => {
    try {
      setLoading(true);
      let url = '/hr/leaves?';
      if (leaveStatusFilter) url += `status=${leaveStatusFilter}&`;
      const res = await apiFetch(url);
      if (res.success) setLeaves(res.data);
    } catch (err: any) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async () => {
    try {
      setLoading(true);
      let url = '/hr/adjustments?';
      if (adjTypeFilter) url += `type=${adjTypeFilter}&`;
      const res = await apiFetch(url);
      if (res.success) setAdjustments(res.data);
    } catch (err: any) {
      console.error('Failed to load adjustments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollPreview = async () => {
    try {
      setCalculatingPayroll(true);
      const res = await apiFetch(`/hr/payroll/calculate?month=${payrollMonth}`);
      if (res.success) {
        setPayrollPreviewItems(res.data.items);
        setPayrollSummary(res.data.summary);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل احتساب الرواتب' });
    } finally {
      setCalculatingPayroll(false);
    }
  };

  const loadPastPayrollRuns = async () => {
    try {
      const res = await apiFetch('/hr/payroll/runs');
      if (res.success) setPastPayrollRuns(res.data);
    } catch (err: any) {
      console.error('Failed to load runs:', err);
    }
  };

  const loadEmployee360Report = async (empId: number) => {
    try {
      setLoadingReport(true);
      const res = await apiFetch(`/hr/reports/employee/${empId}`);
      if (res.success) setEmpReportData(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تحميل تقرير الموظف' });
    } finally {
      setLoadingReport(false);
    }
  };

  const loadTotalsReport = async () => {
    try {
      setLoadingReport(true);
      const res = await apiFetch('/hr/reports/totals');
      if (res.success) setTotalsReportData(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تحميل تقرير الإجماليات' });
    } finally {
      setLoadingReport(false);
    }
  };

  const loadHRUsersAndPermissions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/hr/permissions');
      if (res.success) {
        setHrUsers(res.data.users);
        setHrPermissions(res.data.permissions);
      }
    } catch (err: any) {
      console.error('Failed to load HR permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadOverview();
    loadDepartments();
    loadEmployees();
  }, []);

  // Section switcher side effects
  useEffect(() => {
    if (activeSection === 'employees') loadEmployees();
    if (activeSection === 'punches') loadPunches();
    if (activeSection === 'audit') loadAuditComparison();
    if (activeSection === 'attendance') loadAttendance();
    if (activeSection === 'leaves') loadLeaves();
    if (activeSection === 'adjustments') loadAdjustments();
    if (activeSection === 'payroll') {
      loadPayrollPreview();
      loadPastPayrollRuns();
    }
    if (activeSection === 'payslips') {
      if (payrollPreviewItems.length === 0) loadPayrollPreview();
    }
    if (activeSection === 'reports') {
      if (reportSubTab === 'totals') loadTotalsReport();
      else if (selectedReportEmpId) loadEmployee360Report(Number(selectedReportEmpId));
    }
    if (activeSection === 'roles') loadHRUsersAndPermissions();
  }, [activeSection]);

  // ----------------------------------------------------
  // Camera & Geolocation Helpers
  // ----------------------------------------------------
  const getCurrentGeolocation = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'خاصية الموقع الجغرافي (GPS) غير مدعومة في متصفحك' });
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEmpLocationLat(pos.coords.latitude.toFixed(6));
        setEmpLocationLng(pos.coords.longitude.toFixed(6));
        setGeoLocating(false);
        setFeedback({ type: 'success', message: 'تم التقاط إحداثيات موقعك الجغرافي بالـ GPS بنجاح!' });
      },
      (err) => {
        setGeoLocating(false);
        setFeedback({ type: 'error', message: `تعذر تحديد الموقع: ${err.message}` });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraActive(false);
      setFeedback({ type: 'error', message: `تعذر تشغيل الكاميرا: ${err.message}` });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedFaceData(dataUrl);
      stopCamera();
      setFeedback({ type: 'success', message: 'تم التقاط صورة الوجه بنجاح!' });
    }
  };

  // ----------------------------------------------------
  // Action Handlers
  // ----------------------------------------------------
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: empName,
        phone: empPhone,
        nationalId: empNationalId,
        email: empEmail,
        departmentId: empDeptId || null,
        jobTitle: empJobTitle,
        hireDate: empHireDate,
        basicSalary: empBasicSalary,
        housingAllowance: empHousingAllowance,
        transportAllowance: empTransportAllowance,
        otherAllowances: empOtherAllowances,
        shiftHours: empShiftHours,
        biometricMethod: empBiometricMethod,
        allowedLocationLat: empLocationLat || null,
        allowedLocationLng: empLocationLng || null,
        allowedRadiusMeters: empRadiusMeters || 150,
        faceTemplateData: capturedFaceData || null,
        notes: empNotes,
      };

      if (editingEmp) {
        await apiFetch(`/hr/employees/${editingEmp.id}`, { method: 'PUT', body: payload });
        setFeedback({ type: 'success', message: `تم تحديث بيانات الموظف ${empName} بنجاح!` });
      } else {
        await apiFetch('/hr/employees', { method: 'POST', body: payload });
        setFeedback({ type: 'success', message: `تم تكويد الموظف الجديد ${empName} بنجاح مع ربطه بطريقة البصمة!` });
      }

      setIsAddEmpModalOpen(false);
      setEditingEmp(null);
      resetEmpForm();
      loadEmployees();
      loadOverview();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل حفظ بيانات الموظف' });
    }
  };

  const resetEmpForm = () => {
    setEmpName('');
    setEmpPhone('');
    setEmpNationalId('');
    setEmpEmail('');
    setEmpDeptId('');
    setEmpJobTitle('');
    setEmpHireDate(new Date().toISOString().split('T')[0]);
    setEmpBasicSalary('4500');
    setEmpHousingAllowance('0');
    setEmpTransportAllowance('500');
    setEmpOtherAllowances('0');
    setEmpShiftHours('8');
    setEmpBiometricMethod('TIME_ENTRY');
    setEmpLocationLat('');
    setEmpLocationLng('');
    setEmpRadiusMeters('150');
    setEmpNotes('');
    setCapturedFaceData(null);
  };

  const openEditEmpModal = (emp: HREmployee) => {
    setEditingEmp(emp);
    setEmpName(emp.name);
    setEmpPhone(emp.phone);
    setEmpNationalId(emp.national_id || '');
    setEmpEmail(emp.email || '');
    setEmpDeptId(emp.department_id || '');
    setEmpJobTitle(emp.job_title);
    setEmpHireDate(emp.hire_date ? emp.hire_date.split('T')[0] : '');
    setEmpBasicSalary(String(emp.basic_salary));
    setEmpHousingAllowance(String(emp.housing_allowance));
    setEmpTransportAllowance(String(emp.transport_allowance));
    setEmpOtherAllowances(String(emp.other_allowances));
    setEmpShiftHours(String(emp.shift_hours));
    setEmpBiometricMethod(emp.biometric_method || 'TIME_ENTRY');
    setEmpLocationLat(emp.allowed_location_lat ? String(emp.allowed_location_lat) : '');
    setEmpLocationLng(emp.allowed_location_lng ? String(emp.allowed_location_lng) : '');
    setEmpRadiusMeters(emp.allowed_radius_meters ? String(emp.allowed_radius_meters) : '150');
    setEmpNotes(emp.notes || '');
    setCapturedFaceData(emp.face_template_data || null);
    setIsAddEmpModalOpen(true);
  };

  const handleLogPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchEmpId) return;
    try {
      const payload: any = {
        employeeId: punchEmpId,
        punchType,
        punchMethod,
        notes: punchNotes,
      };

      if (punchMethod === 'GPS_LOCATION' || punchMethod === 'GPS_AND_FACE' as any) {
        if (liveLocation) {
          payload.locationLat = liveLocation.lat;
          payload.locationLng = liveLocation.lng;
        }
      }

      if (punchMethod === 'FACE_RECOGNITION' || punchMethod === 'GPS_AND_FACE' as any) {
        if (capturedFaceData) {
          payload.faceImageUrl = capturedFaceData;
        }
      }

      const res = await apiFetch('/hr/punches', { method: 'POST', body: payload });
      setFeedback({ type: 'success', message: res.message || 'تم تسجيل البصمة بنجاح!' });
      setIsLogPunchModalOpen(false);
      setPunchEmpId('');
      setPunchNotes('');
      setCapturedFaceData(null);
      stopCamera();
      loadPunches();
      loadOverview();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تسجيل حركة البصمة' });
    }
  };

  const handleImportPunches = async () => {
    try {
      if (!importPunchesText.trim()) return;
      const lines = importPunchesText.trim().split('\n');
      const punchList: any[] = [];

      for (const line of lines) {
        // Support: Code, Time, Type
        const parts = line.split(/[\t,;]/).map((p) => p.trim());
        if (parts.length >= 2) {
          punchList.push({
            employeeCode: parts[0],
            punchTime: parts[1] || new Date().toISOString(),
            punchType: parts[2]?.toUpperCase() === 'OUT' ? 'OUT' : 'IN',
          });
        }
      }

      if (punchList.length === 0) {
        setFeedback({ type: 'error', message: 'لم يتم العثور على أسطر صالحة للاستيراد' });
        return;
      }

      const res = await apiFetch('/hr/punches/import', { method: 'POST', body: { punches: punchList } });
      setFeedback({ type: 'success', message: res.message || `تم استيراد ${res.data?.importedCount} حركة بنجاح!` });
      setIsImportPunchesModalOpen(false);
      setImportPunchesText('');
      loadPunches();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل استيراد البصمات' });
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmpId) return;
    try {
      await apiFetch('/hr/leaves', {
        method: 'POST',
        body: {
          employeeId: leaveEmpId,
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          hours: leaveHours,
          reason: leaveReason,
        },
      });
      setFeedback({ type: 'success', message: 'تم إرسال طلب الإجازة بنجاح وهو قيد الاعتماد الإداري' });
      setIsAddLeaveModalOpen(false);
      setLeaveEmpId('');
      setLeaveReason('');
      loadLeaves();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تقديم طلب الإجازة' });
    }
  };

  const handleUpdateLeaveStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiFetch(`/hr/leaves/${id}/status`, {
        method: 'PUT',
        body: { status, decisionNotes: status === 'APPROVED' ? 'تمت الموافقة من إدارة الموارد البشرية' : 'تم الرفض' },
      });
      setFeedback({ type: 'success', message: `تم ${status === 'APPROVED' ? 'اعتماد' : 'رفض'} طلب الإجازة بنجاح!` });
      loadLeaves();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تحديث حالة الإجازة' });
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmpId || !adjAmount) return;
    try {
      await apiFetch('/hr/adjustments', {
        method: 'POST',
        body: {
          employeeId: adjEmpId,
          type: adjType,
          amount: adjAmount,
          cycleMonth: new Date().toISOString().slice(0, 7),
          reason: adjReason,
        },
      });
      setFeedback({ type: 'success', message: 'تم تسجيل الحركة المالية (سلفة/مكافأة/خصم) بنجاح!' });
      setIsAddAdjModalOpen(false);
      setAdjEmpId('');
      setAdjAmount('');
      setAdjReason('');
      loadAdjustments();
      loadOverview();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تسجيل الحركة المالية' });
    }
  };

  const handleApprovePayroll = async (runId: number) => {
    try {
      const res = await apiFetch(`/hr/payroll/runs/${runId}/approve`, { method: 'POST' });
      setFeedback({ type: 'success', message: res.message || 'تم اعتماد مسير الرواتب وإغلاق المستحقات بنجاح!' });
      loadPastPayrollRuns();
      loadOverview();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل اعتماد مسير الرواتب' });
    }
  };

  const handleTogglePermission = async (userId: number, screenKey: string, field: 'can_view' | 'can_edit', currentVal: boolean) => {
    try {
      const existing = hrPermissions.find((p) => p.user_id === userId && p.screen_key === screenKey);
      const canView = field === 'can_view' ? !currentVal : existing ? existing.can_view : true;
      const canEdit = field === 'can_edit' ? !currentVal : existing ? existing.can_edit : true;

      await apiFetch('/hr/permissions', {
        method: 'POST',
        body: { userId, screenKey, canView, canEdit },
      });

      // Optimistic update
      setHrPermissions((prev) => {
        const filtered = prev.filter((p) => !(p.user_id === userId && p.screen_key === screenKey));
        return [...filtered, { user_id: userId, screen_key: screenKey, can_view: canView, can_edit: canEdit }];
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تحديث الصلاحية' });
    }
  };

  // ----------------------------------------------------
  // Sub-Navigation Hubs
  // ----------------------------------------------------
  const subHubs = [
    {
      id: 'employees' as HRSubSection,
      title: language === 'ar' ? 'دليل وتكويد الموظفين' : 'Employees',
      subtitle: language === 'ar' ? 'تكويد وطرق البصمة GPS/وجه' : 'Staff Master & Biometrics',
      icon: <Users size={28} />,
      colorClass: 'hub-orange',
      badge: language === 'ar' ? 'تكويد' : 'Master',
    },
    {
      id: 'punches' as HRSubSection,
      title: language === 'ar' ? 'سجل البصمات' : 'Live Punches',
      subtitle: language === 'ar' ? 'GPS وكاميرا الوجه والأجهزة' : 'Biometric GPS/Face Log',
      icon: <Fingerprint size={28} />,
      colorClass: 'hub-blue',
      badge: language === 'ar' ? 'بصمة حية' : 'Live',
    },
    {
      id: 'attendance' as HRSubSection,
      title: language === 'ar' ? 'الحضور والغياب' : 'Attendance',
      subtitle: language === 'ar' ? 'سجل الورديات وساعات العمل' : 'Daily Shift Register',
      icon: <Calendar size={28} />,
      colorClass: 'hub-green',
      badge: language === 'ar' ? 'يومي' : 'Daily',
    },
    {
      id: 'audit' as HRSubSection,
      title: language === 'ar' ? 'مطابقة البصمة' : 'Punch Audit',
      subtitle: language === 'ar' ? 'تدقيق التأخير ومواعيد الوردية' : 'Audit Comparison',
      icon: <Clock size={28} />,
      colorClass: 'hub-purple',
      badge: language === 'ar' ? 'تدقيق' : 'Audit',
    },
    {
      id: 'leaves' as HRSubSection,
      title: language === 'ar' ? 'الإجازات والأذون' : 'Leaves',
      subtitle: language === 'ar' ? 'الاعتماد الإداري والأرصدة' : 'Leave Workflow',
      icon: <Award size={28} />,
      colorClass: 'hub-pink',
      badge: language === 'ar' ? 'طلبات' : 'Requests',
    },
    {
      id: 'adjustments' as HRSubSection,
      title: language === 'ar' ? 'السلف والخصومات' : 'Advances',
      subtitle: language === 'ar' ? 'العهد والخصومات والمكافآت' : 'Advances & Loans',
      icon: <DollarSign size={28} />,
      colorClass: 'hub-amber',
      badge: language === 'ar' ? 'مالي' : 'Finance',
    },
    {
      id: 'payroll' as HRSubSection,
      title: language === 'ar' ? 'مسير الرواتب' : 'Payroll Run',
      subtitle: language === 'ar' ? 'الاحتساب الشهري والاعتماد' : 'Monthly Payroll Run',
      icon: <TrendingUp size={28} />,
      colorClass: 'hub-cyan',
      badge: language === 'ar' ? 'شهري' : 'Monthly',
    },
    {
      id: 'payslips' as HRSubSection,
      title: language === 'ar' ? 'سراكي القبض' : 'A4 Payslips',
      subtitle: language === 'ar' ? 'طباعة قسائم الرواتب A4' : 'Printable Payslips',
      icon: <Receipt size={28} />,
      colorClass: 'hub-rose',
      badge: language === 'ar' ? 'A4 طباعة' : 'Print',
    },
    {
      id: 'reports' as HRSubSection,
      title: language === 'ar' ? 'تقارير شاملة' : '360 Reports',
      subtitle: language === 'ar' ? 'كشف 360 وتحليلات الموظفين' : 'Comprehensive Analytics',
      icon: <FileSpreadsheet size={28} />,
      colorClass: 'hub-teal',
      badge: language === 'ar' ? 'تحليلات' : 'Analytics',
    },
    {
      id: 'roles' as HRSubSection,
      title: language === 'ar' ? 'صلاحيات HR' : 'Permissions',
      subtitle: language === 'ar' ? 'الاطلاع والتعديل لكل قسم' : 'Screen Permissions',
      icon: <ShieldCheck size={28} />,
      colorClass: 'hub-indigo',
      badge: language === 'ar' ? 'أمان' : 'Security',
    },
  ];

  const currentSubHub = subHubs.find((s) => s.id === activeSection);

  return (
    <div className="hr-module-container" style={{ width: '100%' }}>
      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '18px',
            backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: feedback.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
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

      {/* ===================================================================== */}
      {/* 1. PORTAL LANDING VIEW: PURE CIRCULAR TABS (When activeSection === 'portal') */}
      {/* ===================================================================== */}
      {activeSection === 'portal' ? (
        <>
          {/* Header Banner - Clean Light Modern Aesthetic */}
          <div
            className="card"
            style={{
              padding: '24px',
              marginBottom: '22px',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(255, 102, 0, 0.1)',
                    border: '2px solid var(--primary-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-orange)',
                    boxShadow: '0 4px 12px rgba(255, 102, 0, 0.2)',
                  }}
                >
                  <Briefcase size={30} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                    {language === 'ar' ? 'منظومة الموارد البشرية وشؤون الموظفين | ZONO HR' : 'ZONO Staff & HR Operations'}
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                    {language === 'ar'
                      ? 'بوابة تشغيل متكاملة | انقر على أي دائرة للدخول إلى شاشتها المتخصصة'
                      : 'Integrated staff coding, biometric punches, geofence GPS, leaves, advances, and payroll'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    loadOverview();
                    loadEmployees();
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
                  <span>{language === 'ar' ? 'تحديث المؤشرات' : 'Refresh'}</span>
                </button>
                <button
                  onClick={() => {
                    resetEmpForm();
                    setEditingEmp(null);
                    setIsAddEmpModalOpen(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>{language === 'ar' ? 'تكويد موظف جديد' : 'New Employee'}</span>
                </button>
                <button
                  onClick={() => setIsLogPunchModalOpen(true)}
                  className="btn btn-sm"
                  style={{
                    background: '#3B82F6',
                    color: '#fff',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <Fingerprint size={16} />
                  <span>{language === 'ar' ? 'تسجيل بصمة فورية' : 'Log Punch'}</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>إجمالي الموظفين النشطين</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
                  {stats?.activeEmployees ?? 0} موظف
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>حضور اليوم المعتمد</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981' }}>
                  {stats?.presentToday ?? 0} حاضر
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>غياب وتأخيرات اليوم</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EF4444' }}>
                  {(stats?.absentToday ?? 0) + (stats?.lateToday ?? 0)} حالة
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>إجمالي السلف المفتوحة</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F59E0B' }}>
                  {(stats?.openAdvances ?? 0).toLocaleString()} ج.م
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>إجمالي الرواتب المقدر شهرياً</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3B82F6' }}>
                  {(stats?.totalMonthlyPayroll ?? 0).toLocaleString()} ج.م
                </div>
              </div>
            </div>
          </div>

          {/* Pure Circular Springboard Portal Card */}
          <div
            className="zono-circular-launcher-container white-theme-launcher"
            style={{
              background: '#FFFFFF',
              padding: '28px 24px',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              marginBottom: '24px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 102, 0, 0.1)', color: 'var(--primary-orange)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px' }}>
                <Briefcase size={16} />
                <span>{language === 'ar' ? 'أقسام موديول الموارد البشرية' : 'HR Operation Sections'}</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F172A', margin: '4px 0 0 0' }}>
                {language === 'ar' ? 'اختر القسم المطلوب بالنقر على دائرته للدخول إلى شاشته المتخصصة' : 'Tap any circle below to launch its dedicated screen'}
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '6px 0 0 0', fontWeight: 600 }}>
                {language === 'ar'
                  ? 'كل دائرة تمثل قسماً إدارياً مستقلاً بكامل البيانات، التقارير والعمليات'
                  : 'Each circle leads to a dedicated workspace with full operations and reports'}
              </p>
            </div>

            {/* The 10 Pure Circular Buttons Grid */}
            <div className="zono-pure-circles-grid" style={{ gap: '26px 30px', padding: '12px 8px' }}>
              {subHubs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSection(sub.id)}
                  className={`zono-circle-tab-btn ${sub.colorClass}`}
                  title={`${sub.title} - ${sub.subtitle}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="zono-tab-circle">
                    <div className="tab-circle-icon">{sub.icon}</div>
                    <span className="tab-circle-title">{sub.title}</span>
                    {sub.badge && <span className="circle-bubble-badge">{sub.badge}</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Bottom Status Info */}
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '24px',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '0.85rem',
                color: '#64748B',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: '#10B981',
                    display: 'inline-block',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  }}
                />
                <span>{language === 'ar' ? 'موديول شؤون الموظفين والبصمات متصل ومتزامن لحظياً مع قاعدة البيانات' : 'HR & Biometrics Module: Online & Live Synced'}</span>
              </div>
              <div>
                {language === 'ar' ? '10 شاشات وأقسام إدارية متكاملة' : '10 Specialized HR Screens'}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ===================================================================== */
        /* 2. DEDICATED SUB-VIEW HEADER (When activeSection !== 'portal')         */
        /* ===================================================================== */
        <div className="portal-subview-nav-header">
          <div className="subview-title-wrap">
            <div className={`subview-title-icon-badge ${currentSubHub?.colorClass || 'hub-orange'}`}>
              {currentSubHub?.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="subview-title-text">{currentSubHub?.title}</h2>
                <span className="badge badge-orange" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                  {currentSubHub?.badge}
                </span>
              </div>
              <p className="subview-title-sub">
                {language === 'ar'
                  ? `منظومة ZONO ◄ الموارد البشرية ◄ ${currentSubHub?.title} (${currentSubHub?.subtitle})`
                  : `ZONO ERP ◄ Human Resources ◄ ${currentSubHub?.title}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveSection('portal')}
              className="subview-back-btn"
              title={language === 'ar' ? 'العودة لدوائر الموارد البشرية' : 'Back to HR Circles'}
            >
              <ArrowRight size={18} />
              <span>{language === 'ar' ? 'العودة لدواير الموارد البشرية' : 'Back to HR Circles'}</span>
            </button>

            <button
              onClick={() => {
                if (activeSection === 'employees') loadEmployees();
                if (activeSection === 'punches') loadPunches();
                if (activeSection === 'audit') loadAuditComparison();
                if (activeSection === 'attendance') loadAttendance();
                if (activeSection === 'leaves') loadLeaves();
                if (activeSection === 'adjustments') loadAdjustments();
                if (activeSection === 'payroll') loadPayrollPreview();
                if (activeSection === 'reports') {
                  loadTotalsReport();
                  if (selectedReportEmpId) loadEmployee360Report(selectedReportEmpId);
                }
                if (activeSection === 'roles') loadHRUsersAndPermissions();
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
              <span>{language === 'ar' ? 'تحديث البيانات' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 1: EMPLOYEES DIRECTORY */}
      {/* ===================================================================== */}
      {activeSection === 'employees' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={22} color="var(--primary-orange)" />
              <span>دليل الموظفين وطرق البصمة المعتمدة</span>
              <span className="badge badge-orange" style={{ fontSize: '0.8rem' }}>{employees.length} موظف</span>
            </h3>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '10px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الكود أو الهاتف..."
                  value={searchEmp}
                  onChange={(e) => setSearchEmp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
                  className="input-field"
                  style={{ paddingRight: '36px', width: '230px' }}
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  loadEmployees();
                }}
                className="input-field"
                style={{ width: '160px' }}
              >
                <option value="">جميع الأقسام</option>
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
                  <th>كود الموظف</th>
                  <th>الاسم والبيانات</th>
                  <th>القسم والوظيفة</th>
                  <th>طريقة البصمة المعتمدة</th>
                  <th>موقع الحضور GPS</th>
                  <th>الراتب الأساسي</th>
                  <th>البدلات</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      {loading ? 'جاري تحميل الموظفين...' : 'لا يوجد موظفين مسجلين حالياً'}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>
                        {emp.employee_code}
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>📱 {emp.phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{emp.job_title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{emp.department_name || 'بدون قسم'}</div>
                      </td>
                      <td>
                        {emp.biometric_method === 'GPS_LOCATION' && (
                          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} />
                            <span>موقع جغرافي GPS</span>
                          </span>
                        )}
                        {emp.biometric_method === 'FACE_RECOGNITION' && (
                          <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Camera size={12} />
                            <span>صورة الوجه</span>
                          </span>
                        )}
                        {emp.biometric_method === 'GPS_AND_FACE' && (
                          <span className="badge badge-orange" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>🌐 GPS + وجه</span>
                          </span>
                        )}
                        {(!emp.biometric_method || emp.biometric_method === 'TIME_ENTRY') && (
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            <span>وقت / شيت جهاز</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {emp.allowed_location_lat ? (
                          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                            📍 {emp.allowed_location_lat.toFixed(4)}, {emp.allowed_location_lng?.toFixed(4)}
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>نطاق: {emp.allowed_radius_meters || 150}م</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>غير محدد</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {Number(emp.basic_salary).toLocaleString()} ج.م
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {(Number(emp.housing_allowance) + Number(emp.transport_allowance) + Number(emp.other_allowances)).toLocaleString()} ج.م
                      </td>
                      <td>
                        <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-red'}`}>
                          {emp.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditEmpModal(emp)}
                            className="btn btn-secondary btn-sm"
                            title="تعديل بيانات وطريقة البصمة"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReportEmpId(emp.id);
                              setActiveSection('reports');
                              setReportSubTab('employee360');
                            }}
                            className="btn btn-sm"
                            style={{ background: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1' }}
                            title="عرض كشف حساب 360"
                          >
                            كشف 360
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: LIVE BIOMETRIC PUNCHES */}
      {/* ===================================================================== */}
      {activeSection === 'punches' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Fingerprint size={22} color="#3B82F6" />
              <span>سجل حركات البصمة الحية (Punches Log)</span>
              <span className="badge badge-blue" style={{ fontSize: '0.8rem' }}>{punches.length} حركة اليوم</span>
            </h3>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={punchDateFilter}
                onChange={(e) => {
                  setPunchDateFilter(e.target.value);
                  loadPunches();
                }}
                className="input-field"
                style={{ width: '150px' }}
              />

              <select
                value={punchMethodFilter}
                onChange={(e) => {
                  setPunchMethodFilter(e.target.value);
                  loadPunches();
                }}
                className="input-field"
                style={{ width: '160px' }}
              >
                <option value="">جميع طرق البصمة</option>
                <option value="GPS_LOCATION">موقع جغرافي GPS</option>
                <option value="FACE_RECOGNITION">صورة الوجه</option>
                <option value="DEVICE_IMPORT">شيت جهاز البصمة</option>
                <option value="TIME_ENTRY">تسجيل وقت يدوي</option>
              </select>

              <button
                onClick={() => setIsImportPunchesModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <FileSpreadsheet size={16} />
                <span>استيراد شيت البصمة</span>
              </button>

              <button
                onClick={() => setIsLogPunchModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Plus size={16} />
                <span>تسجيل بصمة الآن</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>وقت وتاريخ البصمة</th>
                  <th>نوع الحركة</th>
                  <th>طريقة البصمة</th>
                  <th>الموقع الجغرافي / التحقق</th>
                  <th>صورة الوجه</th>
                  <th>حالة التدقيق</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {punches.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      لا توجد حركات بصمة مسجلة في هذا التاريخ
                    </td>
                  </tr>
                ) : (
                  punches.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{p.employee_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{p.employee_code} - {p.department_name}</div>
                      </td>
                      <td style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right' }}>
                        {new Date(p.punch_time).toLocaleString('ar-EG')}
                      </td>
                      <td>
                        <span className={`badge ${p.punch_type === 'IN' ? 'badge-green' : 'badge-orange'}`} style={{ fontWeight: 800 }}>
                          {p.punch_type === 'IN' ? '🟢 بصمة دخول' : '🔴 بصمة خروج'}
                        </span>
                      </td>
                      <td>
                        {p.punch_method === 'GPS_LOCATION' && <span className="badge badge-blue">📍 موقع GPS</span>}
                        {p.punch_method === 'FACE_RECOGNITION' && <span className="badge badge-purple">📸 صورة وجه</span>}
                        {p.punch_method === 'DEVICE_IMPORT' && <span className="badge badge-green">🖲️ شيت جهاز</span>}
                        {p.punch_method === 'TIME_ENTRY' && <span className="badge badge-amber">⏱️ وقت يدوي</span>}
                      </td>
                      <td>
                        {p.location_lat ? (
                          <div style={{ fontSize: '0.78rem' }}>
                            <div>📍 {p.location_lat.toFixed(4)}, {p.location_lng?.toFixed(4)}</div>
                            {p.distance_meters != null && (
                              <div style={{ color: p.distance_meters <= 150 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                                البعد: {p.distance_meters} متر
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>-</span>
                        )}
                      </td>
                      <td>
                        {p.face_image_url ? (
                          <img
                            src={p.face_image_url}
                            alt="Face"
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary-orange)' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${p.verification_status === 'VERIFIED' ? 'badge-green' : 'badge-red'}`}>
                          {p.verification_status === 'VERIFIED' ? 'معتمدة ومطابقة' : 'خارج النطاق المسموح'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        {p.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 3: AUDIT & COMPARISON (PUNCHES VS SCHEDULE) */}
      {/* ===================================================================== */}
      {activeSection === 'audit' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={22} color="#8B5CF6" />
                <span>مطابقة وتدقيق البصمة الآلية (Attendance vs Biometrics Audit)</span>
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                مقارنة ذكية تلقائية بين مواعيد الورديات الرسمية وأول/آخر حركة بصمة مسجلة واحتساب التأخير والإضافي
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="date"
                value={auditDate}
                onChange={(e) => {
                  setAuditDate(e.target.value);
                  loadAuditComparison();
                }}
                className="input-field"
                style={{ width: '160px' }}
              />
              <button onClick={loadAuditComparison} className="btn btn-secondary btn-sm">
                تحديث المطابقة
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموظف والقسم</th>
                  <th>طريقة البصمة</th>
                  <th>ميعاد الحضور الرسمي</th>
                  <th>أول بصمة دخول (فعلي)</th>
                  <th>ميعاد الانصراف الرسمي</th>
                  <th>آخر بصمة خروج (فعلي)</th>
                  <th>إجمالي الحركات</th>
                  <th>التأخير المحسوب</th>
                  <th>حالة التدقيق</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      لا توجد سجلات مطابقة لهذا اليوم
                    </td>
                  </tr>
                ) : (
                  auditRows.map((row) => (
                    <tr key={row.employee_id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{row.employee_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{row.employee_code} - {row.department_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{row.biometric_method}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.scheduled_in || '09:00'}</td>
                      <td style={{ fontWeight: 800, color: row.actual_biometric_in ? '#059669' : '#DC2626' }}>
                        {row.actual_biometric_in ? `🟢 ${row.actual_biometric_in}` : '❌ لم يبصم'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.scheduled_out || '17:00'}</td>
                      <td style={{ fontWeight: 800, color: row.actual_biometric_out ? '#059669' : '#F59E0B' }}>
                        {row.actual_biometric_out ? `🔴 ${row.actual_biometric_out}` : 'لم يسجل خروج'}
                      </td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>
                        <span className="badge badge-orange">{row.total_punches_count} حركات</span>
                      </td>
                      <td>
                        {row.late_minutes && Number(row.late_minutes) > 0 ? (
                          <span className="badge badge-red">{row.late_minutes} دقيقة تأخير</span>
                        ) : (
                          <span className="badge badge-green">ملتزم بالموعد</span>
                        )}
                      </td>
                      <td>
                        {row.actual_biometric_in ? (
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} />
                            <span>مطابق ومعتمد</span>
                          </span>
                        ) : (
                          <span className="badge badge-amber">قيد المراجعة</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 4: LEAVES & PERMISSIONS */}
      {/* ===================================================================== */}
      {activeSection === 'leaves' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={22} color="#EC4899" />
              <span>إدارة الإجازات والأذونات ودورة الاعتماد (Leaves Workflow)</span>
            </h3>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={leaveStatusFilter}
                onChange={(e) => {
                  setLeaveStatusFilter(e.target.value);
                  loadLeaves();
                }}
                className="input-field"
                style={{ width: '150px' }}
              >
                <option value="">جميع الحالات</option>
                <option value="PENDING">قيد الانتظار</option>
                <option value="APPROVED">معتمدة</option>
                <option value="REJECTED">مرفوضة</option>
              </select>

              <button
                onClick={() => setIsAddLeaveModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Plus size={16} />
                <span>طلب إجازة / إذن جديد</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>نوع الإجازة / الإذن</th>
                  <th>تاريخ البداية</th>
                  <th>تاريخ النهاية</th>
                  <th>الساعات (للإذن)</th>
                  <th>السبب والمبرر</th>
                  <th>الحالة</th>
                  <th>المعتمد</th>
                  <th>الإجراء الإداري</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      لا توجد طلبات إجازة مسجلة
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{l.employee_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{l.employee_code} - {l.department_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-purple" style={{ fontWeight: 800 }}>
                          {l.leave_type === 'ANNUAL' && '🏖️ إجازة سنوية'}
                          {l.leave_type === 'CASUAL' && '⚡ إجازة عارضة'}
                          {l.leave_type === 'SICK' && '🩺 إجازة مرضية'}
                          {l.leave_type === 'PERMISSION_HOURS' && '⏱️ إذن ساعي'}
                          {l.leave_type === 'UNPAID' && 'بدون راتب'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.start_date.split('T')[0]}</td>
                      <td style={{ fontWeight: 600 }}>{l.end_date.split('T')[0]}</td>
                      <td style={{ fontWeight: 700 }}>{l.hours > 0 ? `${l.hours} ساعة` : '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{l.reason || '-'}</td>
                      <td>
                        <span className={`badge ${l.status === 'APPROVED' ? 'badge-green' : l.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}`}>
                          {l.status === 'APPROVED' ? 'معتمدة ومقبولة' : l.status === 'REJECTED' ? 'مرفوضة' : 'قيد انتظار الإدارة'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748B' }}>{l.approved_by || '-'}</td>
                      <td>
                        {l.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(l.id, 'APPROVED')}
                              className="btn btn-sm"
                              style={{ background: '#10B981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}
                            >
                              اعتماد
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(l.id, 'REJECTED')}
                              className="btn btn-sm"
                              style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}
                            >
                              رفض
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>مكتمل</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 5: DAILY ATTENDANCE (STANDARD VIEW) */}
      {/* ===================================================================== */}
      {activeSection === 'attendance' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={22} color="#10B981" />
              <span>سجل الحضور والانصراف اليومي للورديات</span>
            </h3>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => {
                  setAttendanceDate(e.target.value);
                  loadAttendance();
                }}
                className="input-field"
                style={{ width: '150px' }}
              />
              <button
                onClick={() => setIsLogAttendanceModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Plus size={16} />
                <span>تسجيل حضور يدوي</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>الحالة</th>
                  <th>وقت الدخول</th>
                  <th>وقت الخروج</th>
                  <th>دقائق التأخير</th>
                  <th>ساعات الإضافي</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      لا توجد سجلات حضور مسجلة لهذا التاريخ
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((att) => (
                    <tr key={att.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{att.employee_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{att.employee_code} - {att.department_name}</div>
                      </td>
                      <td>
                        <span className={`badge ${att.status === 'PRESENT' ? 'badge-green' : att.status === 'LATE' ? 'badge-amber' : 'badge-red'}`}>
                          {att.status === 'PRESENT' ? 'حاضر' : att.status === 'LATE' ? 'متأخر' : 'غائب'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{att.check_in_time || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{att.check_out_time || '-'}</td>
                      <td style={{ fontWeight: 700, color: att.late_minutes > 0 ? '#DC2626' : '#64748B' }}>
                        {att.late_minutes} دقيقة
                      </td>
                      <td style={{ fontWeight: 700, color: Number(att.overtime_hours) > 0 ? '#059669' : '#64748B' }}>
                        {att.overtime_hours} ساعة
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748B' }}>{att.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 6: SALARY ADJUSTMENTS (ADVANCES, BONUSES, DEDUCTIONS) */}
      {/* ===================================================================== */}
      {activeSection === 'adjustments' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={22} color="#F59E0B" />
              <span>السلف النقدية، الحوافز، والخصومات</span>
            </h3>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={adjTypeFilter}
                onChange={(e) => {
                  setAdjTypeFilter(e.target.value);
                  loadAdjustments();
                }}
                className="input-field"
                style={{ width: '150px' }}
              >
                <option value="">جميع الأنواع</option>
                <option value="ADVANCE">سلف نقدية</option>
                <option value="BONUS">مكافآت وحوافز</option>
                <option value="DEDUCTION">خصومات وجزاءات</option>
              </select>

              <button
                onClick={() => setIsAddAdjModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Plus size={16} />
                <span>إضافة سلفة / مكافأة / خصم</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>شهر الدورة</th>
                  <th>السبب</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>حالة السداد</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      لا توجد حركات مالية مسجلة
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{adj.employee_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{adj.employee_code}</div>
                      </td>
                      <td>
                        <span className={`badge ${adj.type === 'ADVANCE' ? 'badge-amber' : adj.type === 'BONUS' ? 'badge-green' : 'badge-red'}`} style={{ fontWeight: 800 }}>
                          {adj.type === 'ADVANCE' && '💰 سلفة نقدية'}
                          {adj.type === 'BONUS' && '🎁 حافز ومكافأة'}
                          {adj.type === 'DEDUCTION' && '⚠️ خصم / جزاء'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 900, fontSize: '1rem', color: adj.type === 'BONUS' ? '#059669' : '#DC2626' }}>
                        {Number(adj.amount).toLocaleString()} ج.م
                      </td>
                      <td style={{ fontWeight: 600 }}>{adj.cycle_month}</td>
                      <td>{adj.reason}</td>
                      <td>{adj.effective_date ? adj.effective_date.split('T')[0] : '-'}</td>
                      <td>
                        <span className={`badge ${adj.is_settled ? 'badge-green' : 'badge-amber'}`}>
                          {adj.is_settled ? 'تمت التسوية والخصم' : 'مفتوحة وقيد التحصيل'}
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

      {/* ===================================================================== */}
      {/* SECTION 7: MONTHLY PAYROLL RUN */}
      {/* ===================================================================== */}
      {activeSection === 'payroll' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={22} color="#06B6D4" />
                <span>مسير الرواتب الشهري المعتمد على البصمات (Payroll Calculation Engine)</span>
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                احتساب تلقائي لصافي المستحقات بناءً على أيام الحضور، البصمات، السلف، والحوافز
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => {
                  setPayrollMonth(e.target.value);
                  loadPayrollPreview();
                }}
                className="input-field"
                style={{ width: '160px' }}
              />
              <button
                onClick={loadPayrollPreview}
                className="btn btn-secondary btn-sm"
                disabled={calculatingPayroll}
              >
                {calculatingPayroll ? 'جاري الحساب...' : 'إعادة الاحتساب'}
              </button>
            </div>
          </div>

          {/* Payroll Summary Cards */}
          {payrollSummary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>إجمالي الرواتب الأساسية</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{payrollSummary.totalBasic?.toLocaleString()} ج.م</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>إجمالي البدلات</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{payrollSummary.totalAllowances?.toLocaleString()} ج.م</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>الحوافز والإضافي</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>
                  {(payrollSummary.totalBonuses + payrollSummary.totalOvertime)?.toLocaleString()} ج.م
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>استقطاعات السلف والخصومات</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>
                  {(payrollSummary.totalAdvances + payrollSummary.totalDeductions)?.toLocaleString()} ج.م
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>صافي المستحق للصرف</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
                  {payrollSummary.totalNetPayable?.toLocaleString()} ج.م
                </div>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود واسم الموظف</th>
                  <th>القسم</th>
                  <th>الأساسي والبدلات</th>
                  <th>أيام الحضور</th>
                  <th>ساعات الإضافي</th>
                  <th>الحوافز</th>
                  <th>استقطاع السلف</th>
                  <th>الخصومات</th>
                  <th>صافي الراتب المستحق</th>
                  <th>طباعة السركي</th>
                </tr>
              </thead>
              <tbody>
                {payrollPreviewItems.map((item) => (
                  <tr key={item.employeeId}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.employeeName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{item.employeeCode} - {item.jobTitle}</div>
                    </td>
                    <td>{item.departmentName}</td>
                    <td style={{ fontWeight: 700 }}>
                      {(item.basicSalary + item.allowances).toLocaleString()} ج.م
                    </td>
                    <td>
                      <span className="badge badge-green">{item.presentDays} يوم</span>
                    </td>
                    <td style={{ fontWeight: 700, color: item.overtimeAmount > 0 ? '#059669' : '#64748B' }}>
                      {item.overtimeAmount > 0 ? `+${item.overtimeAmount} ج.م` : '0'}
                    </td>
                    <td style={{ fontWeight: 700, color: item.bonusesAmount > 0 ? '#059669' : '#64748B' }}>
                      {item.bonusesAmount > 0 ? `+${item.bonusesAmount} ج.م` : '0'}
                    </td>
                    <td style={{ fontWeight: 700, color: item.advancesAmount > 0 ? '#DC2626' : '#64748B' }}>
                      {item.advancesAmount > 0 ? `-${item.advancesAmount} ج.م` : '0'}
                    </td>
                    <td style={{ fontWeight: 700, color: item.deductionsAmount > 0 ? '#DC2626' : '#64748B' }}>
                      {item.deductionsAmount > 0 ? `-${item.deductionsAmount} ج.م` : '0'}
                    </td>
                    <td style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--primary-orange)' }}>
                      {item.netSalary.toLocaleString()} ج.م
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setPrintPayslipItem(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Printer size={14} />
                        <span>سركي A4</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 8: BULK PRINTABLE A4 PAYSLIPS */}
      {/* ===================================================================== */}
      {activeSection === 'payslips' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={22} color="#F97316" />
                <span>سراكي الرواتب المطبوعة A4 (طباعة مجمعة مع خانة توقيع الصرف)</span>
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                جاهزة للطباعة الورقية والحفظ الأرشيفي بشعار ZONO الرسمي
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
            >
              <Printer size={16} />
              <span>طباعة كافة السراكي A4</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {payrollPreviewItems.map((item) => (
              <div
                key={item.employeeId}
                style={{
                  border: '2px solid #E2E8F0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  background: '#FFFFFF',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary-orange)', paddingBottom: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/assets/zono_logo.jpeg" alt="ZONO" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontWeight: 900, color: 'var(--primary-orange)', fontSize: '1.1rem' }}>ZONO Delivery</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>سركي استلام راتب شهر {payrollMonth}</div>
                    </div>
                  </div>
                  <span className="badge badge-orange">{item.employeeCode}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem' }}>
                  <span><strong>الموظف:</strong> {item.employeeName}</span>
                  <span><strong>القسم:</strong> {item.departmentName}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                  <div>الأساسي: <strong>{item.basicSalary.toLocaleString()} ج.م</strong></div>
                  <div>البدلات: <strong>{item.allowances.toLocaleString()} ج.م</strong></div>
                  <div>الحوافز والإضافي: <strong style={{ color: '#059669' }}>+{item.bonusesAmount + item.overtimeAmount} ج.م</strong></div>
                  <div>الخصومات والسلف: <strong style={{ color: '#DC2626' }}>-{item.advancesAmount + item.deductionsAmount} ج.م</strong></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF3C7', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                  <span style={{ fontWeight: 800, color: '#92400E' }}>صافي الراتب المستلم:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
                    {item.netSalary.toLocaleString()} ج.م
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px', borderTop: '1px dashed #CBD5E1', fontSize: '0.85rem' }}>
                  <div>
                    <div>توقيع الموظف بالاستلام:</div>
                    <div style={{ borderBottom: '1px solid #94A3B8', width: '130px', height: '30px' }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div>اعتماد الإدارة المالية:</div>
                    <div style={{ borderBottom: '1px solid #94A3B8', width: '130px', height: '30px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 9: COMPREHENSIVE REPORTS (EMPLOYEE 360 & TOTALS) */}
      {/* ===================================================================== */}
      {activeSection === 'reports' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={22} color="#14B8A6" />
              <span>تقارير الموارد البشرية والرواتب الشاملة</span>
            </h3>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setReportSubTab('employee360')}
                className={`btn btn-sm ${reportSubTab === 'employee360' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 800 }}
              >
                تقرير كشف حساب موظف (360 درجة)
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportSubTab('totals');
                  loadTotalsReport();
                }}
                className={`btn btn-sm ${reportSubTab === 'totals' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 800 }}
              >
                تقرير إجماليات الأقسام والتكاليف
              </button>
            </div>
          </div>

          {reportSubTab === 'employee360' ? (
            <div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px', background: '#F8FAFC', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontWeight: 700 }}>اختر الموظف لعرض كشف الحساب الشامل:</span>
                <select
                  value={selectedReportEmpId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedReportEmpId(id);
                    if (id) loadEmployee360Report(id);
                  }}
                  className="input-field"
                  style={{ width: '280px' }}
                >
                  <option value="">-- اختر موظفاً --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                  ))}
                </select>

                {empReportData && (
                  <button
                    onClick={() => window.print()}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <Printer size={16} />
                    <span>طباعة التقرير الشامل A4</span>
                  </button>
                )}
              </div>

              {loadingReport && <div style={{ padding: '30px', textAlign: 'center' }}>جاري تحميل التقرير...</div>}

              {empReportData && !loadingReport && (
                <div>
                  {/* Employee Summary Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                    <div style={{ background: '#EFF6FF', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#1E40AF' }}>طريقة البصمة المعتمدة</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E3A8A' }}>
                        {empReportData.employee?.biometric_method || 'وقت عادي'}
                      </div>
                    </div>
                    <div style={{ background: '#ECFDF5', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#065F46' }}>إجمالي أيام الحضور</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>
                        {empReportData.metrics?.total_present || 0} يوم
                      </div>
                    </div>
                    <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#991B1B' }}>إجمالي التأخيرات المسجلة</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#B91C1C' }}>
                        {empReportData.metrics?.total_late_minutes || 0} دقيقة
                      </div>
                    </div>
                    <div style={{ background: '#FFFBEB', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#92400E' }}>إجمالي الساعات الإضافية</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#B45309' }}>
                        {empReportData.metrics?.total_overtime_hours || 0} ساعة
                      </div>
                    </div>
                  </div>

                  {/* Past Payroll History */}
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '10px' }}>سجل الرواتب المصروفة تاريخياً:</h4>
                  <div className="table-responsive" style={{ marginBottom: '20px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>الشهر والدورة</th>
                          <th>الأساسي</th>
                          <th>البدلات</th>
                          <th>الحوافز</th>
                          <th>الخصومات والسلف</th>
                          <th>الصافي المصروف</th>
                          <th>حالة المسير</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empReportData.payrollHistory?.length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: 'center', padding: '16px' }}>لا توجد مسيرات رواتب مسجلة للموظف</td></tr>
                        ) : (
                          empReportData.payrollHistory.map((ph: any) => (
                            <tr key={ph.id}>
                              <td>{ph.cycle_name || ph.month}</td>
                              <td>{Number(ph.basic_salary).toLocaleString()} ج.م</td>
                              <td>{Number(ph.allowances).toLocaleString()} ج.م</td>
                              <td style={{ color: '#059669' }}>+{Number(ph.bonuses_amount || 0) + Number(ph.overtime_amount || 0)} ج.م</td>
                              <td style={{ color: '#DC2626' }}>-{Number(ph.advances_amount || 0) + Number(ph.deductions_amount || 0)} ج.م</td>
                              <td style={{ fontWeight: 900, color: 'var(--primary-orange)' }}>{Number(ph.net_salary).toLocaleString()} ج.م</td>
                              <td><span className="badge badge-green">معتمد ومصروف</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Department Totals Report */}
              <div style={{ marginBottom: '20px', padding: '16px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  إجمالي تكلفة الرواتب الشهرية للشركة: {(totalsReportData?.totalCompanyCost || 0).toLocaleString()} ج.م
                </span>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>القسم</th>
                      <th>كود القسم</th>
                      <th>عدد الموظفين</th>
                      <th>إجمالي الرواتب الأساسية</th>
                      <th>إجمالي البدلات</th>
                      <th>التكلفة الشهرية الإجمالية</th>
                      <th>نسبة القسم من ميزانية الرواتب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalsReportData?.departments?.map((dept: any) => (
                      <tr key={dept.department_id}>
                        <td style={{ fontWeight: 800 }}>{dept.department_name}</td>
                        <td><span className="badge badge-blue">{dept.department_code}</span></td>
                        <td>{dept.employee_count} موظف</td>
                        <td>{Number(dept.total_basic_salaries).toLocaleString()} ج.م</td>
                        <td>{Number(dept.total_allowances).toLocaleString()} ج.م</td>
                        <td style={{ fontWeight: 900, color: 'var(--primary-orange)' }}>
                          {Number(dept.gross_monthly_cost).toLocaleString()} ج.م
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, background: '#E2E8F0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ background: 'var(--primary-orange)', height: '100%', width: `${dept.costPercentage}%` }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{dept.costPercentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 10: HR USER ROLES & SCREEN PERMISSIONS */}
      {/* ===================================================================== */}
      {activeSection === 'roles' && (
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={22} color="#6366F1" />
                <span>صلاحيات مستخدمي شاشات الموارد البشرية (Granular Screen Permissions)</span>
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                تحكم كامل في صلاحيات الاطلاع (View) والتعديل (Edit) لكل شاشة وقسم من أقسام المنظومة
              </p>
            </div>

            <button onClick={loadHRUsersAndPermissions} className="btn btn-secondary btn-sm">
              تحديث الصلاحيات
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الدور الوظيفي</th>
                  {subHubs.map((h) => (
                    <th key={h.id} style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                      {h.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hrUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{u.full_name || u.username}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>@{u.username}</div>
                    </td>
                    <td><span className="badge badge-purple">{u.role}</span></td>
                    {subHubs.map((h) => {
                      const perm = hrPermissions.find((p) => p.user_id === u.id && p.screen_key === h.id);
                      const canView = perm ? perm.can_view : true;
                      const canEdit = perm ? perm.can_edit : true;
                      return (
                        <td key={h.id} style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={canView}
                                onChange={() => handleTogglePermission(u.id, h.id, 'can_view', canView)}
                              />
                              <span>اطلاع</span>
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={canEdit}
                                onChange={() => handleTogglePermission(u.id, h.id, 'can_edit', canEdit)}
                              />
                              <span>تعديل</span>
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE (WITH BIOMETRIC METHOD) */}
      {/* ===================================================================== */}
      {isAddEmpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={22} color="var(--primary-orange)" />
                <span>{editingEmp ? 'تعديل بيانات الموظف وطريقة البصمة' : 'تكويد موظف جديد وضبط البصمة البيومترية'}</span>
              </h3>
              <button onClick={() => setIsAddEmpModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ marginTop: '16px' }}>
              {/* Basic Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">الاسم بالكامل *</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="input-field"
                    placeholder="مثال: أحمد محمود إبراهيم"
                  />
                </div>
                <div>
                  <label className="form-label">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="input-field"
                    placeholder="010xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="form-label">الرقم القومي (14 رقم)</label>
                  <input
                    type="text"
                    value={empNationalId}
                    onChange={(e) => setEmpNationalId(e.target.value)}
                    className="input-field"
                    placeholder="29xxxx..."
                  />
                </div>
                <div>
                  <label className="form-label">القسم التابع له</label>
                  <select
                    value={empDeptId}
                    onChange={(e) => setEmpDeptId(e.target.value ? Number(e.target.value) : '')}
                    className="input-field"
                  >
                    <option value="">بدون قسم محدد</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={empJobTitle}
                    onChange={(e) => setEmpJobTitle(e.target.value)}
                    className="input-field"
                    placeholder="مثال: مندوب توصيل / محاسب فرع"
                  />
                </div>
                <div>
                  <label className="form-label">تاريخ التعيين</label>
                  <input
                    type="date"
                    value={empHireDate}
                    onChange={(e) => setEmpHireDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Salary & Shift Fields */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: 'var(--radius-lg)', marginBottom: '18px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>بيانات الراتب وساعات الوردية:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="form-label">الراتب الأساسي</label>
                    <input
                      type="number"
                      value={empBasicSalary}
                      onChange={(e) => setEmpBasicSalary(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="form-label">بدل السكن</label>
                    <input
                      type="number"
                      value={empHousingAllowance}
                      onChange={(e) => setEmpHousingAllowance(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="form-label">بدل الانتقالات</label>
                    <input
                      type="number"
                      value={empTransportAllowance}
                      onChange={(e) => setEmpTransportAllowance(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="form-label">بدلات أخرى</label>
                    <input
                      type="number"
                      value={empOtherAllowances}
                      onChange={(e) => setEmpOtherAllowances(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="form-label">ساعات الوردية</label>
                    <input
                      type="number"
                      value={empShiftHours}
                      onChange={(e) => setEmpShiftHours(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* CRITICAL: BIOMETRIC METHOD CONFIGURATION */}
              <div style={{ background: '#FFF7ED', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '18px', border: '1.5px solid var(--primary-orange)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Fingerprint size={22} color="var(--primary-orange)" />
                  <span style={{ fontWeight: 900, color: '#9A3412', fontSize: '1rem' }}>
                    طريقة تسجيل البصمة المعتمدة للموظف:
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#7C2D12', margin: '0 0 12px 0' }}>
                  حدد الطريقة التي سيقوم الموظف بإثبات حضوره وانصرافه بها (GPS، صورة وجه حية، أو إدخال الوقت وشيت الجهاز)
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: empBiometricMethod === 'TIME_ENTRY' ? 'var(--primary-orange)' : '#FFFFFF',
                      color: empBiometricMethod === 'TIME_ENTRY' ? '#FFFFFF' : '#1E293B',
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="bioMethod"
                      value="TIME_ENTRY"
                      checked={empBiometricMethod === 'TIME_ENTRY'}
                      onChange={() => setEmpBiometricMethod('TIME_ENTRY')}
                    />
                    <span>⏱️ إدخال الوقت / شيت جهاز البصمة</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: empBiometricMethod === 'GPS_LOCATION' ? 'var(--primary-orange)' : '#FFFFFF',
                      color: empBiometricMethod === 'GPS_LOCATION' ? '#FFFFFF' : '#1E293B',
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="bioMethod"
                      value="GPS_LOCATION"
                      checked={empBiometricMethod === 'GPS_LOCATION'}
                      onChange={() => setEmpBiometricMethod('GPS_LOCATION')}
                    />
                    <span>📍 تسجيل الموقع الجغرافي (GPS)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: empBiometricMethod === 'FACE_RECOGNITION' ? 'var(--primary-orange)' : '#FFFFFF',
                      color: empBiometricMethod === 'FACE_RECOGNITION' ? '#FFFFFF' : '#1E293B',
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="bioMethod"
                      value="FACE_RECOGNITION"
                      checked={empBiometricMethod === 'FACE_RECOGNITION'}
                      onChange={() => setEmpBiometricMethod('FACE_RECOGNITION')}
                    />
                    <span>📸 صورة الوجه بالكاميرا (Face)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: empBiometricMethod === 'GPS_AND_FACE' ? 'var(--primary-orange)' : '#FFFFFF',
                      color: empBiometricMethod === 'GPS_AND_FACE' ? '#FFFFFF' : '#1E293B',
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="bioMethod"
                      value="GPS_AND_FACE"
                      checked={empBiometricMethod === 'GPS_AND_FACE'}
                      onChange={() => setEmpBiometricMethod('GPS_AND_FACE')}
                    />
                    <span>🌐 مدمج (GPS + صورة الوجه)</span>
                  </label>
                </div>

                {/* Geofence GPS Inputs */}
                {(empBiometricMethod === 'GPS_LOCATION' || empBiometricMethod === 'GPS_AND_FACE') && (
                  <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #FED7AA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>إحداثيات موقع الفرع المسموح به للبصمة:</span>
                      <button
                        type="button"
                        onClick={getCurrentGeolocation}
                        disabled={geoLocating}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <MapPin size={14} />
                        <span>{geoLocating ? 'جاري التحديد...' : 'جلب موقعي الحالي بالـ GPS'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>خط العرض (Latitude)</label>
                        <input
                          type="text"
                          value={empLocationLat}
                          onChange={(e) => setEmpLocationLat(e.target.value)}
                          className="input-field"
                          placeholder="مثال: 30.0444"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>خط الطول (Longitude)</label>
                        <input
                          type="text"
                          value={empLocationLng}
                          onChange={(e) => setEmpLocationLng(e.target.value)}
                          className="input-field"
                          placeholder="مثال: 31.2357"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>نصف القطر المسموح (بالمتر)</label>
                        <input
                          type="number"
                          value={empRadiusMeters}
                          onChange={(e) => setEmpRadiusMeters(e.target.value)}
                          className="input-field"
                          placeholder="150"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Face Capture Inputs */}
                {(empBiometricMethod === 'FACE_RECOGNITION' || empBiometricMethod === 'GPS_AND_FACE') && (
                  <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #FED7AA', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                      الصورة المرجعية للوجه للتحقق بالكاميرا:
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      {cameraActive && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <video ref={videoRef} style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-orange)' }} />
                          <button type="button" onClick={capturePhoto} className="btn btn-primary btn-sm">التقاط الصورة</button>
                        </div>
                      )}

                      {!cameraActive && (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Camera size={16} />
                          <span>فتح الكاميرا والتقاط صورة الموظف</span>
                        </button>
                      )}

                      {capturedFaceData && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={capturedFaceData} alt="Captured Face" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }} />
                          <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>تم حفظ صورة الوجه للمطابقة الحية!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={empNotes}
                  onChange={(e) => setEmpNotes(e.target.value)}
                  className="input-field"
                  placeholder="أي تفاصيل خاصة بالموظف..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsAddEmpModalOpen(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800, padding: '10px 24px' }}>
                  {editingEmp ? 'حفظ التعديلات' : 'تأكيد وحفظ الموظف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: LOG LIVE BIOMETRIC PUNCH */}
      {/* ===================================================================== */}
      {isLogPunchModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', width: '100%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Fingerprint size={22} color="#3B82F6" />
                <span>تسجيل حركة بصمة فورية (دخول / خروج)</span>
              </h3>
              <button onClick={() => { setIsLogPunchModalOpen(false); stopCamera(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogPunch} style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">اختر الموظف *</label>
                <select
                  required
                  value={punchEmpId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setPunchEmpId(id);
                    const emp = employees.find((em) => em.id === id);
                    if (emp?.biometric_method) {
                      setPunchMethod(emp.biometric_method as any);
                    }
                  }}
                  className="input-field"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map((em) => (
                    <option key={em.id} value={em.id}>{em.name} ({em.employee_code}) - {em.biometric_method}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">نوع البصمة *</label>
                  <select
                    value={punchType}
                    onChange={(e) => setPunchType(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="IN">🟢 بصمة دخول (Clock In)</option>
                    <option value="OUT">🔴 بصمة خروج (Clock Out)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">طريقة التسجيل *</label>
                  <select
                    value={punchMethod}
                    onChange={(e) => setPunchMethod(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="TIME_ENTRY">⏱️ إدخال وقت يدوي</option>
                    <option value="GPS_LOCATION">📍 موقع جغرافي GPS</option>
                    <option value="FACE_RECOGNITION">📸 صورة الوجه بالكاميرا</option>
                    <option value="DEVICE_IMPORT">🖲️ شيت جهاز البصمة</option>
                  </select>
                </div>
              </div>

              {/* Geolocation verification trigger */}
              {punchMethod === 'GPS_LOCATION' && (
                <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px', border: '1px solid #BFDBFE' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF' }}>التحقق من موقع الموظف بالـ GPS:</span>
                    <button
                      type="button"
                      onClick={getCurrentGeolocation}
                      disabled={geoLocating}
                      className="btn btn-primary btn-sm"
                    >
                      {geoLocating ? 'جاري جلب الإحداثيات...' : 'تحديد موقعي الآن'}
                    </button>
                  </div>
                  {liveLocation && (
                    <div style={{ fontSize: '0.82rem', color: '#059669', marginTop: '6px', fontWeight: 700 }}>
                      ✅ تم التقاط الإحداثيات: {liveLocation.lat.toFixed(5)}, {liveLocation.lng.toFixed(5)}
                    </div>
                  )}
                </div>
              )}

              {/* Camera verification trigger */}
              {punchMethod === 'FACE_RECOGNITION' && (
                <div style={{ background: '#F5F3FF', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px', border: '1px solid #DDD6FE' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#5B21B6', marginBottom: '8px' }}>التقاط بصمة الوجه بالكاميرا:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {cameraActive && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <video ref={videoRef} style={{ width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover' }} />
                        <button type="button" onClick={capturePhoto} className="btn btn-primary btn-sm">التقاط</button>
                      </div>
                    )}
                    {!cameraActive && (
                      <button type="button" onClick={startCamera} className="btn btn-secondary btn-sm">
                        تشغيل الكاميرا
                      </button>
                    )}
                    {capturedFaceData && (
                      <img src={capturedFaceData} alt="Face" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }} />
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">ملاحظات البصمة</label>
                <input
                  type="text"
                  value={punchNotes}
                  onChange={(e) => setPunchNotes(e.target.value)}
                  className="input-field"
                  placeholder="مثال: بصمة موقع ميداني / فرع..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => { setIsLogPunchModalOpen(false); stopCamera(); }} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  تأكيد وتسجيل البصمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: IMPORT PUNCHES FROM EXCEL / DEVICE CSV */}
      {/* ===================================================================== */}
      {isImportPunchesModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={22} color="#10B981" />
                <span>استيراد حركات البصمة من أجهزة الحضور (ZKTeco / CSV)</span>
              </h3>
              <button onClick={() => setIsImportPunchesModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                الصق أسطر حركات البصمة المستخرجة من جهاز البصمة بالتنسيق التالي (سطر لكل حركة):<br />
                <code>كود_الموظف , تاريخ_ووقت_البصمة , نوع_الحركة (IN/OUT)</code><br />
                مثال: <code>EMP-1001, 2026-10-28 09:05:00, IN</code>
              </p>

              <textarea
                rows={8}
                value={importPunchesText}
                onChange={(e) => setImportPunchesText(e.target.value)}
                placeholder="EMP-1001, 2026-10-28 09:05:00, IN&#10;EMP-1002, 2026-10-28 09:12:00, IN"
                className="input-field"
                style={{ fontFamily: 'monospace', fontSize: '0.88rem', width: '100%', marginBottom: '14px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsImportPunchesModalOpen(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="button" onClick={handleImportPunches} className="btn btn-primary" style={{ fontWeight: 800 }}>
                  بدء الاستيراد والمعالجة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: ADD LEAVE REQUEST */}
      {/* ===================================================================== */}
      {isAddLeaveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={22} color="#EC4899" />
                <span>تقديم طلب إجازة / إذن رسمي</span>
              </h3>
              <button onClick={() => setIsAddLeaveModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLeave} style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">الموظف *</label>
                <select
                  required
                  value={leaveEmpId}
                  onChange={(e) => setLeaveEmpId(Number(e.target.value))}
                  className="input-field"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map((em) => (
                    <option key={em.id} value={em.id}>{em.name} ({em.employee_code})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">نوع الإجازة / الإذن *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="input-field"
                >
                  <option value="ANNUAL">🏖️ إجازة سنوية</option>
                  <option value="CASUAL">⚡ إجازة عارضة</option>
                  <option value="SICK">🩺 إجازة مرضية</option>
                  <option value="PERMISSION_HOURS">⏱️ إذن ساعي (خروج مؤقت)</option>
                  <option value="UNPAID">بدون راتب</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">تاريخ البداية *</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="form-label">تاريخ النهاية *</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {leaveType === 'PERMISSION_HOURS' && (
                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label">عدد الساعات المطلوبة للإذن</label>
                  <input
                    type="number"
                    value={leaveHours}
                    onChange={(e) => setLeaveHours(e.target.value)}
                    className="input-field"
                    placeholder="مثال: 2 ساعة"
                  />
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">سبب الإجازة والمبرر</label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="input-field"
                  placeholder="سبب تقديم الطلب..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsAddLeaveModalOpen(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  إرسال الطلب للاعتماد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: ADD SALARY ADJUSTMENT (ADVANCE / BONUS / DEDUCTION) */}
      {/* ===================================================================== */}
      {isAddAdjModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={22} color="#F59E0B" />
                <span>تسجيل حركة مالية للموظف</span>
              </h3>
              <button onClick={() => setIsAddAdjModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAdjustment} style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">الموظف *</label>
                <select
                  required
                  value={adjEmpId}
                  onChange={(e) => setAdjEmpId(Number(e.target.value))}
                  className="input-field"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map((em) => (
                    <option key={em.id} value={em.id}>{em.name} ({em.employee_code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">نوع الحركة *</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="ADVANCE">💰 سلفة نقدية</option>
                    <option value="BONUS">🎁 مكافأة وحافز</option>
                    <option value="DEDUCTION">⚠️ خصم وجزاء</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    className="input-field"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">سبب الحركة والمستند</label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="input-field"
                  placeholder="سبب السلفة أو تفاصيل المكافأة..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsAddAdjModalOpen(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  تأكيد وتسجيل الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: SINGLE A4 PAYSLIP MODAL */}
      {/* ===================================================================== */}
      {printPayslipItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary-orange)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/assets/zono_logo.jpeg" alt="ZONO" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                <div>
                  <div style={{ fontWeight: 900, color: 'var(--primary-orange)', fontSize: '1.2rem' }}>ZONO Delivery ERP</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>سركي استلام راتب معتمد - شهر {payrollMonth}</div>
                </div>
              </div>
              <button onClick={() => setPrintPayslipItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.95rem' }}>
              <span><strong>الموظف:</strong> {printPayslipItem.employeeName}</span>
              <span><strong>الكود:</strong> {printPayslipItem.employeeCode}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#F8FAFC', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div>الأساسي: <strong>{printPayslipItem.basicSalary.toLocaleString()} ج.م</strong></div>
              <div>البدلات: <strong>{printPayslipItem.allowances.toLocaleString()} ج.م</strong></div>
              <div>أيام الحضور: <strong>{printPayslipItem.presentDays} يوم</strong></div>
              <div>الإضافي: <strong>+{printPayslipItem.overtimeAmount} ج.م</strong></div>
              <div>الحوافز: <strong style={{ color: '#059669' }}>+{printPayslipItem.bonusesAmount} ج.م</strong></div>
              <div>استقطاع السلف: <strong style={{ color: '#DC2626' }}>-{printPayslipItem.advancesAmount} ج.م</strong></div>
              <div>الخصومات: <strong style={{ color: '#DC2626' }}>-{printPayslipItem.deductionsAmount} ج.م</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF3C7', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <span style={{ fontWeight: 800, color: '#92400E', fontSize: '1.05rem' }}>صافي المبلغ المستحق للصرف:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
                {printPayslipItem.netSalary.toLocaleString()} ج.م
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px dashed #CBD5E1', fontSize: '0.85rem', marginBottom: '18px' }}>
              <div>
                <div>توقيع الموظف بالاستلام:</div>
                <div style={{ borderBottom: '1px solid #94A3B8', width: '150px', height: '36px' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div>اعتماد الإدارة المالية:</div>
                <div style={{ borderBottom: '1px solid #94A3B8', width: '150px', height: '36px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setPrintPayslipItem(null)} className="btn btn-secondary">
                إغلاق
              </button>
              <button type="button" onClick={() => window.print()} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                <Printer size={16} />
                <span>طباعة السركي الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRView;
