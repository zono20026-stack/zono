-- ==============================================================================
-- DATABASE SCHEMA: Shipping and Logistics Management ERP System
-- Dialect: MySQL 8.0+ / PostgreSQL
-- Description: Complete Relational Schema for Merchants, Couriers, Shipments,
--              Financial Clearances, Payouts, Cash Flow, and Geographic Structure.
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `shipping_erp_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `shipping_erp_db`;

-- ------------------------------------------------------------------------------
-- 1. GEOGRAPHIC STRUCTURE (المدن والمناطق)
-- ------------------------------------------------------------------------------

CREATE TABLE `cities` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `zones` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `city_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `default_shipping_cost` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_zones_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 2. MASTER DATA (التجار والمناديب)
-- ------------------------------------------------------------------------------

CREATE TABLE `merchants` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `couriers` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 3. SHIPMENTS & FREIGHT (إدارة الشحنات والطرود)
-- ------------------------------------------------------------------------------

CREATE TABLE `shipments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tracking_number` VARCHAR(50) NOT NULL UNIQUE,
    `sender_type` ENUM('MERCHANT', 'INDIVIDUAL') NOT NULL DEFAULT 'MERCHANT',
    `merchant_id` INT UNSIGNED NULL, -- NULL if INDIVIDUAL sender
    `individual_sender_name` VARCHAR(150) NULL, -- Name if INDIVIDUAL sender
    `courier_id` INT UNSIGNED NULL,
    
    -- Recipient Details
    `recipient_name` VARCHAR(150) NOT NULL,
    `recipient_phone` VARCHAR(20) NOT NULL,
    `city_id` INT UNSIGNED NOT NULL,
    `zone_id` INT UNSIGNED NOT NULL,
    `recipient_address` TEXT NOT NULL,
    `package_notes` TEXT NULL,
    
    -- Financial Values
    `goods_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- ثمن البضاعة
    `shipping_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- ثمن خدمة الشحن
    `total_amount` DECIMAL(10, 2) GENERATED ALWAYS AS (`goods_value` + `shipping_fee`) STORED, -- الإجمالي
    
    -- Status & Lifecycle
    `status` ENUM('PENDING', 'DELIVERED', 'RETURNED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `delivery_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT `fk_shipments_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `merchants` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_shipments_courier` FOREIGN KEY (`courier_id`) REFERENCES `couriers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_shipments_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
    CONSTRAINT `fk_shipments_zone` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 4. FINANCIALS: MERCHANT PAYOUTS (صرف مستحقات التجار)
-- ------------------------------------------------------------------------------

CREATE TABLE `merchant_payouts` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `voucher_number` VARCHAR(50) NOT NULL UNIQUE,
    `merchant_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    CONSTRAINT `fk_payouts_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `merchants` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 5. FINANCIALS: COURIER CLEARANCES & EXPENSES (تسوية عهد المناديب)
-- ------------------------------------------------------------------------------

CREATE TABLE `courier_clearances` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `clearance_number` VARCHAR(50) NOT NULL UNIQUE,
    `courier_id` INT UNSIGNED NOT NULL,
    `total_collections` DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- تحصيلات الشحنات المستلمة
    `total_expenses` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,    -- المصروفات التشغيلية
    `cash_received` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,     -- المورد للخزينة
    `remaining_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- المتبقي
    `clearance_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    CONSTRAINT `fk_clearances_courier` FOREIGN KEY (`courier_id`) REFERENCES `couriers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `courier_expenses` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `courier_id` INT UNSIGNED NOT NULL,
    `clearance_id` INT UNSIGNED NULL, -- Linked during settlement
    `title` VARCHAR(150) NOT NULL, -- e.g. بنزين، نثريات
    `amount` DECIMAL(10, 2) NOT NULL,
    `expense_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_expenses_courier` FOREIGN KEY (`courier_id`) REFERENCES `couriers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_expenses_clearance` FOREIGN KEY (`clearance_id`) REFERENCES `courier_clearances` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 6. CASH FLOW & GENERAL LEDGER (التدفقات النقدية والخزينة)
-- ------------------------------------------------------------------------------

CREATE TABLE `cash_flow` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `transaction_type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `category` VARCHAR(100) NOT NULL, -- e.g., 'حركات شحن افراد', 'صرف تجار', 'تسوية مندوب', 'مصروف إداري'
    `amount` DECIMAL(10, 2) NOT NULL,
    `reference_type` VARCHAR(50) NULL, -- 'SHIPMENT', 'PAYOUT', 'CLEARANCE'
    `reference_id` INT UNSIGNED NULL,
    `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 7. INDEXES FOR HIGH PERFORMANCE SEARCH & FILTERING (الفهارس)
-- ------------------------------------------------------------------------------

CREATE INDEX `idx_shipments_status` ON `shipments` (`status`);
CREATE INDEX `idx_shipments_delivery_date` ON `shipments` (`delivery_date`);
CREATE INDEX `idx_shipments_merchant_status` ON `shipments` (`merchant_id`, `status`);
CREATE INDEX `idx_shipments_courier_status` ON `shipments` (`courier_id`, `status`);
CREATE INDEX `idx_shipments_tracking` ON `shipments` (`tracking_number`);
CREATE INDEX `idx_zones_city` ON `zones` (`city_id`);
