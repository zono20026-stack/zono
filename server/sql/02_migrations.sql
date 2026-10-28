-- ==============================================================================
-- MIGRATION: Directory Coding, Customer History, Expenses, and GPS Locations
-- ==============================================================================

-- 1. تحديث جدول التجار: إضافة كود التاجر وإحداثيات اللوكيشن
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_code VARCHAR(30) NULL;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) NULL;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) NULL;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_maps_url TEXT NULL;

UPDATE merchants SET merchant_code = 'MRC-00' || id WHERE merchant_code IS NULL;
ALTER TABLE merchants ALTER COLUMN merchant_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_code ON merchants(merchant_code);

-- 2. تحديث جدول المناديب: إضافة كود المندوب
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS courier_code VARCHAR(30) NULL;
UPDATE couriers SET courier_code = 'CR-00' || id WHERE courier_code IS NULL;
ALTER TABLE couriers ALTER COLUMN courier_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_couriers_code ON couriers(courier_code);

-- 3. جدول تكويد وسجل العملاء (Customers Directory & History)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    phone_alt VARCHAR(20) NULL,
    city_id INT NOT NULL REFERENCES cities(id),
    zone_id INT NOT NULL REFERENCES zones(id),
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NULL,
    longitude NUMERIC(10, 7) NULL,
    google_maps_url TEXT NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- 4. تحديث جدول الشحنات: تفاصيل الشحنة والمحتوى وخيارات المعاينة واللوكيشن
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_id INT NULL REFERENCES customers(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_description TEXT NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS allow_open_package BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_latitude NUMERIC(10, 7) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_longitude NUMERIC(10, 7) NULL;

-- 5. جدول المصروفات العامة (General Operating Expenses)
CREATE TABLE IF NOT EXISTS general_expenses (
    id BIGSERIAL PRIMARY KEY,
    expense_code VARCHAR(50) NOT NULL UNIQUE,
    branch_id INT NOT NULL REFERENCES branches(id),
    category VARCHAR(100) NOT NULL, -- 'وقود وبنزين', 'صيانة مركبات', 'إيجار فرع', 'نثريات وضيافة', 'بوالص وأدوات مكتبية', 'رواتب وحوافز'
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to VARCHAR(150) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    notes TEXT NULL,
    journal_entry_id BIGINT NULL REFERENCES journal_entries(id),
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. إضافة عملاء تجريبيين
INSERT INTO customers (customer_code, name, phone, city_id, zone_id, address, latitude, longitude, google_maps_url, notes) VALUES
('CUST-0001', 'عمرو خالد عبد الرحمن', '01122334455', 1, 3, 'فيلا 44، حي النرجس، التجمع الخامس', 30.0131000, 31.4294000, 'https://maps.google.com/?q=30.0131,31.4294', 'عميل مميز - يفضل التوصيل مساءً'),
('CUST-0002', 'منى السيد محمود', '01299887766', 1, 2, 'شقة 6، عمارة 8، شارع مكرم عبيد، مدينة نصر', 30.0578000, 31.3411000, 'https://maps.google.com/?q=30.0578,31.3411', 'ممنوع الفتح إلا بعد سداد المبلغ'),
('CUST-0003', 'كريم عادل الشريف', '01077665544', 2, 4, 'شارع البطل أحمد عبد العزيز، المهندسين', 30.0512000, 31.2005000, 'https://maps.google.com/?q=30.0512,31.2005', 'الدفع كاش فقط')
ON CONFLICT (phone) DO NOTHING;

-- 7. تحديث إحداثيات ومواقع التجار والمناديب
UPDATE merchants 
SET latitude = 29.9602, longitude = 31.2569, google_maps_url = 'https://maps.google.com/?q=29.9602,31.2569'
WHERE id = 1;

UPDATE couriers 
SET last_known_lat = 30.0560, last_known_lng = 31.3390, last_location_updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- 8. تحديث تفاصيل الشحنات التجريبية القائمة
UPDATE shipments 
SET package_description = 'سماعات بلوتوث لاسلكية + شاحن سريع 65 واط',
    allow_open_package = true,
    customer_id = 1,
    recipient_latitude = 30.0131,
    recipient_longitude = 31.4294
WHERE id = 1;

UPDATE shipments 
SET package_description = 'فستان سهرة كاجوال قطعتين مقاس L',
    allow_open_package = false,
    customer_id = 2,
    recipient_latitude = 30.0578,
    recipient_longitude = 31.3411
WHERE id = 2;

UPDATE shipments 
SET package_description = 'طقم أدوات صيانة منزلية 120 قطعة ألماني',
    allow_open_package = true,
    customer_id = 3,
    recipient_latitude = 30.0512,
    recipient_longitude = 31.2005
WHERE id = 3;

-- 9. إدخال مصروفات أولية تجريبية
INSERT INTO general_expenses (expense_code, branch_id, category, amount, paid_to, notes, created_by)
VALUES 
('EXP-2026-001', 1, 'وقود وبنزين', 250.00, 'محطة مصر للبترول', 'تفويل دراجات نارية للمناديب بالفرع', 1),
('EXP-2026-002', 1, 'بوالص وأدوات مكتبية', 180.00, 'مكتبة الأهرام', 'شراء رولات ورق حراري لطباعة البوالص', 1)
ON CONFLICT (expense_code) DO NOTHING;

-- 10. موديول الموارد البشرية والرواتب (HR & Payroll Module)
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
    status VARCHAR(30) NOT NULL DEFAULT 'PRESENT',
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
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    cycle_month VARCHAR(7),
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
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
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

INSERT INTO hr_departments (code, name, description)
VALUES 
    ('OPS', 'العمليات واللوجستيات', 'إدارة حركة الشحن، التجهيز، والتوزيع'),
    ('COURIER', 'فريق المناديب والكباتن', 'مندوبو التوصيل والاستلام الميداني'),
    ('FIN', 'الحسابات والمالية', 'الخزينة، تسويات المناديب، ومستحقات التجار'),
    ('CS', 'خدمة العملاء والدعم', 'متابعة الشحنات وتنسيق مواعيد الاستلام'),
    ('MGMT', 'الإدارة العليا والتطوير', 'التخطيط الاستراتيجي ومراقبة الجودة')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_hr_emp_dept ON hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_att_emp_date ON hr_attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_hr_adj_emp_cycle ON hr_salary_adjustments(employee_id, cycle_month);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_items_run ON hr_payroll_items(payroll_run_id);

