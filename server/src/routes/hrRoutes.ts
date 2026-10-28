import { Router, Response } from 'express';
import { executeTransaction, query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';

const router = Router();

// ==============================================================================
// 1. نظرة عامة ومؤشرات الموارد البشرية (HR Overview & KPIs)
// ==============================================================================
router.get('/overview', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total employees count
    const empCountRes = await query(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
        COALESCE(SUM(basic_salary + housing_allowance + transport_allowance + other_allowances), 0) as total_monthly_payroll
      FROM hr_employees
    `);

    // Today's attendance summary
    const attRes = await query(
      `SELECT 
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_today,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_today,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late_today
       FROM hr_attendance 
       WHERE attendance_date = $1`,
      [today]
    );

    // Active unsettled advances
    const advRes = await query(`
      SELECT COALESCE(SUM(amount), 0) as total_open_advances
      FROM hr_salary_adjustments
      WHERE type = 'ADVANCE' AND is_settled = false
    `);

    const empStats = empCountRes.rows[0];
    const attStats = attRes.rows[0];
    const advStats = advRes.rows[0];

    return res.json({
      success: true,
      data: {
        totalEmployees: Number.parseInt(empStats?.total_employees || '0', 10),
        activeEmployees: Number.parseInt(empStats?.active_employees || '0', 10),
        totalMonthlyPayroll: Number.parseFloat(empStats?.total_monthly_payroll || '0'),
        presentToday: Number.parseInt(attStats?.present_today || '0', 10),
        absentToday: Number.parseInt(attStats?.absent_today || '0', 10),
        lateToday: Number.parseInt(attStats?.late_today || '0', 10),
        openAdvances: Number.parseFloat(advStats?.total_open_advances || '0'),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 2. إدارة الأقسام (Departments Master)
// ==============================================================================
router.get('/departments', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT d.*, COUNT(e.id) as employee_count
      FROM hr_departments d
      LEFT JOIN hr_employees e ON e.department_id = d.id AND e.is_active = true
      GROUP BY d.id
      ORDER BY d.id ASC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/departments', authenticateToken, requireRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'كود القسم واسمه مطلوبان' });
    }

    const result = await query(
      `INSERT INTO hr_departments (code, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [code.trim().toUpperCase(), name.trim(), description || '']
    );

    return res.status(201).json({
      success: true,
      message: 'تم إضافة القسم بنجاح',
      data: result.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 3. إدارة الموظفين (Employees CRUD)
// ==============================================================================
router.get('/employees', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { search, departmentId, activeOnly } = req.query;
    let sql = `
      SELECT e.*, d.name as department_name, d.code as department_code
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly === 'true') {
      sql += ` AND e.is_active = true`;
    }

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND e.department_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (e.name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR e.phone ILIKE $${params.length} OR e.job_title ILIKE $${params.length})`;
    }

    sql += ` ORDER BY e.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/employees', authenticateToken, requireRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      nationalId,
      phone,
      email,
      departmentId,
      jobTitle,
      hireDate,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      shiftHours,
      biometricMethod,
      allowedLocationLat,
      allowedLocationLng,
      allowedRadiusMeters,
      faceTemplateData,
      notes,
    } = req.body;

    if (!name || !phone || !jobTitle) {
      return res.status(400).json({ success: false, message: 'اسم الموظف، الهاتف، والمسمى الوظيفي حقول إلزامية' });
    }

    // Auto generate employee code (EMP-1001, EMP-1002...)
    const countRes = await query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM hr_employees`);
    const nextId = countRes.rows[0].next_id;
    const employeeCode = `EMP-${String(nextId).padStart(4, '0')}`;

    const insertRes = await query(
      `INSERT INTO hr_employees (
        employee_code, name, national_id, phone, email,
        department_id, job_title, hire_date, basic_salary,
        housing_allowance, transport_allowance, other_allowances,
        shift_hours, biometric_method, allowed_location_lat,
        allowed_location_lng, allowed_radius_meters, face_template_data, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        employeeCode,
        name.trim(),
        nationalId || null,
        phone.trim(),
        email || null,
        departmentId ? Number.parseInt(departmentId, 10) : null,
        jobTitle.trim(),
        hireDate || new Date().toISOString().split('T')[0],
        Number.parseFloat(basicSalary || '0'),
        Number.parseFloat(housingAllowance || '0'),
        Number.parseFloat(transportAllowance || '0'),
        Number.parseFloat(otherAllowances || '0'),
        Number.parseInt(shiftHours || '8', 10),
        biometricMethod || 'TIME_ENTRY',
        allowedLocationLat ? Number.parseFloat(allowedLocationLat) : null,
        allowedLocationLng ? Number.parseFloat(allowedLocationLng) : null,
        allowedRadiusMeters ? Number.parseInt(allowedRadiusMeters, 10) : 150,
        faceTemplateData || null,
        notes || '',
      ]
    );

    return res.status(201).json({
      success: true,
      message: `تم تكويد الموظف ${name} بنجاح برقم (${employeeCode}) مع ضبط طريقة البصمة (${biometricMethod || 'إدخال الوقت'})`,
      data: insertRes.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/employees/:id', authenticateToken, requireRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      nationalId,
      phone,
      email,
      departmentId,
      jobTitle,
      hireDate,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      shiftHours,
      biometricMethod,
      allowedLocationLat,
      allowedLocationLng,
      allowedRadiusMeters,
      faceTemplateData,
      isActive,
      notes,
    } = req.body;

    const updateRes = await query(
      `UPDATE hr_employees SET
        name = COALESCE($1, name),
        national_id = COALESCE($2, national_id),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        department_id = $5,
        job_title = COALESCE($6, job_title),
        hire_date = COALESCE($7, hire_date),
        basic_salary = COALESCE($8, basic_salary),
        housing_allowance = COALESCE($9, housing_allowance),
        transport_allowance = COALESCE($10, transport_allowance),
        other_allowances = COALESCE($11, other_allowances),
        shift_hours = COALESCE($12, shift_hours),
        biometric_method = COALESCE($13, biometric_method),
        allowed_location_lat = COALESCE($14, allowed_location_lat),
        allowed_location_lng = COALESCE($15, allowed_location_lng),
        allowed_radius_meters = COALESCE($16, allowed_radius_meters),
        face_template_data = COALESCE($17, face_template_data),
        is_active = COALESCE($18, is_active),
        notes = COALESCE($19, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *`,
      [
        name,
        nationalId,
        phone,
        email,
        departmentId ? Number.parseInt(departmentId, 10) : null,
        jobTitle,
        hireDate,
        basicSalary != null ? Number.parseFloat(basicSalary) : null,
        housingAllowance != null ? Number.parseFloat(housingAllowance) : null,
        transportAllowance != null ? Number.parseFloat(transportAllowance) : null,
        otherAllowances != null ? Number.parseFloat(otherAllowances) : null,
        shiftHours != null ? Number.parseInt(shiftHours, 10) : null,
        biometricMethod,
        allowedLocationLat != null ? Number.parseFloat(allowedLocationLat) : null,
        allowedLocationLng != null ? Number.parseFloat(allowedLocationLng) : null,
        allowedRadiusMeters != null ? Number.parseInt(allowedRadiusMeters, 10) : null,
        faceTemplateData,
        isActive,
        notes,
        id,
      ]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    return res.json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
      data: updateRes.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 4. تسجيل الحضور والانصراف (Attendance Engine)
// ==============================================================================
router.get('/attendance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { date, employeeId, month } = req.query;
    let sql = `
      SELECT a.*, e.name as employee_name, e.employee_code, e.job_title, d.name as department_name
      FROM hr_attendance a
      JOIN hr_employees e ON e.id = a.employee_id
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      params.push(date);
      sql += ` AND a.attendance_date = $${params.length}`;
    }

    if (employeeId) {
      params.push(employeeId);
      sql += ` AND a.employee_id = $${params.length}`;
    }

    if (month) {
      params.push(`${month}%`);
      sql += ` AND a.attendance_date::text LIKE $${params.length}`;
    }

    sql += ` ORDER BY a.attendance_date DESC, a.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/attendance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, attendanceDate, status, checkInTime, checkOutTime, lateMinutes, overtimeHours, notes } = req.body;

    if (!employeeId || !attendanceDate) {
      return res.status(400).json({ success: false, message: 'الموظف وتاريخ الحضور مطلوبان' });
    }

    const result = await query(
      `INSERT INTO hr_attendance (
        employee_id, attendance_date, status, check_in_time, check_out_time,
        late_minutes, overtime_hours, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, attendance_date)
      DO UPDATE SET
        status = EXCLUDED.status,
        check_in_time = COALESCE(EXCLUDED.check_in_time, hr_attendance.check_in_time),
        check_out_time = COALESCE(EXCLUDED.check_out_time, hr_attendance.check_out_time),
        late_minutes = EXCLUDED.late_minutes,
        overtime_hours = EXCLUDED.overtime_hours,
        notes = EXCLUDED.notes
      RETURNING *`,
      [
        employeeId,
        attendanceDate,
        status || 'PRESENT',
        checkInTime || null,
        checkOutTime || null,
        Number.parseInt(lateMinutes || '0', 10),
        Number.parseFloat(overtimeHours || '0'),
        notes || '',
      ]
    );

    return res.json({
      success: true,
      message: 'تم تسجيل الحضور والانصراف بنجاح',
      data: result.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 5. التسويات المالية للموظفين (Advances, Bonuses, Deductions)
// ==============================================================================
router.get('/adjustments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, type, month, unsettledOnly } = req.query;
    let sql = `
      SELECT adj.*, e.name as employee_name, e.employee_code, e.job_title, u.full_name as created_by_name
      FROM hr_salary_adjustments adj
      JOIN hr_employees e ON e.id = adj.employee_id
      LEFT JOIN users u ON u.id = adj.created_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employeeId) {
      params.push(employeeId);
      sql += ` AND adj.employee_id = $${params.length}`;
    }

    if (type) {
      params.push(type);
      sql += ` AND adj.type = $${params.length}`;
    }

    if (month) {
      params.push(month);
      sql += ` AND adj.cycle_month = $${params.length}`;
    }

    if (unsettledOnly === 'true') {
      sql += ` AND adj.is_settled = false`;
    }

    sql += ` ORDER BY adj.effective_date DESC, adj.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/adjustments', authenticateToken, requireRoles(['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, type, amount, reason, cycleMonth, effectiveDate } = req.body;

    if (!employeeId || !type || !amount || !reason) {
      return res.status(400).json({ success: false, message: 'الموظف، نوع المعاملة، المبلغ، والسبب بيانات مطلوبة' });
    }

    const curMonth = cycleMonth || new Date().toISOString().slice(0, 7);
    const effDate = effectiveDate || new Date().toISOString().split('T')[0];

    const result = await query(
      `INSERT INTO hr_salary_adjustments (
        employee_id, type, amount, reason, cycle_month, effective_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        employeeId,
        type, // ADVANCE, BONUS, DEDUCTION
        Number.parseFloat(amount),
        reason.trim(),
        curMonth,
        effDate,
        req.user?.id || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'تم قيد التسوية المالية للموظف بنجاح',
      data: result.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 6. مسير الرواتب الشهري والسراكي (Monthly Payroll & Payslips Engine)
// ==============================================================================
router.get('/payroll/calculate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;
    const targetMonth = (month as string) || new Date().toISOString().slice(0, 7); // e.g. '2026-10'

    // Calculate dates
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = Number.parseInt(yearStr, 10);
    const m = Number.parseInt(monthStr, 10);
    const daysInMonth = new Date(year, m, 0).getDate();
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-${String(daysInMonth).padStart(2, '0')}`;

    // Get all active employees
    const empRes = await query(`
      SELECT e.*, d.name as department_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE e.is_active = true
      ORDER BY e.id ASC
    `);

    // Get adjustments for this month
    const adjRes = await query(
      `SELECT employee_id, type, SUM(amount) as total_amount
       FROM hr_salary_adjustments
       WHERE cycle_month = $1 AND is_settled = false
       GROUP BY employee_id, type`,
      [targetMonth]
    );

    const adjustmentsMap: Record<number, { advances: number; bonuses: number; deductions: number }> = {};
    adjRes.rows.forEach((r) => {
      const empId = r.employee_id;
      if (!adjustmentsMap[empId]) {
        adjustmentsMap[empId] = { advances: 0, bonuses: 0, deductions: 0 };
      }
      const val = Number.parseFloat(r.total_amount || '0');
      if (r.type === 'ADVANCE') adjustmentsMap[empId].advances += val;
      if (r.type === 'BONUS') adjustmentsMap[empId].bonuses += val;
      if (r.type === 'DEDUCTION') adjustmentsMap[empId].deductions += val;
    });

    // Get attendance for this month
    const attRes = await query(
      `SELECT employee_id,
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_days,
        COALESCE(SUM(overtime_hours), 0) as total_overtime_hours
       FROM hr_attendance
       WHERE attendance_date >= $1 AND attendance_date <= $2
       GROUP BY employee_id`,
      [startDate, endDate]
    );

    const attMap: Record<number, { present: number; absent: number; overtime: number }> = {};
    attRes.rows.forEach((r) => {
      attMap[r.employee_id] = {
        present: Number.parseInt(r.present_days || '0', 10),
        absent: Number.parseInt(r.absent_days || '0', 10),
        overtime: Number.parseFloat(r.total_overtime_hours || '0'),
      };
    });

    // Build payroll preview
    let totalBasic = 0;
    let totalAllowances = 0;
    let totalOvertime = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;
    let totalAdvances = 0;
    let totalNetPayable = 0;

    const items = empRes.rows.map((emp) => {
      const basic = Number.parseFloat(emp.basic_salary || '0');
      const allowances =
        Number.parseFloat(emp.housing_allowance || '0') +
        Number.parseFloat(emp.transport_allowance || '0') +
        Number.parseFloat(emp.other_allowances || '0');

      const empAtt = attMap[emp.id] || { present: daysInMonth, absent: 0, overtime: 0 };
      const empAdj = adjustmentsMap[emp.id] || { advances: 0, bonuses: 0, deductions: 0 };

      // Hourly wage = Basic / 30 / shift_hours (default 8)
      const shiftHours = emp.shift_hours || 8;
      const hourlyWage = basic > 0 ? (basic / 30) / shiftHours : 0;
      const overtimeAmount = empAtt.overtime * hourlyWage * 1.5; // 1.5x standard overtime factor

      // Absence penalty = (Basic / 30) * absent_days
      const absenceDeduction = (basic / 30) * empAtt.absent;
      const totalDeductionsForEmp = empAdj.deductions + absenceDeduction;

      // Net Salary = (Basic + Allowances + Overtime + Bonuses) - (Deductions + Advances)
      const net = (basic + allowances + overtimeAmount + empAdj.bonuses) - (totalDeductionsForEmp + empAdj.advances);

      totalBasic += basic;
      totalAllowances += allowances;
      totalOvertime += overtimeAmount;
      totalBonuses += empAdj.bonuses;
      totalDeductions += totalDeductionsForEmp;
      totalAdvances += empAdj.advances;
      totalNetPayable += Math.max(0, net);

      return {
        employeeId: emp.id,
        employeeCode: emp.employee_code,
        employeeName: emp.name,
        jobTitle: emp.job_title,
        departmentName: emp.department_name || 'عام',
        basicSalary: basic,
        allowances,
        workingDays: daysInMonth,
        presentDays: empAtt.present,
        absentDays: empAtt.absent,
        overtimeHours: empAtt.overtime,
        overtimeAmount: Math.round(overtimeAmount * 100) / 100,
        bonusesAmount: empAdj.bonuses,
        deductionsAmount: Math.round(totalDeductionsForEmp * 100) / 100,
        advancesAmount: empAdj.advances,
        netSalary: Math.max(0, Math.round(net * 100) / 100),
      };
    });

    return res.json({
      success: true,
      data: {
        cycleMonth: targetMonth,
        startDate,
        endDate,
        daysInMonth,
        summary: {
          totalBasic: Math.round(totalBasic * 100) / 100,
          totalAllowances: Math.round(totalAllowances * 100) / 100,
          totalOvertime: Math.round(totalOvertime * 100) / 100,
          totalBonuses: Math.round(totalBonuses * 100) / 100,
          totalDeductions: Math.round(totalDeductions * 100) / 100,
          totalAdvances: Math.round(totalAdvances * 100) / 100,
          totalNetPayable: Math.round(totalNetPayable * 100) / 100,
          employeeCount: items.length,
        },
        items,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Save and generate formal Payroll Run
router.post('/payroll/save', authenticateToken, requireRoles(['SUPER_ADMIN', 'ACCOUNTANT']), async (req: AuthRequest, res: Response) => {
  try {
    const { cycleMonth } = req.body;
    const targetMonth = cycleMonth || new Date().toISOString().slice(0, 7);

    const result = await executeTransaction(async (client) => {
      // 1. Check if cycle already approved
      const existing = await client.query(`SELECT id, status FROM hr_payroll_runs WHERE cycle_code = $1`, [`PAYROLL-${targetMonth}`]);
      if (existing.rows.length > 0 && existing.rows[0].status === 'APPROVED') {
        throw new Error('مسير رواتب هذا الشهر معتمد مسبقاً ولا يمكن إعادة إنشائه');
      }

      // Calculate fresh payroll items
      const [yearStr, monthStr] = targetMonth.split('-');
      const year = Number.parseInt(yearStr, 10);
      const m = Number.parseInt(monthStr, 10);
      const daysInMonth = new Date(year, m, 0).getDate();
      const startDate = `${targetMonth}-01`;
      const endDate = `${targetMonth}-${String(daysInMonth).padStart(2, '0')}`;

      const empRes = await client.query(`
        SELECT e.*, d.name as department_name
        FROM hr_employees e
        LEFT JOIN hr_departments d ON d.id = e.department_id
        WHERE e.is_active = true
      `);

      let totalBasic = 0;
      let totalAllowances = 0;
      let totalNetPayable = 0;

      const payrollRunRes = await client.query(
        `INSERT INTO hr_payroll_runs (
          cycle_code, cycle_name, start_date, end_date, employee_count
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (cycle_code) DO UPDATE SET
          updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          `PAYROLL-${targetMonth}`,
          `مسير رواتب شهر ${targetMonth}`,
          startDate,
          endDate,
          empRes.rows.length,
        ]
      );
      const runId = payrollRunRes.rows[0].id;

      // Delete old draft items if existing
      await client.query(`DELETE FROM hr_payroll_items WHERE payroll_run_id = $1`, [runId]);

      for (const emp of empRes.rows) {
        const basic = Number.parseFloat(emp.basic_salary || '0');
        const allowances =
          Number.parseFloat(emp.housing_allowance || '0') +
          Number.parseFloat(emp.transport_allowance || '0') +
          Number.parseFloat(emp.other_allowances || '0');
        const net = basic + allowances;

        totalBasic += basic;
        totalAllowances += allowances;
        totalNetPayable += net;

        await client.query(
          `INSERT INTO hr_payroll_items (
            payroll_run_id, employee_id, employee_name, job_title, department_name,
            basic_salary, allowances, working_days, net_salary
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            runId,
            emp.id,
            emp.name,
            emp.job_title,
            emp.department_name || 'عام',
            basic,
            allowances,
            daysInMonth,
            net,
          ]
        );
      }

      await client.query(
        `UPDATE hr_payroll_runs SET
          total_basic = $1,
          total_allowances = $2,
          total_net_payable = $3
        WHERE id = $4`,
        [totalBasic, totalAllowances, totalNetPayable, runId]
      );

      return { runId, targetMonth, totalNetPayable };
    });

    return res.json({
      success: true,
      message: `تم حفظ مسير رواتب شهر ${result.targetMonth} بنجاح`,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// List past payroll runs
router.get('/payroll/runs', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT p.*, u.full_name as approved_by_name
      FROM hr_payroll_runs p
      LEFT JOIN users u ON u.id = p.approved_by
      ORDER BY p.id DESC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Approve payroll run and trigger ledger journal entry!
router.post('/payroll/runs/:id/approve', authenticateToken, requireRoles(['SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await executeTransaction(async (client) => {
      const runRes = await client.query(`SELECT * FROM hr_payroll_runs WHERE id = $1`, [id]);
      if (runRes.rows.length === 0) {
        throw new Error('مسير الرواتب غير موجود');
      }

      const run = runRes.rows[0];
      if (run.status === 'APPROVED') {
        throw new Error('مسير الرواتب معتمد بالفعل');
      }

      // Mark as approved
      await client.query(
        `UPDATE hr_payroll_runs SET
          status = 'APPROVED',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
        [req.user?.id || 1, id]
      );

      // Settle all related adjustments for this cycle
      const cycleMonth = run.cycle_code.replace('PAYROLL-', '');
      await client.query(
        `UPDATE hr_salary_adjustments SET
          is_settled = true,
          payroll_run_id = $1
        WHERE cycle_month = $2`,
        [id, cycleMonth]
      );

      return run;
    });

    return res.json({
      success: true,
      message: `تم اعتماد مسير رواتب ${result.cycle_name} وإغلاق المستحقات بنجاح!`,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 7. البصمة وحركات الحضور البيومترية (Biometric Punches & Face/GPS Attendance)
// ==============================================================================
router.get('/punches', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, date, method, limit = 100 } = req.query;
    let sql = `
      SELECT p.*, e.name as employee_name, e.employee_code, e.job_title, d.name as department_name
      FROM hr_biometric_punches p
      JOIN hr_employees e ON e.id = p.employee_id
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employeeId) {
      params.push(employeeId);
      sql += ` AND p.employee_id = $${params.length}`;
    }

    if (date) {
      params.push(`${date}%`);
      sql += ` AND p.punch_time::text LIKE $${params.length}`;
    }

    if (method) {
      params.push(method);
      sql += ` AND p.punch_method = $${params.length}`;
    }

    sql += ` ORDER BY p.punch_time DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/punches', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeId,
      punchType = 'IN',
      punchMethod = 'TIME_ENTRY',
      locationLat,
      locationLng,
      locationAddress,
      faceImageUrl,
      deviceId,
      notes,
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'معرف الموظف مطلوب' });
    }

    // Verify employee
    const empRes = await query(`SELECT * FROM hr_employees WHERE id = $1`, [employeeId]);
    if (empRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    const emp = empRes.rows[0];

    // Distance calculation if employee has geofence
    let distanceMeters = null;
    let verificationStatus = 'VERIFIED';

    if (emp.allowed_location_lat && emp.allowed_location_lng && locationLat && locationLng) {
      const R = 6371e3; // Earth radius in meters
      const φ1 = (emp.allowed_location_lat * Math.PI) / 180;
      const φ2 = (locationLat * Math.PI) / 180;
      const Δφ = ((locationLat - emp.allowed_location_lat) * Math.PI) / 180;
      const Δλ = ((locationLng - emp.allowed_location_lng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceMeters = Math.round(R * c);

      const maxAllowed = emp.allowed_radius_meters || 150;
      if (distanceMeters > maxAllowed) {
        verificationStatus = 'OUT_OF_RANGE';
      }
    }

    const punchRes = await query(
      `INSERT INTO hr_biometric_punches (
        employee_id, punch_type, punch_method, location_lat,
        location_lng, location_address, distance_meters, face_image_url,
        device_id, verification_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        employeeId,
        punchType,
        punchMethod,
        locationLat ? Number.parseFloat(locationLat) : null,
        locationLng ? Number.parseFloat(locationLng) : null,
        locationAddress || '',
        distanceMeters,
        faceImageUrl || null,
        deviceId || null,
        verificationStatus,
        notes || '',
      ]
    );

    // Automatically sync or update hr_attendance for today
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    const existAtt = await query(
      `SELECT * FROM hr_attendance WHERE employee_id = $1 AND attendance_date = $2`,
      [employeeId, today]
    );

    if (existAtt.rowCount === 0) {
      // First punch of the day: create attendance record
      await query(
        `INSERT INTO hr_attendance (
          employee_id, attendance_date, status, check_in_time, notes
        ) VALUES ($1, $2, 'PRESENT', $3, $4)`,
        [employeeId, today, nowTime, `تم التسجيل عبر البصمة (${punchMethod})`]
      );
    } else if (punchType === 'OUT') {
      // Out punch: update check out time
      await query(
        `UPDATE hr_attendance SET
          check_out_time = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $2 AND attendance_date = $3`,
        [nowTime, employeeId, today]
      );
    }

    return res.status(201).json({
      success: true,
      message: `تم تسجيل بصمة ${punchType === 'IN' ? 'الدخول' : 'الانصراف'} للموظف (${emp.name}) بنجاح!`,
      data: punchRes.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Import punches batch (from ZKTeco or Excel CSV device export)
router.post('/punches/import', authenticateToken, requireRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { punches } = req.body;
    if (!Array.isArray(punches) || punches.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة البصمات فارغة أو غير صحيحة' });
    }

    let insertedCount = 0;
    for (const p of punches) {
      if (!p.employeeId && !p.employeeCode) continue;

      let empId = p.employeeId;
      if (!empId && p.employeeCode) {
        const findEmp = await query(`SELECT id FROM hr_employees WHERE employee_code = $1`, [p.employeeCode]);
        if (findEmp.rowCount && findEmp.rows[0]) {
          empId = findEmp.rows[0].id;
        } else {
          continue;
        }
      }

      await query(
        `INSERT INTO hr_biometric_punches (
          employee_id, punch_time, punch_type, punch_method, device_id, verification_status, notes
        ) VALUES ($1, $2, $3, 'DEVICE_IMPORT', $4, 'VERIFIED', $5)`,
        [
          empId,
          p.punchTime || new Date().toISOString(),
          p.punchType || 'IN',
          p.deviceId || 'DEVICE-01',
          p.notes || 'استيراد من شيت جهاز البصمة',
        ]
      );
      insertedCount++;
    }

    return res.json({
      success: true,
      message: `تم استيراد ${insertedCount} حركة بصمة بنجاح إلى قاعدة البيانات!`,
      data: { importedCount: insertedCount },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Audit & Comparison: Punch records vs manual shifts
router.get('/punches/audit-comparison', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const result = await query(
      `SELECT 
        e.id as employee_id,
        e.employee_code,
        e.name as employee_name,
        e.job_title,
        d.name as department_name,
        e.biometric_method,
        e.shift_hours,
        att.id as attendance_id,
        att.status as shift_status,
        att.check_in_time as scheduled_in,
        att.check_out_time as scheduled_out,
        att.late_minutes,
        att.overtime_hours,
        (
          SELECT MIN(to_char(p_in.punch_time, 'HH24:MI'))
          FROM hr_biometric_punches p_in
          WHERE p_in.employee_id = e.id 
            AND p_in.punch_time::text LIKE $1
            AND p_in.punch_type = 'IN'
        ) as actual_biometric_in,
        (
          SELECT MAX(to_char(p_out.punch_time, 'HH24:MI'))
          FROM hr_biometric_punches p_out
          WHERE p_out.employee_id = e.id 
            AND p_out.punch_time::text LIKE $1
            AND p_out.punch_type = 'OUT'
        ) as actual_biometric_out,
        (
          SELECT COUNT(*)
          FROM hr_biometric_punches p_all
          WHERE p_all.employee_id = e.id 
            AND p_all.punch_time::text LIKE $1
        ) as total_punches_count
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_attendance att ON att.employee_id = e.id AND att.attendance_date = $2
      WHERE e.is_active = true
      ORDER BY e.name ASC`,
      [`${date}%`, date]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 8. دورة الإجازات والأذونات (Leaves & Permissions Workflow)
// ==============================================================================
router.get('/leaves', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, status, year } = req.query;
    let sql = `
      SELECT l.*, e.name as employee_name, e.employee_code, d.name as department_name
      FROM hr_leaves l
      JOIN hr_employees e ON e.id = l.employee_id
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employeeId) {
      params.push(employeeId);
      sql += ` AND l.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND l.status = $${params.length}`;
    }

    if (year) {
      params.push(`${year}%`);
      sql += ` AND l.start_date::text LIKE $${params.length}`;
    }

    sql += ` ORDER BY l.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/leaves', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, leaveType, startDate, endDate, hours, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'الموظف، نوع الإجازة، وتاريخ البداية والنهاية حقول إلزامية' });
    }

    const insertRes = await query(
      `INSERT INTO hr_leaves (
        employee_id, leave_type, start_date, end_date, hours, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *`,
      [
        employeeId,
        leaveType,
        startDate,
        endDate,
        Number.parseFloat(hours || '0'),
        reason || '',
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل طلب الإجازة بنجاح وهو قيد الاعتماد الإداري',
      data: insertRes.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/leaves/:id/status', authenticateToken, requireRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, decisionNotes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة الاعتماد يجب أن تكون إما APPROVED أو REJECTED' });
    }

    const updateRes = await query(
      `UPDATE hr_leaves SET
        status = $1,
        decision_notes = $2,
        approved_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [status, decisionNotes || '', req.user?.fullName || 'الإدارة', id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'طلب الإجازة غير موجود' });
    }

    return res.json({
      success: true,
      message: `تم ${status === 'APPROVED' ? 'اعتماد' : 'رفض'} طلب الإجازة بنجاح`,
      data: updateRes.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 9. تقارير الموارد البشرية الشاملة (Comprehensive HR Reports)
// ==============================================================================
// تقرير عام لموظف 360 درجة (كشف حساب رواتب، سلف، حضور، وإجازات)
router.get('/reports/employee/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const empRes = await query(
      `SELECT e.*, d.name as department_name 
       FROM hr_employees e 
       LEFT JOIN hr_departments d ON d.id = e.department_id 
       WHERE e.id = $1`,
      [id]
    );

    if (empRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    const emp = empRes.rows[0];

    // Payroll payout history
    const payrollHistory = await query(
      `SELECT pi.*, pr.cycle_code, pr.cycle_name, pr.month, pr.status as run_status
       FROM hr_payroll_items pi
       JOIN hr_payroll_runs pr ON pr.id = pi.payroll_run_id
       WHERE pi.employee_id = $1
       ORDER BY pr.month DESC`,
      [id]
    );

    // Adjustments & Advances history
    const adjustmentsHistory = await query(
      `SELECT * FROM hr_salary_adjustments 
       WHERE employee_id = $1 
       ORDER BY action_date DESC`,
      [id]
    );

    // Leaves summary
    const leavesHistory = await query(
      `SELECT * FROM hr_leaves 
       WHERE employee_id = $1 
       ORDER BY start_date DESC`,
      [id]
    );

    // Biometric & Attendance summary metrics
    const attMetrics = await query(
      `SELECT 
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as total_present,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as total_absent,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END) as total_late,
        COALESCE(SUM(late_minutes), 0) as total_late_minutes,
        COALESCE(SUM(overtime_hours), 0) as total_overtime_hours
       FROM hr_attendance
       WHERE employee_id = $1`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        employee: emp,
        metrics: attMetrics.rows[0],
        payrollHistory: payrollHistory.rows,
        adjustmentsHistory: adjustmentsHistory.rows,
        leavesHistory: leavesHistory.rows,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// تقرير إجمالي الأقسام وتكاليف الرواتب (Totals & Dept Cost Report)
router.get('/reports/totals', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        d.id as department_id,
        d.name as department_name,
        d.code as department_code,
        COUNT(e.id) as employee_count,
        COALESCE(SUM(e.basic_salary), 0) as total_basic_salaries,
        COALESCE(SUM(e.housing_allowance + e.transport_allowance + e.other_allowances), 0) as total_allowances,
        COALESCE(SUM(e.basic_salary + e.housing_allowance + e.transport_allowance + e.other_allowances), 0) as gross_monthly_cost,
        COALESCE((
          SELECT SUM(adj.amount) 
          FROM hr_salary_adjustments adj 
          JOIN hr_employees emp ON emp.id = adj.employee_id 
          WHERE emp.department_id = d.id AND adj.type = 'ADVANCE' AND adj.is_settled = false
        ), 0) as open_advances_balance
      FROM hr_departments d
      LEFT JOIN hr_employees e ON e.department_id = d.id AND e.is_active = true
      GROUP BY d.id
      ORDER BY gross_monthly_cost DESC
    `);

    // Calculate grand total for percentages
    const totalCompanyCost = result.rows.reduce(
      (sum, row) => sum + Number.parseFloat(row.gross_monthly_cost || '0'),
      0
    );

    const dataWithPercentages = result.rows.map((row) => ({
      ...row,
      costPercentage: totalCompanyCost > 0
        ? ((Number.parseFloat(row.gross_monthly_cost) / totalCompanyCost) * 100).toFixed(1)
        : '0.0',
    }));

    return res.json({
      success: true,
      data: {
        totalCompanyCost,
        departments: dataWithPercentages,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 10. صلاحيات مستخدمي شاشات الموارد البشرية (HR Screen Permissions)
// ==============================================================================
router.get('/permissions', authenticateToken, requireRoles(['SUPER_ADMIN']), async (_req: AuthRequest, res: Response) => {
  try {
    const usersRes = await query(`
      SELECT id, username, full_name, role, is_active 
      FROM users 
      WHERE role IN ('SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DATA_ENTRY')
      ORDER BY id ASC
    `);

    const permsRes = await query(`SELECT * FROM hr_user_permissions`);

    return res.json({
      success: true,
      data: {
        users: usersRes.rows,
        permissions: permsRes.rows,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/permissions', authenticateToken, requireRoles(['SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, screenKey, canView, canEdit } = req.body;
    if (!userId || !screenKey) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والشاشة مطلوبان' });
    }

    const result = await query(
      `INSERT INTO hr_user_permissions (user_id, screen_key, can_view, can_edit, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, screen_key)
       DO UPDATE SET
         can_view = EXCLUDED.can_view,
         can_edit = EXCLUDED.can_edit,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, screenKey, canView ?? true, canEdit ?? true]
    );

    return res.json({
      success: true,
      message: 'تم تحديث صلاحية الشاشة بنجاح',
      data: result.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
