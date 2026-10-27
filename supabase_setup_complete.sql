-- ==============================================================================
-- ZONO ENTERPRISE SHIPPING ERP: COMPLETE SUPABASE SETUP & SEED
-- ==============================================================================

-- ==============================================================================
-- DATABASE SCHEMA: Easy Send Enterprise ERP (PostgreSQL 15+)
-- High-Concurreny, Scalable, Multi-Tenant Shipping & Double-Entry Accounting
-- Designed for: 1M+ Devices, 20K CCU, Strict Audit & Offline Sync Resilience
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUMS (Ø­Ø§Ù„Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù… ÙˆØ§Ù„Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ ÙˆØ§Ù„Ø£Ø¯ÙˆØ§Ø±)
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'SUPER_ADMIN',    -- Ù…Ø¯ÙŠØ± Ø¹Ø§Ù…
        'BRANCH_MANAGER', -- Ù…Ø¯ÙŠØ± ÙØ±Ø¹
        'ACCOUNTANT',     -- Ù…Ø­Ø§Ø³Ø¨
        'DATA_ENTRY',     -- Ù…ÙˆØ¸Ù Ø¥Ø¯Ø®Ø§Ù„
        'VIEWER',         -- Ù…Ø´Ø§Ù‡Ø¯Ø© ÙÙ‚Ø·
        'MERCHANT',       -- ØªØ§Ø¬Ø±
        'COURIER'         -- Ù…Ù†Ø¯ÙˆØ¨
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE shipment_status_enum AS ENUM (
        'NEW',               -- Ø¬Ø¯ÙŠØ¯Ø© (Ø·Ù„Ø¨ Ø§Ù„ØªØ§Ø¬Ø±)
        'ASSIGNED',          -- ØªÙ… Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ù„Ù…Ù†Ø¯ÙˆØ¨
        'PICKED_UP',         -- ØªÙ… Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… ÙÙŠ Ø§Ù„ÙØ±Ø¹ / Ù…Ù† Ø§Ù„ØªØ§Ø¬Ø±
        'OUT_FOR_DELIVERY',   -- ÙÙŠ Ø§Ù„Ø·Ø±ÙŠÙ‚ Ù…Ø¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨
        'DELIVERED',         -- ØªÙ… Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø¨Ù†Ø¬Ø§Ø­
        'FAILED_DELIVERY',    -- ØªØ³Ù„ÙŠÙ… ÙØ§Ø´Ù„ (ØªØ£Ø¬ÙŠÙ„ / Ø±ÙØ¶)
        'RETURNED',          -- Ù…Ø±ØªØ¬Ø¹ Ù„Ù„Ù…Ø®Ø²Ù† / Ù„Ù„ØªØ§Ø¬Ø±
        'CANCELLED'          -- Ù…Ù„ØºØ§Ø©
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
-- 2. BRANCHES & GEOGRAPHY (Ø§Ù„ÙØ±ÙˆØ¹ØŒ Ø§Ù„Ù…Ø¯Ù†ØŒ ÙˆØ§Ù„Ù…Ù†Ø§Ø·Ù‚ - Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø¥Ø¯Ø§Ø±Ø© Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠØ§Ù‹)
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

-- Ø¬Ø¯ÙˆÙ„ ØªØ³Ø¹ÙŠØ± Ø§Ù„Ø´Ø­Ù† Ø§Ù„Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠ Ø­Ø³Ø¨ Ø§Ù„Ù…Ù†Ø§Ø·Ù‚ ÙˆØ§Ù„ÙˆØ²Ù†
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
-- 3. USERS, ROLES, AND SESSIONS (Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† ÙˆØ§Ù„Ø£Ù…Ø§Ù†)
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
-- 4. MERCHANTS & COURIERS (Ø§Ù„ØªØ¬Ø§Ø± ÙˆØ§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨ Ù…Ø¹ Ù‚ÙŠÙˆØ¯ Ø§Ù„Ø¹Ù‡Ø¯Ø© ÙˆØ¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª)
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
    
    -- Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø£Ù…Ø§Ù† ÙˆÙ…Ù†Ø¹ Ø§Ù„Ø¥Ø³Ù†Ø§Ø¯ ÙÙŠ Ø­Ø§Ù„ ØªØ£Ø®Ø± Ø§Ù„ØªØ³ÙˆÙŠØ©
    max_unsettled_days INT NOT NULL DEFAULT 2, -- Ø§Ù„Ù‚ÙŠÙ…Ø© X Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ù…Ù† Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©
    max_unsettled_amount NUMERIC(12, 2) NOT NULL DEFAULT 25000.00,
    is_suspended_from_assignment BOOLEAN NOT NULL DEFAULT false,
    
    -- Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ø­ÙŠ Ø§Ù„Ø£Ø®ÙŠØ± (Ù„Ù„ØªÙˆØ²ÙŠØ¹ ÙˆØ§Ù„Ø®Ø±Ø§Ø¦Ø·)
    last_known_lat NUMERIC(10, 7) NULL,
    last_known_lng NUMERIC(10, 7) NULL,
    last_location_updated_at TIMESTAMPTZ NULL,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. SHIPMENTS & TRACKING (Ø§Ù„Ø´Ø­Ù†Ø§ØªØŒ Ø§Ù„ØªØªØ¨Ø¹ØŒ ÙˆÙ…Ø§ÙƒÙŠÙ†Ø© Ø§Ù„Ø­Ø§Ù„Ø§Øª)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    tracking_number VARCHAR(50) NOT NULL UNIQUE, -- ØºÙŠØ± Ù…ØªØ³Ù„Ø³Ù„ ÙˆØºÙŠØ± Ù‚Ø§Ø¨Ù„ Ù„Ù„ØªØ®Ù…ÙŠÙ† (Ù…Ø«Ø§Ù„: ES-8492-9182)
    public_tracking_token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE, -- Ø±Ø§Ø¨Ø· Ø§Ù„ØªØªØ¨Ø¹ Ø§Ù„Ø¹Ø§Ù… Ø§Ù„Ù…Ø´ÙØ±
    
    merchant_id INT NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
    origin_branch_id INT NOT NULL REFERENCES branches(id),
    destination_branch_id INT NOT NULL REFERENCES branches(id),
    assigned_courier_id INT NULL REFERENCES couriers(id) ON DELETE SET NULL,
    
    -- Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªÙ„Ù… (ØªØ®Ø¶Ø¹ Ù„Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ© Ù‚Ø§Ù†ÙˆÙ† 151 Ù„Ø³Ù†Ø© 2020)
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_phone_alt VARCHAR(20) NULL,
    destination_city_id INT NOT NULL REFERENCES cities(id),
    destination_zone_id INT NOT NULL REFERENCES zones(id),
    recipient_address TEXT NOT NULL,
    delivery_notes TEXT NULL,
    
    -- Ø§Ù„Ù…ÙˆØ§ØµÙØ§Øª ÙˆØ§Ù„Ø£Ø¨Ø¹Ø§Ø¯
    weight_kg NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
    package_count INT NOT NULL DEFAULT 1,
    
    -- Ø§Ù„Ù‚ÙŠÙ… Ø§Ù„Ù…Ø§Ù„ÙŠØ© (DECIMAL/NUMERIC Ø¨Ø§Ù„Ø¬Ù†ÙŠÙ‡ Ø§Ù„Ù…ØµØ±ÙŠ)
    goods_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,    -- Ø«Ù…Ù† Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ ØªØ­ØµÙŠÙ„Ù‡ (COD)
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,   -- ØªÙƒÙ„ÙØ© Ø§Ù„Ø´Ø­Ù†
    total_cod_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ ØªØ­ØµÙŠÙ„Ù‡ Ù…Ù† Ø§Ù„Ø¹Ù…ÙŠÙ„
    actual_cod_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Ù…Ø§ Ø­ØµÙ„Ù‡ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ ÙØ¹Ù„ÙŠØ§Ù‹
    
    -- Ø§Ù„Ø­Ø§Ù„Ø© ÙˆÙ…Ø§ÙƒÙŠÙ†Ø© Ø§Ù„Ø­Ø§Ù„Ø§Øª
    status shipment_status_enum NOT NULL DEFAULT 'NEW',
    failed_attempts_count INT NOT NULL DEFAULT 0,
    scheduled_delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø£ÙˆÙÙ„Ø§ÙŠÙ† ÙˆØ¶Ù…Ø§Ù† Ø¹Ø¯Ù… Ø§Ù„ØªÙƒØ±Ø§Ø± (Idempotency)
    client_mutation_id UUID NULL UNIQUE,
    sync_version INT NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL REFERENCES users(id)
);

-- Ø³Ø¬Ù„ ØªØ§Ø±ÙŠØ® Ø§Ù„Ø­Ø§Ù„Ø§Øª ÙˆØ§Ù„Ù…ÙˆØ§Ù‚Ø¹ (Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„Ø­Ø°Ù Ù…Ù†Ù‡ Ø¥Ø·Ù„Ø§Ù‚Ø§Ù‹)
CREATE TABLE IF NOT EXISTS shipment_status_history (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    from_status shipment_status_enum NULL,
    to_status shipment_status_enum NOT NULL,
    changed_by INT NOT NULL REFERENCES users(id),
    reason TEXT NULL,
    latitude NUMERIC(10, 7) NULL,
    longitude NUMERIC(10, 7) NULL,
    device_timestamp TIMESTAMPTZ NULL, -- ÙˆÙ‚Øª Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ø¹Ù„Ù‰ Ø¬Ù‡Ø§Ø² Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ ÙÙŠ Ø­Ø§Ù„ Ø§Ù„Ø£ÙˆÙÙ„Ø§ÙŠÙ†
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ø¥Ø«Ø¨Ø§Øª Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø§Ù„Ø±Ù‚Ù…ÙŠ (POD)
CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE RESTRICT,
    pod_type pod_type_enum NOT NULL,
    otp_code VARCHAR(10) NULL,
    signature_storage_key VARCHAR(255) NULL, -- Ù…ÙØªØ§Ø­ Ø§Ù„Ù…Ù„Ù ÙÙŠ Object Storage (S3/MinIO)
    photo_storage_key VARCHAR(255) NULL,     -- Ù…ÙØªØ§Ø­ Ø§Ù„ØµÙˆØ±Ø© ÙÙŠ Object Storage
    recipient_notes TEXT NULL,
    courier_latitude NUMERIC(10, 7) NULL,
    courier_longitude NUMERIC(10, 7) NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. DOUBLE-ENTRY ACCOUNTING (Ø´Ø¬Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙˆØ§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø²Ø¯ÙˆØ¬Ø© - ØºÙŠØ± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø­Ø°Ù)
-- ------------------------------------------------------------------------------

-- Ø´Ø¬Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø¹Ø§Ù…Ø©
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(30) NOT NULL UNIQUE,
    account_name VARCHAR(150) NOT NULL,
    account_type account_type_enum NOT NULL,
    parent_id INT NULL REFERENCES chart_of_accounts(id),
    is_system_locked BOOLEAN NOT NULL DEFAULT false, -- Ø­Ø³Ø§Ø¨Ø§Øª Ø±Ø¦ÙŠØ³ÙŠØ© Ù„Ø§ ØªÙØ­Ø°Ù
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ø§Ù„ÙØªØ±Ø§Øª Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ© ÙˆØ¥Ù‚ÙØ§Ù„Ù‡Ø§
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

-- Ø±Ø£Ø³ Ø§Ù„Ù‚ÙŠØ¯ Ø§Ù„ÙŠÙˆÙ…ÙŠ (Journal Entry)
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

-- Ø£Ø³Ø·Ø± Ø§Ù„Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø²Ø¯ÙˆØ¬ (Ù…Ø¯ÙŠÙ† ÙˆØ¯Ø§Ø¦Ù† Ù…ØªØ²Ù† Ø¨Ø§Ù„ÙƒØ§Ù…Ù„)
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
-- 7. SETTLEMENTS & CLEARANCES (ØªØ³ÙˆÙŠØ© Ø¹Ù‡Ø¯ Ø§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨ ÙˆÙ…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„ØªØ¬Ø§Ø±)
-- ------------------------------------------------------------------------------

-- ØªØ³ÙˆÙŠØ© Ø¹Ù‡Ø¯Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„ÙŠÙˆÙ…ÙŠØ©
CREATE TABLE IF NOT EXISTS courier_daily_settlements (
    id BIGSERIAL PRIMARY KEY,
    settlement_code VARCHAR(50) NOT NULL UNIQUE,
    courier_id INT NOT NULL REFERENCES couriers(id),
    branch_id INT NOT NULL REFERENCES branches(id),
    accountant_id INT NOT NULL REFERENCES users(id),
    
    total_cod_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Ø§Ù„ØªØ­ØµÙŠÙ„Ø§Øª Ø§Ù„ÙØ¹Ù„ÙŠØ©
    approved_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0.00,   -- Ù…ØµØ±ÙˆÙØ§Øª Ù…Ù‚Ø¨ÙˆÙ„Ø©
    net_cash_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,   -- Ø§Ù„Ù…ÙˆØ±Ù‘Ø¯ ÙØ¹Ù„ÙŠØ§Ù‹ Ù„Ù„Ø®Ø²ÙŠÙ†Ø©
    discrepancy_amount NUMERIC(12, 2) GENERATED ALWAYS AS (
        net_cash_received + approved_expenses - total_cod_collected
    ) STORED, -- Ø£ÙŠ ÙØ±Ù‚ ÙŠØ¸Ù‡Ø± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ (Ø³Ø§Ù„Ø¨ = Ø¹Ø¬Ø²ØŒ Ù…ÙˆØ¬Ø¨ = Ø²ÙŠØ§Ø¯Ø©)
    
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    journal_entry_id BIGINT NULL REFERENCES journal_entries(id),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ØªØ³ÙˆÙŠØ© Ù…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„ØªØ§Ø¬Ø± Ø§Ù„Ù…Ø­ÙˆÙ„Ø© Ø®Ø§Ø±Ø¬ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚
CREATE TABLE IF NOT EXISTS merchant_settlements (
    id BIGSERIAL PRIMARY KEY,
    settlement_code VARCHAR(50) NOT NULL UNIQUE,
    merchant_id INT NOT NULL REFERENCES merchants(id),
    accountant_id INT NOT NULL REFERENCES users(id),
    amount_paid NUMERIC(12, 2) NOT NULL,
    external_transfer_date DATE NOT NULL,
    external_reference_number VARCHAR(100) NOT NULL, -- Ø±Ù‚Ù… ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ / ÙÙˆØ¯Ø§ÙÙˆÙ† ÙƒØ§Ø´
    transfer_channel VARCHAR(50) NOT NULL,           -- 'BANK_TRANSFER', 'INSTAPAY', 'VODAFONE_CASH', 'CASH'
    journal_entry_id BIGINT NULL REFERENCES journal_entries(id),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. AUDIT LOG (Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ Ø§Ù„Ø´Ø§Ù…Ù„ ØºÙŠØ± Ø§Ù„Ù‚Ø§Ø¨Ù„ Ù„Ù„ØªØ¹Ø¯ÙŠÙ„ Ø£Ùˆ Ø§Ù„Ø­Ø°Ù)
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

-- Ø­Ù…Ø§ÙŠØ© Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ Ù…Ù† Ø§Ù„Ø­Ø°Ù Ø£Ùˆ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø¨Ø£ÙŠ ÙˆØ³ÙŠÙ„Ø© Ø¹Ø¨Ø± Trigger
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
-- 9. PERFORMANCE INDEXES (ÙÙ‡Ø§Ø±Ø³ Ø§Ù„Ø£Ø¯Ø§Ø¡ Ù„Ø³Ø±Ø¹Ø© Ø§Ù„Ø¨Ø­Ø« ÙˆØªÙØ§Ø¯ÙŠ Ø¨Ø·Ø¡ Ù…Ù„Ø§ÙŠÙŠÙ† Ø§Ù„Ø³Ø¬Ù„Ø§Øª)
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


-- ------------------------------------------------------------------------------
-- DIRECTORY & GPS EXTENSIONS
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: Directory Coding, Customer History, Expenses, and GPS Locations
-- ==============================================================================

-- 1. ØªØ­Ø¯ÙŠØ« Ø¬Ø¯ÙˆÙ„ Ø§Ù„ØªØ¬Ø§Ø±: Ø¥Ø¶Ø§ÙØ© ÙƒÙˆØ¯ Ø§Ù„ØªØ§Ø¬Ø± ÙˆØ¥Ø­Ø¯Ø§Ø«ÙŠØ§Øª Ø§Ù„Ù„ÙˆÙƒÙŠØ´Ù†
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_code VARCHAR(30) NULL;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) NULL;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) NULL;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_maps_url TEXT NULL;

UPDATE merchants SET merchant_code = 'MRC-00' || id WHERE merchant_code IS NULL;
ALTER TABLE merchants ALTER COLUMN merchant_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_code ON merchants(merchant_code);

-- 2. ØªØ­Ø¯ÙŠØ« Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨: Ø¥Ø¶Ø§ÙØ© ÙƒÙˆØ¯ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS courier_code VARCHAR(30) NULL;
UPDATE couriers SET courier_code = 'CR-00' || id WHERE courier_code IS NULL;
ALTER TABLE couriers ALTER COLUMN courier_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_couriers_code ON couriers(courier_code);

-- 3. Ø¬Ø¯ÙˆÙ„ ØªÙƒÙˆÙŠØ¯ ÙˆØ³Ø¬Ù„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ (Customers Directory & History)
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

-- 4. ØªØ­Ø¯ÙŠØ« Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø´Ø­Ù†Ø§Øª: ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø´Ø­Ù†Ø© ÙˆØ§Ù„Ù…Ø­ØªÙˆÙ‰ ÙˆØ®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© ÙˆØ§Ù„Ù„ÙˆÙƒÙŠØ´Ù†
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_id INT NULL REFERENCES customers(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_description TEXT NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS allow_open_package BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_latitude NUMERIC(10, 7) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_longitude NUMERIC(10, 7) NULL;

-- 5. Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø¹Ø§Ù…Ø© (General Operating Expenses)
CREATE TABLE IF NOT EXISTS general_expenses (
    id BIGSERIAL PRIMARY KEY,
    expense_code VARCHAR(50) NOT NULL UNIQUE,
    branch_id INT NOT NULL REFERENCES branches(id),
    category VARCHAR(100) NOT NULL, -- 'ÙˆÙ‚ÙˆØ¯ ÙˆØ¨Ù†Ø²ÙŠÙ†', 'ØµÙŠØ§Ù†Ø© Ù…Ø±ÙƒØ¨Ø§Øª', 'Ø¥ÙŠØ¬Ø§Ø± ÙØ±Ø¹', 'Ù†Ø«Ø±ÙŠØ§Øª ÙˆØ¶ÙŠØ§ÙØ©', 'Ø¨ÙˆØ§Ù„Øµ ÙˆØ£Ø¯ÙˆØ§Øª Ù…ÙƒØªØ¨ÙŠØ©', 'Ø±ÙˆØ§ØªØ¨ ÙˆØ­ÙˆØ§ÙØ²'
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to VARCHAR(150) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    notes TEXT NULL,
    journal_entry_id BIGINT NULL REFERENCES journal_entries(id),
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Ø¥Ø¶Ø§ÙØ© Ø¹Ù…Ù„Ø§Ø¡ ØªØ¬Ø±ÙŠØ¨ÙŠÙŠÙ†
INSERT INTO customers (customer_code, name, phone, city_id, zone_id, address, latitude, longitude, google_maps_url, notes) VALUES
('CUST-0001', 'Ø¹Ù…Ø±Ùˆ Ø®Ø§Ù„Ø¯ Ø¹Ø¨Ø¯ Ø§Ù„Ø±Ø­Ù…Ù†', '01122334455', 1, 3, 'ÙÙŠÙ„Ø§ 44ØŒ Ø­ÙŠ Ø§Ù„Ù†Ø±Ø¬Ø³ØŒ Ø§Ù„ØªØ¬Ù…Ø¹ Ø§Ù„Ø®Ø§Ù…Ø³', 30.0131000, 31.4294000, 'https://maps.google.com/?q=30.0131,31.4294', 'Ø¹Ù…ÙŠÙ„ Ù…Ù…ÙŠØ² - ÙŠÙØ¶Ù„ Ø§Ù„ØªÙˆØµÙŠÙ„ Ù…Ø³Ø§Ø¡Ù‹'),
('CUST-0002', 'Ù…Ù†Ù‰ Ø§Ù„Ø³ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯', '01299887766', 1, 2, 'Ø´Ù‚Ø© 6ØŒ Ø¹Ù…Ø§Ø±Ø© 8ØŒ Ø´Ø§Ø±Ø¹ Ù…ÙƒØ±Ù… Ø¹Ø¨ÙŠØ¯ØŒ Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±', 30.0578000, 31.3411000, 'https://maps.google.com/?q=30.0578,31.3411', 'Ù…Ù…Ù†ÙˆØ¹ Ø§Ù„ÙØªØ­ Ø¥Ù„Ø§ Ø¨Ø¹Ø¯ Ø³Ø¯Ø§Ø¯ Ø§Ù„Ù…Ø¨Ù„Øº'),
('CUST-0003', 'ÙƒØ±ÙŠÙ… Ø¹Ø§Ø¯Ù„ Ø§Ù„Ø´Ø±ÙŠÙ', '01077665544', 2, 4, 'Ø´Ø§Ø±Ø¹ Ø§Ù„Ø¨Ø·Ù„ Ø£Ø­Ù…Ø¯ Ø¹Ø¨Ø¯ Ø§Ù„Ø¹Ø²ÙŠØ²ØŒ Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†', 30.0512000, 31.2005000, 'https://maps.google.com/?q=30.0512,31.2005', 'Ø§Ù„Ø¯ÙØ¹ ÙƒØ§Ø´ ÙÙ‚Ø·')
ON CONFLICT (phone) DO NOTHING;

-- 7. ØªØ­Ø¯ÙŠØ« Ø¥Ø­Ø¯Ø§Ø«ÙŠØ§Øª ÙˆÙ…ÙˆØ§Ù‚Ø¹ Ø§Ù„ØªØ¬Ø§Ø± ÙˆØ§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨
UPDATE merchants 
SET latitude = 29.9602, longitude = 31.2569, google_maps_url = 'https://maps.google.com/?q=29.9602,31.2569'
WHERE id = 1;

UPDATE couriers 
SET last_known_lat = 30.0560, last_known_lng = 31.3390, last_location_updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- 8. ØªØ­Ø¯ÙŠØ« ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø´Ø­Ù†Ø§Øª Ø§Ù„ØªØ¬Ø±ÙŠØ¨ÙŠØ© Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©
UPDATE shipments 
SET package_description = 'Ø³Ù…Ø§Ø¹Ø§Øª Ø¨Ù„ÙˆØªÙˆØ« Ù„Ø§Ø³Ù„ÙƒÙŠØ© + Ø´Ø§Ø­Ù† Ø³Ø±ÙŠØ¹ 65 ÙˆØ§Ø·',
    allow_open_package = true,
    customer_id = 1,
    recipient_latitude = 30.0131,
    recipient_longitude = 31.4294
WHERE id = 1;

UPDATE shipments 
SET package_description = 'ÙØ³ØªØ§Ù† Ø³Ù‡Ø±Ø© ÙƒØ§Ø¬ÙˆØ§Ù„ Ù‚Ø·Ø¹ØªÙŠÙ† Ù…Ù‚Ø§Ø³ L',
    allow_open_package = false,
    customer_id = 2,
    recipient_latitude = 30.0578,
    recipient_longitude = 31.3411
WHERE id = 2;

UPDATE shipments 
SET package_description = 'Ø·Ù‚Ù… Ø£Ø¯ÙˆØ§Øª ØµÙŠØ§Ù†Ø© Ù…Ù†Ø²Ù„ÙŠØ© 120 Ù‚Ø·Ø¹Ø© Ø£Ù„Ù…Ø§Ù†ÙŠ',
    allow_open_package = true,
    customer_id = 3,
    recipient_latitude = 30.0512,
    recipient_longitude = 31.2005
WHERE id = 3;

-- 9. Ø¥Ø¯Ø®Ø§Ù„ Ù…ØµØ±ÙˆÙØ§Øª Ø£ÙˆÙ„ÙŠØ© ØªØ¬Ø±ÙŠØ¨ÙŠØ©
INSERT INTO general_expenses (expense_code, branch_id, category, amount, paid_to, notes, created_by)
VALUES 
('EXP-2026-001', 1, 'ÙˆÙ‚ÙˆØ¯ ÙˆØ¨Ù†Ø²ÙŠÙ†', 250.00, 'Ù…Ø­Ø·Ø© Ù…ØµØ± Ù„Ù„Ø¨ØªØ±ÙˆÙ„', 'ØªÙÙˆÙŠÙ„ Ø¯Ø±Ø§Ø¬Ø§Øª Ù†Ø§Ø±ÙŠØ© Ù„Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨ Ø¨Ø§Ù„ÙØ±Ø¹', 1),
('EXP-2026-002', 1, 'Ø¨ÙˆØ§Ù„Øµ ÙˆØ£Ø¯ÙˆØ§Øª Ù…ÙƒØªØ¨ÙŠØ©', 180.00, 'Ù…ÙƒØªØ¨Ø© Ø§Ù„Ø£Ù‡Ø±Ø§Ù…', 'Ø´Ø±Ø§Ø¡ Ø±ÙˆÙ„Ø§Øª ÙˆØ±Ù‚ Ø­Ø±Ø§Ø±ÙŠ Ù„Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø¨ÙˆØ§Ù„Øµ', 1)
ON CONFLICT (expense_code) DO NOTHING;


-- ------------------------------------------------------------------------------
-- MASTER SEED DATA
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- SEED DATA: Easy Send Enterprise ERP (Initial Master Data & Accounts)
-- ==============================================================================

-- 1. ÙØ±ÙˆØ¹ Ø§Ù„Ø´Ø±ÙƒØ©
INSERT INTO branches (branch_code, name, phone, address) VALUES
('CAI-01', 'ÙØ±Ø¹ Ø§Ù„Ù‚Ø§Ù‡Ø±Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ', '01011112233', 'Ø´Ø§Ø±Ø¹ Ø§Ù„ØªØ³Ø¹ÙŠÙ† Ø§Ù„Ø¬Ù†ÙˆØ¨ÙŠØŒ Ø§Ù„ØªØ¬Ù…Ø¹ Ø§Ù„Ø®Ø§Ù…Ø³ØŒ Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©'),
('GIZ-01', 'ÙØ±Ø¹ Ø§Ù„Ø¬ÙŠØ²Ø©', '01022223344', 'Ø´Ø§Ø±Ø¹ Ù…ØµØ¯Ù‚ØŒ Ø§Ù„Ø¯Ù‚ÙŠØŒ Ø§Ù„Ø¬ÙŠØ²Ø©'),
('ALX-01', 'ÙØ±Ø¹ Ø§Ù„Ø¥Ø³ÙƒÙ†Ø¯Ø±ÙŠØ©', '01033334455', 'Ø´Ø§Ø±Ø¹ ÙÙˆØ²ÙŠ Ù…Ø¹Ø§Ø°ØŒ Ø³Ù…ÙˆØ­Ø©ØŒ Ø§Ù„Ø¥Ø³ÙƒÙ†Ø¯Ø±ÙŠØ©')
ON CONFLICT (branch_code) DO NOTHING;

-- 2. Ø§Ù„Ù…Ø¯Ù† ÙˆØ§Ù„Ù…Ù†Ø§Ø·Ù‚
INSERT INTO cities (name, branch_id) VALUES
('Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©', 1),
('Ø§Ù„Ø¬ÙŠØ²Ø©', 2),
('Ø§Ù„Ø¥Ø³ÙƒÙ†Ø¯Ø±ÙŠØ©', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO zones (city_id, name) VALUES
(1, 'Ø§Ù„Ù…Ø¹Ø§Ø¯ÙŠ'),
(1, 'Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±'),
(1, 'Ø§Ù„ØªØ¬Ù…Ø¹ Ø§Ù„Ø®Ø§Ù…Ø³'),
(2, 'Ø§Ù„Ø¯Ù‚ÙŠ ÙˆØ§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†'),
(2, 'Ù…Ø¯ÙŠÙ†Ø© 6 Ø£ÙƒØªÙˆØ¨Ø±'),
(3, 'Ø³Ù…ÙˆØ­Ø©'),
(3, 'Ø³ÙŠØ¯ÙŠ Ø¬Ø§Ø¨Ø±')
ON CONFLICT (city_id, name) DO NOTHING;

-- 3. Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„ØªØ³Ø¹ÙŠØ±
INSERT INTO pricing_rules (origin_city_id, destination_city_id, base_weight_kg, base_price, extra_kg_price) VALUES
(1, 1, 1.00, 45.00, 5.00),
(1, 2, 1.00, 50.00, 5.00),
(1, 3, 1.00, 75.00, 10.00),
(2, 1, 1.00, 50.00, 5.00),
(2, 2, 1.00, 45.00, 5.00),
(3, 1, 1.00, 75.00, 10.00)
ON CONFLICT (origin_city_id, destination_city_id) DO NOTHING;

-- 4. Ø´Ø¬Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª (Chart of Accounts)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_system_locked) VALUES
('1010', 'Ø®Ø²ÙŠÙ†Ø© Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© (Ø§Ù„Ù†Ù‚Ø¯ÙŠØ©)', 'ASSET', true),
('1020', 'Ø¹Ù‡Ø¯ Ø§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨ Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© (ØªØ­ØµÙŠÙ„Ø§Øª COD Ù…Ø¹Ù„Ù‚Ø©)', 'ASSET', true),
('2010', 'Ø£Ù…Ø§Ù†Ø§Øª ÙˆÙ…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„ØªØ¬Ø§Ø± Ø§Ù„Ø¯Ø§Ø¦Ù†Ø©', 'LIABILITY', true),
('4010', 'Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø´Ø­Ù† ÙˆØ§Ù„ØªÙˆØµÙŠÙ„', 'REVENUE', true),
('5010', 'Ù…ØµØ±ÙˆÙØ§Øª ØªØ´ØºÙŠÙ„ÙŠØ© ÙˆÙ†Ø«Ø±ÙŠØ§Øª Ø§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨', 'EXPENSE', true)
ON CONFLICT (account_code) DO NOTHING;

-- 5. Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ©
INSERT INTO accounting_periods (period_name, start_date, end_date, is_closed) VALUES
('2026-10', '2026-10-01', '2026-10-31', false)
ON CONFLICT (period_name) DO NOTHING;

-- 6. Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† Ø§Ù„Ø£ÙˆØ§Ø¦Ù„ (Password: Admin@123456 Ù…Ø´ÙØ±Ø© Ø¨Ù€ bcrypt)
-- Using pgcrypto crypt function for reliable hash
INSERT INTO users (branch_id, role, full_name, phone, email, password_hash) VALUES
(1, 'SUPER_ADMIN', 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø£Ø­Ù…Ø¯ Ù…ØµØ·ÙÙ‰ (Ø§Ù„Ù…Ø¯ÙŠØ± Ø§Ù„Ø¹Ø§Ù…)', '01000000001', 'admin@easysend.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'ACCOUNTANT', 'Ø£/ Ù…Ø­Ù…ÙˆØ¯ Ø­Ø³Ù† (Ø±Ø¦ÙŠØ³ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª)', '01000000002', 'accountant@easysend.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'DATA_ENTRY', 'Ø£/ Ø³Ø§Ø±Ø© Ø¹Ù„ÙŠ (Ù…ÙˆØ¸Ù Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ù…Ù„ÙŠØ§Øª)', '01000000003', 'dataentry@easysend.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'MERCHANT', 'Ù…ØªØ¬Ø± Ø§Ù„ØªÙ‚Ù†ÙŠØ© Ø§Ù„Ø­Ø¯ÙŠØ«Ø© (Ø§Ù„ØªØ§Ø¬Ø±)', '01000000004', 'merchant@techshop.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'COURIER', 'ÙƒØ§Ø¨ØªÙ† / Ù…Ø­Ù…Ø¯ Ø¥Ø¨Ø±Ø§Ù‡ÙŠÙ… (Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨)', '01000000005', 'courier@easysend.com', crypt('Admin@123456', gen_salt('bf', 10)))
ON CONFLICT (phone) DO NOTHING;

-- 7. Ø±Ø¨Ø· Ø§Ù„ØªØ§Ø¬Ø± ÙˆØ§Ù„Ù…Ù†Ø¯ÙˆØ¨
INSERT INTO merchants (user_id, business_name, pickup_address, city_id, zone_id)
SELECT id, 'Ù…ØªØ¬Ø± Ø§Ù„ØªÙ‚Ù†ÙŠØ© Ø§Ù„Ø­Ø¯ÙŠØ«Ø©', 'Ø¹Ù…Ø§Ø±Ø© 12ØŒ Ø´Ø§Ø±Ø¹ Ø§Ù„Ù†ØµØ±ØŒ Ø§Ù„Ù…Ø¹Ø§Ø¯ÙŠ', 1, 1
FROM users WHERE phone = '01000000004'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO couriers (user_id, national_id, vehicle_type, vehicle_plate_number, branch_id, max_unsettled_days)
SELECT id, '29501011234567', 'MOTORCYCLE', 'Ù‚ Ø¯ Ø³ 918', 1, 2
FROM users WHERE phone = '01000000005'
ON CONFLICT (user_id) DO NOTHING;

-- 8. Ø´Ø­Ù†Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ© ÙÙŠ Ø­Ø§Ù„Ø§Øª Ù…Ø®ØªÙ„ÙØ© Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø­ÙŠØ§Ø©
INSERT INTO shipments (
    tracking_number, merchant_id, origin_branch_id, destination_branch_id, assigned_courier_id,
    recipient_name, recipient_phone, destination_city_id, destination_zone_id, recipient_address,
    delivery_notes, weight_kg, package_count, goods_value, shipping_fee, total_cod_amount,
    actual_cod_collected, status, scheduled_delivery_date, created_by
) VALUES
(
    'ES-9182-3401', 1, 1, 1, 1,
    'Ø¹Ù…Ø±Ùˆ Ø®Ø§Ù„Ø¯ Ø¹Ø¨Ø¯ Ø§Ù„Ø±Ø­Ù…Ù†', '01122334455', 1, 3, 'ÙÙŠÙ„Ø§ 44ØŒ Ø­ÙŠ Ø§Ù„Ù†Ø±Ø¬Ø³ØŒ Ø§Ù„ØªØ¬Ù…Ø¹ Ø§Ù„Ø®Ø§Ù…Ø³',
    'Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ù„Ø§ØªØµØ§Ù„ Ù‚Ø¨Ù„ Ø§Ù„ÙˆØµÙˆÙ„ Ø¨Ù†ØµÙ Ø³Ø§Ø¹Ø©', 2.50, 1, 1450.00, 50.00, 1500.00,
    1500.00, 'DELIVERED', CURRENT_DATE, 1
),
(
    'ES-4820-1192', 1, 1, 1, 1,
    'Ù…Ù†Ù‰ Ø§Ù„Ø³ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯', '01299887766', 1, 2, 'Ø´Ù‚Ø© 6ØŒ Ø¹Ù…Ø§Ø±Ø© 8ØŒ Ø´Ø§Ø±Ø¹ Ù…ÙƒØ±Ù… Ø¹Ø¨ÙŠØ¯ØŒ Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±',
    'Ù…Ù…Ù†ÙˆØ¹ ÙØªØ­ Ø§Ù„Ø´Ø­Ù†Ø© Ø¥Ù„Ø§ Ø¨Ø¹Ø¯ Ø³Ø¯Ø§Ø¯ Ø§Ù„Ù‚ÙŠÙ…Ø©', 1.00, 1, 850.00, 45.00, 895.00,
    0.00, 'OUT_FOR_DELIVERY', CURRENT_DATE, 1
),
(
    'ES-7712-9023', 1, 1, 2, NULL,
    'ÙƒØ±ÙŠÙ… Ø¹Ø§Ø¯Ù„ Ø§Ù„Ø´Ø±ÙŠÙ', '01077665544', 2, 4, 'Ø´Ø§Ø±Ø¹ Ø§Ù„Ø¨Ø·Ù„ Ø£Ø­Ù…Ø¯ Ø¹Ø¨Ø¯ Ø§Ù„Ø¹Ø²ÙŠØ²ØŒ Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†',
    'Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø¨Ø¹Ø¯ Ø§Ù„Ø³Ø§Ø¹Ø© 4 Ø¹ØµØ±Ø§Ù‹', 3.00, 2, 2200.00, 50.00, 2250.00,
    0.00, 'NEW', CURRENT_DATE, 1
)
ON CONFLICT (tracking_number) DO NOTHING;

-- 9. Ø¥Ø«Ø¨Ø§Øª ØªØ³Ù„ÙŠÙ… Ø§Ù„Ø´Ø­Ù†Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ (DELIVERED)
INSERT INTO proof_of_delivery (
    shipment_id, pod_type, otp_code, recipient_notes, courier_latitude, courier_longitude
) VALUES
(
    1, 'OTP', '8492', 'ØªÙ… Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… Ø¨Ø­Ø§Ù„Ø© Ù…Ù…ØªØ§Ø²Ø© ÙˆØªØ¬Ø±Ø¨Ø© Ø§Ù„Ù…Ù†ØªØ¬', 30.0131, 31.4294
)
ON CONFLICT (shipment_id) DO NOTHING;

-- 10. Ù‚ÙŠØ¯ Ù…Ø­Ø§Ø³Ø¨ÙŠ Ù…Ø²Ø¯ÙˆØ¬ Ù…ØªØ²Ù† Ù„ØªØ³Ù„ÙŠÙ… Ø§Ù„Ø´Ø­Ù†Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ (ES-9182-3401)
-- Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø­ØµÙ„ 1500 Ø¬Ù†ÙŠÙ‡: ØªØµØ¨Ø­ Ø¹Ù‡Ø¯Ø© Ø¹Ù„ÙŠÙ‡ (Ù…Ø¯ÙŠÙ† 1500)ØŒ Ø§Ù„ØªØ§Ø¬Ø± ÙŠØ³ØªØ­Ù‚ 1450 (Ø¯Ø§Ø¦Ù† 1450)ØŒ Ø¥ÙŠØ±Ø§Ø¯ Ø§Ù„Ø´Ø­Ù† 50 (Ø¯Ø§Ø¦Ù† 50)
-- 1500 Ù…Ø¯ÙŠÙ† = 1450 + 50 Ø¯Ø§Ø¦Ù† (Ù…ØªØ²Ù† ØªÙ…Ø§Ù…Ø§Ù‹)
INSERT INTO journal_entries (
    entry_number, period_id, reference_type, reference_id, description, created_by
) VALUES
(
    'JV-2026-0001', 1, 'SHIPMENT_DELIVERY', 1, 'ØªØ³Ø¬ÙŠÙ„ ØªØ­ØµÙŠÙ„ Ø´Ø­Ù†Ø© Ø±Ù‚Ù… ES-9182-3401 Ø¹Ù‡Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨', 1
)
ON CONFLICT (entry_number) DO NOTHING;

INSERT INTO journal_entry_lines (
    journal_entry_id, account_id, debit, credit, courier_id, merchant_id, branch_id, line_description
) VALUES
(1, 2, 1500.00, 0.00, 1, NULL, 1, 'Ø¥Ø«Ø¨Ø§Øª Ø¹Ù‡Ø¯Ø© Ù†Ù‚Ø¯ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ù…Ø­Ù…Ø¯ Ø¥Ø¨Ø±Ø§Ù‡ÙŠÙ…'),
(1, 3, 0.00, 1450.00, NULL, 1, 1, 'Ø¥Ø«Ø¨Ø§Øª Ù…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„ØªØ§Ø¬Ø± Ù…ØªØ¬Ø± Ø§Ù„ØªÙ‚Ù†ÙŠØ©'),
(1, 4, 0.00, 50.00, NULL, NULL, 1, 'Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø®Ø¯Ù…Ø© Ø´Ø­Ù† Ø§Ù„Ø´Ø­Ù†Ø© ES-9182-3401')
ON CONFLICT DO NOTHING;

-- 11. ØªØ³Ø¬ÙŠÙ„ ÙÙŠ Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚
INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
VALUES (1, 'INITIAL_SEED', 'SYSTEM', '1', '{"status": "INITIALIZED", "system": "Easy Send ERP"}'::jsonb, '127.0.0.1', 'SeedScript/1.0');

