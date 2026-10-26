# 🚀 ZONO Enterprise Shipping & Logistics ERP (نظام زونو للشحن واللوجستيات)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/zono20026-stack/zono)
[![GitHub release](https://img.shields.io/badge/release-v1.0.0-orange.svg)](https://github.com/zono20026-stack/zono)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**ZONO (زونو)** هو نظام مؤسسي متكامل لإدارة عمليات الشحن، التوصيل، التتبع الحي، والمحاسبة المالية المزدوجة (COD Financial Ledger) صُمم ليتحمل حتى **مليون مستخدم و 20,000 مستخدم متزامن (20K CCU)** بدون أدنى بطء.

---

## 📥 رابط تحميل التطبيق مباشرة (Download Application)

* **تحميل الكود المصدري كاملاً (ZIP Archive):**
  👉 [**تحميل تطبيق زونو (Download ZONO.zip)**](https://github.com/zono20026-stack/zono/archive/refs/heads/main.zip)

* **مستودع المشروع على GitHub:**
  👉 [https://github.com/zono20026-stack/zono](https://github.com/zono20026-stack/zono)

---

## 🌟 أبرز مميزات النظام (Key Features)

1. **واجهة ثنائية اللغة (Arabic RTL / English LTR):**
   - تبديل فوري بنقرة واحدة بين العربية الفصحى والإنجليزية مع تغيير اتجاه الصفحة آلياً وحفظ التفضيل.
   - اللوجو والاسم التجاري **ZONO** ثابتان عالمياً في كلا اللغتين.

2. **شاشة افتتاحية ذكية (Brand Splash Screen):**
   - ظهور أنيق للوجو والبوستر الإعلاني في منتصف الشاشة مع مؤشر تحميل وزر تخطي سلس.

3. **لوحة إعلانية علوية متحركة (Dynamic Promotional Billboard):**
   - بنر عريض للهوية في لوحة التحكم وشاشة التتبع العامة لشحنات العملاء.

4. **تكويد متكامل للأطراف (Master Directory Coding):**
   - تكويد العملاء (`CST-00X`)، التجار (`MRC-00X`)، والمناديب (`CR-00X`).
   - ربط إحداثيات GPS ورابط خرائط جوجل (Google Maps Live Location) لكل طرف لتسهيل وصول المندوب.

5. **الإدارة المالية المحاسبية المزدوجة (COD & General Accounting):**
   - تسوية متحصلات الدفع عند الاستلام (COD) مع المناديب.
   - كشوف حساب تفصيلية للتجار والمناديب وتاريخ تعاملات العملاء (Customer History).
   - تسجيل المصروفات التشغيلية والنثريات اليومية مقسمة حسب الفروع والأقسام.

6. **إدارة الشحنات والبوالص:**
   - بوالص شحن رسمية احترافية تحمل لوجو ZONO والباركود وملاحظات المعاينة وبيانات المستلم.
   - صفحة تتبع عامة برقم التتبع لا تتطلب تسجيل الدخول.

---

## ☁️ خطوات الرفع والتشغيل على منصة ريندر (Render.com Deployment)

النظام مهيأ تلقائياً للعمل بنقرة واحدة عبر ملف `render.yaml` المرفق مع المشروع:

### الطريقة الأولى: النشر بنقرة واحدة (1-Click Blueprint)
1. سجل الدخول إلى حسابك على [Render.com](https://render.com).
2. اضغط على **Blueprints** ثم **New Blueprint Instance**.
3. اختر مستودعك: `zono20026-stack/zono`.
4. اضغط **Apply**؛ سيقوم ريندر تلقائياً بإنشاء:
   - قاعدة بيانات PostgreSQL مهيأة.
   - خادم ويب Node.js مدمج يقوم ببناء الواجهة والخادم وربط قاعدة البيانات آلياً.

### الطريقة الثانية: النشر اليدوي (Manual Web Service)
1. في Render، أنشئ **PostgreSQL Database** جديدة باسم `zono-db`.
2. أنشئ **Web Service** جديدة واربطها برابط الجيت هب `https://github.com/zono20026-stack/zono`.
3. اضبط الإعدادات التالية:
   - **Environment:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
4. في خانة **Environment Variables**، أضف:
   - `DATABASE_URL`: رابط الاتصال الخاص بقاعدة بيانات PostgreSQL التي أنشأتها (من لوحة تحكم Render).
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `JWT_SECRET`: أي مفتاح سري عشوائي لتشفير الجلسات.
5. اضغط **Deploy Web Service**. سيقوم الخادم ببناء الواجهة وتشغيل قاعدة البيانات تلقائياً!

---

## 🔑 بيانات الدخول التجريبية الجاهزة (Default Logins)

* كلمة المرور الموحدة لجميع الحسابات: `Admin@123456`

| الدور (Role) | رقم الهاتف / الحساب | الصلاحية والوظيفة |
| :--- | :--- | :--- |
| **المدير العام (Super Admin)** | `01000000001` | تحكم كامل بالنظام والفروع والإحصائيات وتعيين الصلاحيات. |
| **رئيس الحسابات (Accountant)** | `01000000002` | توريدات الخزينة، مستحقات التجار، عهد المناديب، والمصروفات. |
| **موظف إدخال (Data Entry)** | `01000000003` | تسجيل الشحنات، طباعة البوالص، وتوجيه خطوط السير. |
| **التاجر (Merchant)** | `01000000004` | لوحة خاصة بالتاجر: إنشاء شحناته ومتابعة رصيده ومستحقاته. |
| **مندوب الشحن (Courier)** | `01000000005` | تطبيق المندوب: استلام وتوصيل الشحنات ورصيد العهدة النقدية. |

---

## 💻 التشغيل المحلي والتطوير (Local Development)

### 1. المتطلبات:
- Node.js (الإصدار 18 فما فوق)
- PostgreSQL (الإصدار 15 أو 16)

### 2. تثبيت الحزم والبناء:
```bash
# تثبيت وتشغيل الواجهة الأمامية والخلفية
npm run build
npm start
```

### 3. التطوير المباشر (Hot Reload):
```bash
# تشغيل خادم الباك إند
cd server
npm run dev

# تشغيل لوحة التحكم (Frontend Vite)
cd client
npm run dev
```

---

## 📱 تطبيق الهاتف المحمول (Flutter Mobile App)

كود تطبيق المندوب والتاجر موجود في مجلد `mobile/`:
- يدعم Android و iOS
- قاعدة بيانات SQLite محلية للأوفلاين (Offline Sync)
- لتجميع ملف APK:
  ```bash
  cd mobile
  flutter pub get
  flutter build apk --release
  ```

---

## 📄 الترخيص (License)
هذا المشروع مرخص تحت رخصة MIT. جميع الحقوق محفوظة لـ **ZONO Delivery ERP** © 2026.
