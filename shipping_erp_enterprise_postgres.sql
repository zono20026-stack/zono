-- ==============================================================================
-- DATABASE SCHEMA: Easy Send Enterprise ERP (PostgreSQL 15+)
-- High-Concurreny, Scalable, Multi-Tenant Shipping & Double-Entry Accounting
-- Designed for: 1M+ Devices, 20K CCU, Strict Audit & Offline Sync Resilience
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUMS (حالات النظام والقيد المحاسبي والأدوار)
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'SUPER_ADMIN',    -- مدير عام
        'BRANCH_MANAGER', -- مدير فرع
        'ACCOUNTANT',     -- محاسب
        'DATA_ENTRY',     -- موظف إدخال
        'VIEWER',         -- مشاهدة فقط
        'MERCHANT',       -- تاجر
        'COURIER'         -- مندوب
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE shipment_status_enum AS ENUM (
        'NEW',               -- جديدة (طلب التاجر)
        'ASSIGNED',          -- تم التعيين لمندوب
        'PICKED_UP',         -- تم الاستلام في الفرع / من التاجر
        'OUT_FOR_DELIVERY',   -- في الطريق مع المندوب
        'DELIVERED',         -- تم التسليم بنجاح
        'FAILED_DELIVERY',    -- تسليم فاشل (تأجيل / رفض)
        'RETURNED',          -- مرتجع للمخزن / للتاجر
        'CANCELLED'          -- ملغاة
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pod_type_enum AS ENUM ('OTP', 'SIGNATURE', 'PHOTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_type_enum AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. BRANCHES & GEOGRAPHY (الفروع، المدن، والمناطق - قابلة للإدارة ديناميكياً)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    branch_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    branch_id INT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_zone_city UNIQUE (city_id, name)
);

-- جدول تسعير الشحن الديناميكي حسب المناطق والوزن
CREATE TABLE IF NOT EXISTS pricing_rules (
    id SERIAL PRIMARY KEY,
    origin_city_id INT NOT NULL REFERENCES cities(id),
    destination_city_id INT NOT NULL REFERENCES cities(id),
    base_weight_kg NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
    base_price NUMERIC(10, 2) NOT NULL,
    extra_kg_price NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pricing_route UNIQUE (origin_city_id, destination_city_id)
);

-- ------------------------------------------------------------------------------
-- 3. USERS, ROLES, AND SESSIONS (المستخدمون والأمان)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    branch_id INT NULL REFERENCES branches(id) ON DELETE SET NULL,
    role user_role_enum NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(120) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. MERCHANTS & COURIERS (التجار والمناديب مع قيود العهدة وإدارة الحسابات)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    business_name VARCHAR(200) NOT NULL,
    pickup_address TEXT NOT NULL,
    city_id INT NOT NULL REFERENCES cities(id),
    zone_id INT NOT NULL REFERENCES zones(id),
    special_discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS couriers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    national_id VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) NULL, -- 'BIKE', 'MOTORCYCLE', 'VAN', 'CAR'
    vehicle_plate_number VARCHAR(30) NULL,
    branch_id INT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    
    -- إعدادات الأمان ومنع الإسناد في حال تأخر التسوية
    max_unsettled_days INT NOT NULL DEFAULT 2, -- القيمة X المحددة من الإدارة
    max_unsettled_amount NUMERIC(12, 2) NOT NULL DEFAULT 25000.00,
    is_suspended_from_assignment BOOLEAN NOT NULL DEFAULT false,
    
    -- موقع المندوب الحي الأخير (للتوزيع والخرائط)
    last_known_lat NUMERIC(10, 7) NULL,
    last_known_lng NUMERIC(10, 7) NULL,
    last_location_updated_at TIMESTAMPTZ NULL,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. SHIPMENTS & TRACKING (الشحنات، التتبع، وماكينة الحالات)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    tracking_number VARCHAR(50) NOT NULL UNIQUE, -- غير متسلسل وغير قابل للتخمين (مثال: ES-8492-9182)
    public_tracking_token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE, -- رابط التتبع العام المشفر
    
    merchant_id INT NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
    origin_branch_id INT NOT NULL REFERENCES branches(id),
    destination_branch_id INT NOT NULL REFERENCES branches(id),
    assigned_courier_id INT NULL REFERENCES couriers(id) ON DELETE SET NULL,
    
    -- بيانات المستلم (تخضع لحماية البيانات الشخصية قانون 151 لسنة 2020)
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_phone_alt VARCHAR(20) NULL,
    destination_city_id INT NOT NULL REFERENCES cities(id),
    destination_zone_id INT NOT NULL REFERENCES zones(id),
    recipient_address TEXT NOT NULL,
    delivery_notes TEXT NULL,
    
    -- المواصفات والأبعاد
    weight_kg NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
    package_count INT NOT NULL DEFAULT 1,
    
    -- القيم المالية (DECIMAL/NUMERIC بالجنيه المصري)
    goods_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,    -- ثمن البضاعة المطلوب تحصيله (COD)
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,   -- تكلفة الشحن
    total_cod_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- إجمالي المبلغ المطلوب تحصيله من العميل
    actual_cod_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- ما حصله المندوب فعلياً
    
    -- الحالة وماكينة الحالات
    status shipment_status_enum NOT NULL DEFAULT 'NEW',
    failed_attempts_count INT NOT NULL DEFAULT 0,
    scheduled_delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- مزامنة الأوفلاين وضمان عدم التكرار (Idempotency)
    client_mutation_id UUID NULL UNIQUE,
    sync_version INT NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL REFERENCES users(id)
);

-- سجل تاريخ الحالات والمواقع (لا يمكن الحذف منه إطلاقاً)
CREATE TABLE IF NOT EXISTS shipment_status_history (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    from_status shipment_status_enum NULL,
    to_status shipment_status_enum NOT NULL,
    changed_by INT NOT NULL REFERENCES users(id),
    reason TEXT NULL,
    latitude NUMERIC(10, 7) NULL,
    longitude NUMERIC(10, 7) NULL,
    device_timestamp TIMESTAMPTZ NULL, -- وقت العملية على جهاز المندوب في حال الأوفلاين
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- إثبات التسليم الرقمي (POD)
CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE RESTRICT,
    pod_type pod_type_enum NOT NULL,
    otp_code VARCHAR(10) NULL,
    signature_storage_key VARCHAR(255) NULL, -- مفتاح الملف في Object Storage (S3/MinIO)
    photo_storage_key VARCHAR(255) NULL,     -- مفتاح الصورة في Object Storage
    recipient_notes TEXT NULL,
    courier_latitude NUMERIC(10, 7) NULL,
    courier_longitude NUMERIC(10, 7) NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. DOUBLE-ENTRY ACCOUNTING (شجرة الحسابات والقيود المزدوجة - غير قابلة للحذف)
-- ------------------------------------------------------------------------------

-- شجرة الحسابات العامة
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(30) NOT NULL UNIQUE,
    account_name VARCHAR(150) NOT NULL,
    account_type account_type_enum NOT NULL,
    parent_id INT NULL REFERENCES chart_of_accounts(id),
    is_system_locked BOOLEAN NOT NULL DEFAULT false, -- حسابات رئيسية لا تُحذف
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- الفترات المحاسبية وإقفالها
CREATE TABLE IF NOT EXISTS accounting_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL UNIQUE, -- e.g. '2026-10'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMPTZ NULL,
    closed_by INT NULL REFERENCES users(id),
    CONSTRAINT chk_period_dates CHECK (end_date >= start_date)
);

-- رأس القيد اليومي (Journal Entry)
CREATE TABLE IF NOT EXISTS journal_entries (
    id BIGSERIAL PRIMARY KEY,
    entry_number VARCHAR(50) NOT NULL UNIQUE,
    period_id INT NOT NULL REFERENCES accounting_periods(id),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_type VARCHAR(50) NOT NULL, -- 'SHIPMENT_DELIVERY', 'COURIER_CLEARANCE', 'MERCHANT_PAYOUT', 'ADJUSTMENT'
    reference_id BIGINT NULL,
    description TEXT NOT NULL,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversal_entry_id BIGINT NULL REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL REFERENCES users(id)
);

-- أسطر القيد المزدوج (مدين ودائن متزن بالكامل)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id BIGSERIAL PRIMARY KEY,
    journal_entry_id BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
    account_id INT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    merchant_id INT NULL REFERENCES merchants(id),
    courier_id INT NULL REFERENCES couriers(id),
    branch_id INT NOT NULL REFERENCES branches(id),
    line_description VARCHAR(255) NULL,
    
    CONSTRAINT chk_non_negative_amounts CHECK (debit >= 0.00 AND credit >= 0.00),
    CONSTRAINT chk_either_debit_or_credit CHECK (
        (debit > 0.00 AND credit = 0.00) OR
        (credit > 0.00 AND debit = 0.00)
    )
);

-- ------------------------------------------------------------------------------
-- 7. SETTLEMENTS & CLEARANCES (تسوية عهد المناديب ومستحقات التجار)
-- ------------------------------------------------------------------------------

-- تسوية عهدة المندوب اليومية
CREATE TABLE IF NOT EXISTS courier_daily_settlements (
    id BIGSERIAL PRIMARY KEY,
    settlement_code VARCHAR(50) NOT NULL UNIQUE,
    courier_id INT NOT NULL REFERENCES couriers(id),
    branch_id INT NOT NULL REFERENCES branches(id),
    accountant_id INT NOT NULL REFERENCES users(id),
    
    total_cod_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- التحصيلات الفعلية
    approved_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0.00,   -- مصروفات مقبولة
    net_cash_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,   -- المورّد فعلياً للخزينة
    discrepancy_amount NUMERIC(12, 2) GENERATED ALWAYS AS (
        net_cash_received + approved_expenses - total_cod_collected
    ) STORED, -- أي فرق يظهر تلقائياً (سالب = عجز، موجب = زيادة)
    
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    journal_entry_id BIGINT NULL REFERENCES journal_entries(id),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- تسوية مستحقات التاجر المحولة خارج التطبيق
CREATE TABLE IF NOT EXISTS merchant_settlements (
    id BIGSERIAL PRIMARY KEY,
    settlement_code VARCHAR(50) NOT NULL UNIQUE,
    merchant_id INT NOT NULL REFERENCES merchants(id),
    accountant_id INT NOT NULL REFERENCES users(id),
    amount_paid NUMERIC(12, 2) NOT NULL,
    external_transfer_date DATE NOT NULL,
    external_reference_number VARCHAR(100) NOT NULL, -- رقم تحويل بنكي / فودافون كاش
    transfer_channel VARCHAR(50) NOT NULL,           -- 'BANK_TRANSFER', 'INSTAPAY', 'VODAFONE_CASH', 'CASH'
    journal_entry_id BIGINT NULL REFERENCES journal_entries(id),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. AUDIT LOG (سجل التدقيق الشامل غير القابل للتعديل أو الحذف)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,         -- 'INSERT', 'UPDATE', 'DELETE_ATTEMPT', 'STATUS_CHANGE', 'SETTLEMENT'
    table_name VARCHAR(60) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- حماية سجل التدقيق من الحذف أو التعديل بأي وسيلة عبر Trigger
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are strictly immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_logs ON audit_logs;
CREATE TRIGGER trg_protect_audit_logs
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES (فهارس الأداء لسرعة البحث وتفادي بطء ملايين السجلات)
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_public_token ON shipments(public_tracking_token);
CREATE INDEX IF NOT EXISTS idx_shipments_courier_status ON shipments(assigned_courier_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_merchant_created ON shipments(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_status_date ON shipments(status, scheduled_delivery_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_courier ON journal_entry_lines(courier_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_merchant ON journal_entry_lines(merchant_id);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at DESC);
