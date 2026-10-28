-- ==============================================================================
-- ZONO DELIVERY SERVICES ERP - ENTERPRISE HR & PAYROLL MODULE MIGRATION
-- Modules: Employees, Departments, Attendance, Adjustments (Advances/Bonuses/Deductions),
--          Monthly Payroll Engine, Payslips (Sarki), and Financial Integration.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS hr_departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    national_id VARCHAR(30),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    department_id INT REFERENCES hr_departments(id) ON DELETE SET NULL,
    job_title VARCHAR(100) NOT NULL,
    hire_date DATE DEFAULT CURRENT_DATE,
    basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    housing_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transport_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    shift_hours INT NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PRESENT', -- PRESENT, ABSENT, EXCUSED, LATE, VACATION
    check_in_time TIME,
    check_out_time TIME,
    late_minutes INT NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_emp_date UNIQUE (employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS hr_salary_adjustments (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- ADVANCE (سلفة), BONUS (مكافأة), DEDUCTION (خصم)
    amount NUMERIC(12, 2) NOT NULL,
    cycle_month VARCHAR(7), -- e.g. '2026-10'
    reason TEXT NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    payroll_run_id INT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_payroll_runs (
    id SERIAL PRIMARY KEY,
    cycle_code VARCHAR(30) UNIQUE NOT NULL,
    cycle_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_basic NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_allowances NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_overtime NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_bonuses NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_advances NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_net_payable NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    employee_count INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, PAID
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    journal_entry_id INT REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_payroll_items (
    id SERIAL PRIMARY KEY,
    payroll_run_id INT NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
    employee_id INT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    job_title VARCHAR(100),
    department_name VARCHAR(100),
    basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    working_days INT NOT NULL DEFAULT 30,
    present_days INT NOT NULL DEFAULT 0,
    absent_days INT NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    overtime_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bonuses_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deductions_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advances_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Seed default shipping company departments
INSERT INTO hr_departments (code, name, description)
VALUES 
    ('OPS', 'العمليات واللوجستيات', 'إدارة حركة الشحن، التجهيز، والتوزيع'),
    ('COURIER', 'فريق المناديب والكباتن', 'مندوبو التوصيل والاستلام الميداني'),
    ('FIN', 'الحسابات والمالية', 'الخزينة، تسويات المناديب، ومستحقات التجار'),
    ('CS', 'خدمة العملاء والدعم', 'متابعة الشحنات وتنسيق مواعيد الاستلام'),
    ('MGMT', 'الإدارة العليا والتطوير', 'التخطيط الاستراتيجي ومراقبة الجودة')
ON CONFLICT (code) DO NOTHING;

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_hr_emp_dept ON hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_att_emp_date ON hr_attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_hr_adj_emp_cycle ON hr_salary_adjustments(employee_id, cycle_month);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_items_run ON hr_payroll_items(payroll_run_id);
