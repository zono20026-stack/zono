import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Compass,
  Wallet,
  Building2,
  Briefcase,
  ShieldCheck,
  CheckCircle2
} from './icons';
import { useLanguage } from '../context/LanguageContext';
import { User } from '../types';

interface CircularHubLauncherProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
}

export const CircularHubLauncher: React.FC<CircularHubLauncherProps> = ({
  currentTab,
  onSelectTab,
  user,
}) => {
  const { language } = useLanguage();

  const isFinanceAllowed = user && ['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER'].includes(user.role);
  const isBranchesAllowed = user && ['SUPER_ADMIN'].includes(user.role);
  const isHrAllowed = user && ['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DATA_ENTRY'].includes(user.role);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return language === 'ar' ? 'المدير العام للمنظومة' : 'Super Admin';
      case 'BRANCH_MANAGER': return language === 'ar' ? 'مدير فرع وتوزيع' : 'Branch Manager';
      case 'ACCOUNTANT': return language === 'ar' ? 'مدير مالي ومحاسب' : 'Chief Accountant';
      case 'DATA_ENTRY': return language === 'ar' ? 'مسؤول إدخال بيانات' : 'Data Entry';
      default: return role || (language === 'ar' ? 'مستخدم معتمد' : 'Authorized User');
    }
  };

  const hubs = [
    {
      id: 'dashboard',
      label: language === 'ar' ? 'لوحة المؤشرات والتحكم' : 'KPI Dashboard',
      subtitle: language === 'ar' ? 'نظرة عامة والتحليلات' : 'Analytics & Stats',
      icon: <LayoutDashboard size={28} />,
      colorClass: 'hub-orange',
      badge: language === 'ar' ? 'مؤشرات' : 'KPIs',
      visible: true,
    },
    {
      id: 'shipments',
      label: language === 'ar' ? 'إدارة الشحنات والطرود' : 'Shipments & Parcels',
      subtitle: language === 'ar' ? 'التسجيل والمانفست والتسليم' : 'Orders & Dispatch',
      icon: <Package size={28} />,
      colorClass: 'hub-blue',
      badge: language === 'ar' ? 'شحن فوري' : 'Live',
      visible: true,
    },
    {
      id: 'hr',
      label: language === 'ar' ? 'الموارد البشرية والرواتب' : 'HR & Payroll',
      subtitle: language === 'ar' ? 'الموظفين والحضور والمسيرات' : 'Staff, Shifts & Payroll',
      icon: <Briefcase size={28} />,
      colorClass: 'hub-purple',
      badge: language === 'ar' ? 'جديد ZONO' : 'New',
      visible: isHrAllowed,
    },
    {
      id: 'finance',
      label: language === 'ar' ? 'المالية وتسوية العهد' : 'Finance & Treasury',
      subtitle: language === 'ar' ? 'العهد والتحصيلات والخزينة' : 'Vault, Cash & Ledger',
      icon: <Wallet size={28} />,
      colorClass: 'hub-amber',
      badge: language === 'ar' ? 'حسابات' : 'Vault',
      visible: isFinanceAllowed,
    },
    {
      id: 'directory',
      label: language === 'ar' ? 'دليل التكويد والأطراف' : 'Directory & Partners',
      subtitle: language === 'ar' ? 'العملاء، المندوبين، والتجار' : 'Couriers, Clients & Fleet',
      icon: <Users size={28} />,
      colorClass: 'hub-green',
      badge: language === 'ar' ? 'أطراف' : 'Masters',
      visible: true,
    },
    {
      id: 'tracking',
      label: language === 'ar' ? 'التتبع الحي بالـ GPS' : 'Live Tracking',
      subtitle: language === 'ar' ? 'تتبع فوري لمسار الشحنات' : 'GPS Tracking',
      icon: <Compass size={28} />,
      colorClass: 'hub-teal',
      badge: language === 'ar' ? 'عام' : 'Public',
      visible: true,
    },
    {
      id: 'branches',
      label: language === 'ar' ? 'إدارة الفروع والمخازن' : 'Branches & Hubs',
      subtitle: language === 'ar' ? 'المراكز ومناطق التوزيع' : 'Hubs & Pricing Zones',
      icon: <Building2 size={28} />,
      colorClass: 'hub-indigo',
      badge: language === 'ar' ? 'فروع' : 'Hubs',
      visible: isBranchesAllowed,
    },
  ];

  return (
    <div className="zono-circular-launcher-container">
      {/* Executive Welcome & Greeting Header */}
      <div className="zono-launcher-welcome-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="zono-pulse-orb">
            <span className="live-pulse-dot" />
          </div>
          <div>
            <h2 className="launcher-main-greeting">
              {language === 'ar'
                ? `مرحباً بك، ${user?.name || 'مستخدم النظام'} 👋`
                : `Welcome back, ${user?.name || 'User'} 👋`}
            </h2>
            <p className="launcher-sub-greeting">
              {language === 'ar'
                ? 'بوابة تشغيل منظومة زونو اللوجستية الذكية | انقر على أي قسم لفتح شاشته مباشرة'
                : 'ZONO Smart Logistics Hub | Click any circular module to open its screen directly'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="badge badge-orange" style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} />
            <span>{getRoleLabel(user?.role)}</span>
          </div>
          <div className="badge badge-green" style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} />
            <span>{language === 'ar' ? 'متصل ومحمي' : 'Online & Secure'}</span>
          </div>
        </div>
      </div>

      {/* Circular Hubs Grid */}
      <div className="zono-circular-hubs-grid">
        {hubs.filter((h) => h.visible).map((hub) => {
          const isActive = currentTab === hub.id;
          return (
            <button
              key={hub.id}
              type="button"
              onClick={() => onSelectTab(hub.id)}
              className={`zono-circle-hub-btn ${hub.colorClass} ${isActive ? 'is-active' : ''}`}
              title={hub.label}
            >
              <div className="circle-bubble-outer">
                <div className="circle-bubble-inner">
                  {hub.icon}
                </div>
                {hub.badge && (
                  <span className="circle-bubble-badge">{hub.badge}</span>
                )}
              </div>
              <span className="circle-hub-label">{hub.label}</span>
              <span className="circle-hub-subtitle">{hub.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* System Status Strip at bottom of launcher */}
      <div className="zono-launcher-status-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
          <span>{language === 'ar' ? 'خادم ZONO السحابي: متزامن ويعمل بكفاءة 100%' : 'ZONO Cloud Server: Synced & 100% Operational'}</span>
        </div>
        <div style={{ color: '#94A3B8', fontSize: '0.78rem' }}>
          {language === 'ar' ? 'قاعدة بيانات PostgreSQL 16 مشفرة' : 'Encrypted PostgreSQL 16 Database'}
        </div>
      </div>
    </div>
  );
};

export default CircularHubLauncher;
