import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Brand & System (ZONO remains fixed)
    brandName: 'ZONO',
    brandSubtitle: 'زونو لخدمات التوصيل | من متجرك .. لباب عميلك',
    systemTitle: 'ZONO ERP',
    slogan: 'سريع .. في كل زون',
    fromStoreToDoor: 'من متجرك .. لباب عميلك',

    // Navigation
    navDashboard: 'لوحة التحكم الرئيسية',
    navShipments: 'إدارة الشحنات والطرود',
    navDirectory: 'دليل التكويد والأطراف',
    navTracking: 'التتبع العام للعملاء',
    navFinance: 'الماليات وتسوية العهد',
    navBranches: 'إدارة الفروع والمناطق',
    trackShipmentBtn: 'تتبع شحنة للعملاء',
    logout: 'خروج',
    welcome: 'مرحباً',

    // Common Actions
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    search: 'بحث',
    print: 'طباعة',
    printWaybill: 'طباعة البوليصة',
    printStatement: 'طباعة كشف الحساب',
    refresh: 'تحديث لحظي',
    loading: 'جاري التحميل...',
    actions: 'إجراءات',
    status: 'الحالة',
    date: 'التاريخ',
    amount: 'المبلغ',
    phone: 'الهاتف',
    address: 'العنوان',
    notes: 'ملاحظات',
    currency: 'ج.م',
    back: 'رجوع',
    edit: 'تعديل',
    delete: 'حذف',
    all: 'الكل',
    filter: 'تصفية',

    // Roles
    role_SUPER_ADMIN: 'مدير عام',
    role_BRANCH_MANAGER: 'مدير فرع',
    role_ACCOUNTANT: 'رئيس حسابات',
    role_DATA_ENTRY: 'موظف إدخال',
    role_VIEWER: 'مشاهدة فقط',
    role_MERCHANT: 'تاجر',
    role_COURIER: 'مندوب شحن',

    // Shipment Statuses
    status_NEW: 'جديدة',
    status_ASSIGNED: 'تم التعيين',
    status_OUT_FOR_DELIVERY: 'في الطريق',
    status_DELIVERED: 'تم التسليم',
    status_FAILED_DELIVERY: 'فشل التسليم',
    status_RETURNED: 'مرتجعة',

    // Dashboard
    dashboardTitle: 'لوحة القيادة والمؤشرات العامة | ZONO',
    dashboardSubtitle: 'نظرة حية لحظية على حركة الشحنات والتحصيلات والعهد النقدية',
    kpiTotalShipments: 'إجمالي الشحنات بالنظام',
    kpiDeliveryRate: 'نسبة الإنجاز',
    kpiDelivered: 'الشحنات المسلمة بنجاح',
    kpiOutForDelivery: 'في الطريق حالياً',
    kpiVaultCash: 'رصيد الخزينة المتاح',
    kpiCashInHand: 'سيولة فورية محصلة',
    kpiCourierLiabilities: 'عهد المناديب المعلقة',
    kpiActiveLiabilities: 'نقدية جاري توريدها',
    kpiMerchantPayables: 'مستحقات التجار المعلقة',
    kpiDuePayout: 'أمانات مستحقة للصرف',
    kpiTotalRevenue: 'إيرادات خدمات الشحن',
    kpiEarnedRevenue: 'أرباح تشغيلية محققة',
    recentShipments: 'آخر الشحنات المسجلة',

    // Shipments
    shipmentsTitle: 'إدارة الشحنات والطرود',
    newShipmentBtn: 'إضافة شحنة جديدة',
    trackingNumber: 'رقم التتبع',
    merchant: 'التاجر',
    customer: 'العميل',
    destination: 'الوجهة',
    codAmount: 'مبلغ التحصيل (COD)',
    assignedCourier: 'المندوب المعين',
    packageDescription: 'تفاصيل ومحتويات الشحنة',
    allowOpenPackage: 'السماح بفتح الشحنة للمعاينة',
    liveGpsTracking: 'تتبع موقع المندوب الحي GPS',

    // Directory
    directoryTitle: 'دليل التكويد والأطراف',
    directorySubtitle: 'إدارة وتكويد العملاء، المناديب، والتجار وربط العناوين باللوكيشن',
    customersTab: 'دليل العملاء',
    couriersTab: 'دليل المناديب',
    merchantsTab: 'دليل التجار والشركاء',
    addCustomerBtn: 'تكويد عميل جديد',
    addCourierBtn: 'تكويد مندوب جديد',
    addMerchantBtn: 'تكويد تاجر جديد',
    customerHistory: 'سجل تعاملات العميل',
    courierStatement: 'كشف حساب المندوب',
    merchantStatement: 'كشف حساب التاجر',

    // Finance
    financeTitle: 'الماليات والقيود والحسابات',
    tabAccounts: 'شجرة الحسابات العامة',
    tabExpenses: 'المصروفات العامة',
    tabCouriers: 'تسوية عهد المناديب',
    tabMerchants: 'مستحقات التجار',
    tabJournal: 'دفتر اليومية المحاسبي',
    addExpenseBtn: 'تسجيل مصروف جديد',

    // Public Tracking
    trackingSearchTitle: 'تتبع شحنتك لحظياً مع ZONO',
    trackingSearchSubtitle: 'من متجرك .. لباب عميلك | أدخل رقم الشحنة لمتابعة خط السير وموقع المندوب المباشر',
    trackingSearchPlaceholder: 'مثال: ES-9182-3401 أو رمز الرابط المشفر',
    trackNow: 'تتبع الآن',

    // Splash
    splashSkip: 'تخطي الشاشة الافتتاحية والدخول',
    languageToggle: 'English',
  },
  en: {
    // Brand & System (ZONO remains fixed)
    brandName: 'ZONO',
    brandSubtitle: 'ZONO Delivery Services | From Your Store to Customer\'s Door',
    systemTitle: 'ZONO ERP',
    slogan: 'Fast in every zone',
    fromStoreToDoor: 'From your store to customer\'s door',

    // Navigation
    navDashboard: 'Dashboard',
    navShipments: 'Shipments & Parcels',
    navDirectory: 'Directory & Master Data',
    navTracking: 'Public Tracking',
    navFinance: 'Finance & Settlements',
    navBranches: 'Branches & Zones',
    trackShipmentBtn: 'Track Shipment',
    logout: 'Logout',
    welcome: 'Welcome',

    // Common Actions
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    search: 'Search',
    print: 'Print',
    printWaybill: 'Print Waybill',
    printStatement: 'Print Statement',
    refresh: 'Live Refresh',
    loading: 'Loading...',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    amount: 'Amount',
    phone: 'Phone',
    address: 'Address',
    notes: 'Notes',
    currency: 'EGP',
    back: 'Back',
    edit: 'Edit',
    delete: 'Delete',
    all: 'All',
    filter: 'Filter',

    // Roles
    role_SUPER_ADMIN: 'Super Admin',
    role_BRANCH_MANAGER: 'Branch Manager',
    role_ACCOUNTANT: 'Accountant',
    role_DATA_ENTRY: 'Data Entry',
    role_VIEWER: 'Viewer',
    role_MERCHANT: 'Merchant',
    role_COURIER: 'Courier',

    // Shipment Statuses
    status_NEW: 'New',
    status_ASSIGNED: 'Assigned',
    status_OUT_FOR_DELIVERY: 'Out for Delivery',
    status_DELIVERED: 'Delivered',
    status_FAILED_DELIVERY: 'Failed Delivery',
    status_RETURNED: 'Returned',

    // Dashboard
    dashboardTitle: 'Executive Dashboard & Live KPIs | ZONO',
    dashboardSubtitle: 'Real-time overview of shipments, courier cash liabilities, and ledger balances',
    kpiTotalShipments: 'Total Shipments in System',
    kpiDeliveryRate: 'Completion Rate',
    kpiDelivered: 'Delivered Successfully',
    kpiOutForDelivery: 'Out for Delivery Now',
    kpiVaultCash: 'Vault Cash Available',
    kpiCashInHand: 'Cash in Hand',
    kpiCourierLiabilities: 'Open Courier Liabilities',
    kpiActiveLiabilities: 'Pending Remittance',
    kpiMerchantPayables: 'Merchant Payables Due',
    kpiDuePayout: 'Due for Payout',
    kpiTotalRevenue: 'Shipping Earned Revenue',
    kpiEarnedRevenue: 'Operating Profit',
    recentShipments: 'Recent Registered Shipments',

    // Shipments
    shipmentsTitle: 'Shipments & Parcels Management',
    newShipmentBtn: 'Add New Shipment',
    trackingNumber: 'Tracking No.',
    merchant: 'Merchant',
    customer: 'Customer',
    destination: 'Destination',
    codAmount: 'COD Amount',
    assignedCourier: 'Assigned Courier',
    packageDescription: 'Package Details & Contents',
    allowOpenPackage: 'Allow Inspection Before Payment',
    liveGpsTracking: 'Live GPS Courier Location',

    // Directory
    directoryTitle: 'Directory & Master Coding',
    directorySubtitle: 'Manage customers, couriers, and merchants with integrated GPS coordinates',
    customersTab: 'Customers Directory',
    couriersTab: 'Couriers Directory',
    merchantsTab: 'Merchants & Partners',
    addCustomerBtn: 'New Customer',
    addCourierBtn: 'New Courier',
    addMerchantBtn: 'New Merchant',
    customerHistory: 'Customer Order History',
    courierStatement: 'Courier Statement',
    merchantStatement: 'Merchant Statement',

    // Finance
    financeTitle: 'Finance & Ledger Accounts',
    tabAccounts: 'Chart of Accounts',
    tabExpenses: 'General Expenses',
    tabCouriers: 'Courier Settlements',
    tabMerchants: 'Merchant Payouts',
    tabJournal: 'Journal Entries Ledger',
    addExpenseBtn: 'Record Expense',

    // Public Tracking
    trackingSearchTitle: 'Track Your Shipment in Real-Time with ZONO',
    trackingSearchSubtitle: 'From your store to customer door | Enter tracking number to view timeline & live courier GPS',
    trackingSearchPlaceholder: 'e.g. ES-9182-3401 or encrypted tracking code',
    trackNow: 'Track Now',

    // Splash
    splashSkip: 'Skip & Enter System',
    languageToggle: 'العربية',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  dir: 'rtl',
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('zono_language');
    return saved === 'en' ? 'en' : 'ar';
  });

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    document.body.dir = dir;
    localStorage.setItem('zono_language', language);
  }, [language, dir]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['ar']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
