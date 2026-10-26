-- ==============================================================================
-- SEED DATA: Easy Send Enterprise ERP (Initial Master Data & Accounts)
-- ==============================================================================

-- 1. فروع الشركة
INSERT INTO branches (branch_code, name, phone, address) VALUES
('CAI-01', 'فرع القاهرة الرئيسي', '01011112233', 'شارع التسعين الجنوبي، التجمع الخامس، القاهرة'),
('GIZ-01', 'فرع الجيزة', '01022223344', 'شارع مصدق، الدقي، الجيزة'),
('ALX-01', 'فرع الإسكندرية', '01033334455', 'شارع فوزي معاذ، سموحة، الإسكندرية')
ON CONFLICT (branch_code) DO NOTHING;

-- 2. المدن والمناطق
INSERT INTO cities (name, branch_id) VALUES
('القاهرة', 1),
('الجيزة', 2),
('الإسكندرية', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO zones (city_id, name) VALUES
(1, 'المعادي'),
(1, 'مدينة نصر'),
(1, 'التجمع الخامس'),
(2, 'الدقي والمهندسين'),
(2, 'مدينة 6 أكتوبر'),
(3, 'سموحة'),
(3, 'سيدي جابر')
ON CONFLICT (city_id, name) DO NOTHING;

-- 3. قواعد التسعير
INSERT INTO pricing_rules (origin_city_id, destination_city_id, base_weight_kg, base_price, extra_kg_price) VALUES
(1, 1, 1.00, 45.00, 5.00),
(1, 2, 1.00, 50.00, 5.00),
(1, 3, 1.00, 75.00, 10.00),
(2, 1, 1.00, 50.00, 5.00),
(2, 2, 1.00, 45.00, 5.00),
(3, 1, 1.00, 75.00, 10.00)
ON CONFLICT (origin_city_id, destination_city_id) DO NOTHING;

-- 4. شجرة الحسابات (Chart of Accounts)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_system_locked) VALUES
('1010', 'خزينة الفرع الرئيسية (النقدية)', 'ASSET', true),
('1020', 'عهد المناديب النقدية (تحصيلات COD معلقة)', 'ASSET', true),
('2010', 'أمانات ومستحقات التجار الدائنة', 'LIABILITY', true),
('4010', 'إيرادات خدمات الشحن والتوصيل', 'REVENUE', true),
('5010', 'مصروفات تشغيلية ونثريات المناديب', 'EXPENSE', true)
ON CONFLICT (account_code) DO NOTHING;

-- 5. الفترة المحاسبية الحالية
INSERT INTO accounting_periods (period_name, start_date, end_date, is_closed) VALUES
('2026-10', '2026-10-01', '2026-10-31', false)
ON CONFLICT (period_name) DO NOTHING;

-- 6. المستخدمون الأوائل (Password: Admin@123456 مشفرة بـ bcrypt)
-- Using pgcrypto crypt function for reliable hash
INSERT INTO users (branch_id, role, full_name, phone, email, password_hash) VALUES
(1, 'SUPER_ADMIN', 'المهندس أحمد مصطفى (المدير العام)', '01000000001', 'admin@easysend.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'ACCOUNTANT', 'أ/ محمود حسن (رئيس الحسابات)', '01000000002', 'accountant@easysend.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'DATA_ENTRY', 'أ/ سارة علي (موظف إدخال عمليات)', '01000000003', 'dataentry@easysend.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'MERCHANT', 'متجر التقنية الحديثة (التاجر)', '01000000004', 'merchant@techshop.com', crypt('Admin@123456', gen_salt('bf', 10))),
(1, 'COURIER', 'كابتن / محمد إبراهيم (المندوب)', '01000000005', 'courier@easysend.com', crypt('Admin@123456', gen_salt('bf', 10)))
ON CONFLICT (phone) DO NOTHING;

-- 7. ربط التاجر والمندوب
INSERT INTO merchants (user_id, business_name, pickup_address, city_id, zone_id)
SELECT id, 'متجر التقنية الحديثة', 'عمارة 12، شارع النصر، المعادي', 1, 1
FROM users WHERE phone = '01000000004'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO couriers (user_id, national_id, vehicle_type, vehicle_plate_number, branch_id, max_unsettled_days)
SELECT id, '29501011234567', 'MOTORCYCLE', 'ق د س 918', 1, 2
FROM users WHERE phone = '01000000005'
ON CONFLICT (user_id) DO NOTHING;

-- 8. شحنات تجريبية في حالات مختلفة لدورة الحياة
INSERT INTO shipments (
    tracking_number, merchant_id, origin_branch_id, destination_branch_id, assigned_courier_id,
    recipient_name, recipient_phone, destination_city_id, destination_zone_id, recipient_address,
    delivery_notes, weight_kg, package_count, goods_value, shipping_fee, total_cod_amount,
    actual_cod_collected, status, scheduled_delivery_date, created_by
) VALUES
(
    'ES-9182-3401', 1, 1, 1, 1,
    'عمرو خالد عبد الرحمن', '01122334455', 1, 3, 'فيلا 44، حي النرجس، التجمع الخامس',
    'الرجاء الاتصال قبل الوصول بنصف ساعة', 2.50, 1, 1450.00, 50.00, 1500.00,
    1500.00, 'DELIVERED', CURRENT_DATE, 1
),
(
    'ES-4820-1192', 1, 1, 1, 1,
    'منى السيد محمود', '01299887766', 1, 2, 'شقة 6، عمارة 8، شارع مكرم عبيد، مدينة نصر',
    'ممنوع فتح الشحنة إلا بعد سداد القيمة', 1.00, 1, 850.00, 45.00, 895.00,
    0.00, 'OUT_FOR_DELIVERY', CURRENT_DATE, 1
),
(
    'ES-7712-9023', 1, 1, 2, NULL,
    'كريم عادل الشريف', '01077665544', 2, 4, 'شارع البطل أحمد عبد العزيز، المهندسين',
    'التسليم بعد الساعة 4 عصراً', 3.00, 2, 2200.00, 50.00, 2250.00,
    0.00, 'NEW', CURRENT_DATE, 1
)
ON CONFLICT (tracking_number) DO NOTHING;

-- 9. إثبات تسليم الشحنة الأولى (DELIVERED)
INSERT INTO proof_of_delivery (
    shipment_id, pod_type, otp_code, recipient_notes, courier_latitude, courier_longitude
) VALUES
(
    1, 'OTP', '8492', 'تم الاستلام بحالة ممتازة وتجربة المنتج', 30.0131, 31.4294
)
ON CONFLICT (shipment_id) DO NOTHING;

-- 10. قيد محاسبي مزدوج متزن لتسليم الشحنة الأولى (ES-9182-3401)
-- المندوب حصل 1500 جنيه: تصبح عهدة عليه (مدين 1500)، التاجر يستحق 1450 (دائن 1450)، إيراد الشحن 50 (دائن 50)
-- 1500 مدين = 1450 + 50 دائن (متزن تماماً)
INSERT INTO journal_entries (
    entry_number, period_id, reference_type, reference_id, description, created_by
) VALUES
(
    'JV-2026-0001', 1, 'SHIPMENT_DELIVERY', 1, 'تسجيل تحصيل شحنة رقم ES-9182-3401 عهدة على المندوب', 1
)
ON CONFLICT (entry_number) DO NOTHING;

INSERT INTO journal_entry_lines (
    journal_entry_id, account_id, debit, credit, courier_id, merchant_id, branch_id, line_description
) VALUES
(1, 2, 1500.00, 0.00, 1, NULL, 1, 'إثبات عهدة نقدية على المندوب محمد إبراهيم'),
(1, 3, 0.00, 1450.00, NULL, 1, 1, 'إثبات مستحقات التاجر متجر التقنية'),
(1, 4, 0.00, 50.00, NULL, NULL, 1, 'إيرادات خدمة شحن الشحنة ES-9182-3401')
ON CONFLICT DO NOTHING;

-- 11. تسجيل في سجل التدقيق
INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
VALUES (1, 'INITIAL_SEED', 'SYSTEM', '1', '{"status": "INITIALIZED", "system": "Easy Send ERP"}'::jsonb, '127.0.0.1', 'SeedScript/1.0');
