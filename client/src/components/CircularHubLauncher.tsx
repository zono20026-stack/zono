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
      label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
      icon: <LayoutDashboard size={30} />,
      colorClass: 'hub-orange',
      badge: language === 'ar' ? 'مؤشرات' : 'KPIs',
      visible: true,
    },
    {
      id: 'shipments',
      label: language === 'ar' ? 'الشحنات والطرود' : 'Shipments',
      icon: <Package size={30} />,
      colorClass: 'hub-blue',
      badge: language === 'ar' ? 'شحن فوري' : 'Live',
      visible: true,
    },
    {
      id: 'hr',
      label: language === 'ar' ? 'الموارد البشرية' : 'HR & Payroll',
      icon: <Briefcase size={30} />,
      colorClass: 'hub-purple',
      badge: language === 'ar' ? 'جديد ZONO' : 'New',
      visible: isHrAllowed,
    },
    {
      id: 'finance',
      label: language === 'ar' ? 'المالية والخزينة' : 'Finance',
      icon: <Wallet size={30} />,
      colorClass: 'hub-amber',
      badge: language === 'ar' ? 'حسابات' : 'Vault',
      visible: isFinanceAllowed,
    },
    {
      id: 'directory',
      label: language === 'ar' ? 'دليل التكويد والأطراف' : 'Directory',
      icon: <Users size={30} />,
      colorClass: 'hub-green',
      badge: language === 'ar' ? 'أطراف' : 'Masters',
      visible: true,
    },
    {
      id: 'tracking',
      label: language === 'ar' ? 'تتبع الشحنات' : 'Live Tracking',
      icon: <Compass size={30} />,
      colorClass: 'hub-teal',
      badge: language === 'ar' ? 'GPS' : 'GPS',
      visible: true,
    },
    {
      id: 'branches',
      label: language === 'ar' ? 'الفروع والمخازن' : 'Branches',
      icon: <Building2 size={30} />,
      colorClass: 'hub-indigo',
      badge: language === 'ar' ? 'فروع' : 'Hubs',
      visible: isBranchesAllowed,
    },
  ];

  return (
    <div className="zono-circular-launcher-container white-theme-launcher">
      {/* Clean White Welcome Header */}
      <div className="zono-launcher-welcome-banner-light">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="zono-pulse-orb-light">
            <span className="live-pulse-dot" />
          </div>
          <div>
            <h2 className="launcher-main-greeting-light">
              {language === 'ar'
                ? `مرحباً بك، ${user?.name || 'مستخدم النظام'} 👋`
                : `Welcome back, ${user?.name || 'User'} 👋`}
            </h2>
            <p className="launcher-sub-greeting-light">
              {language === 'ar'
                ? 'بوابة تشغيل منظومة زونو اللوجستية الذكية | انقر على أي دائرة لفتح القسم مباشرة'
                : 'ZONO Smart Logistics Portal | Tap any circle to launch module'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="badge badge-orange" style={{ fontSize: '0.85rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} />
            <span>{getRoleLabel(user?.role)}</span>
          </div>
          <div className="badge badge-green" style={{ fontSize: '0.85rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} />
            <span>{language === 'ar' ? 'متصل ومحمي' : 'Online & Secure'}</span>
          </div>
        </div>
      </div>

      {/* Pure Circles Grid with Icon and Name INSIDE the circle */}
      <div className="zono-pure-circles-grid">
        {hubs.filter((h) => h.visible).map((hub) => {
          const isActive = currentTab === hub.id;
          return (
            <button
              key={hub.id}
              type="button"
              onClick={() => onSelectTab(hub.id)}
              className={`zono-circle-tab-btn ${hub.colorClass} ${isActive ? 'is-active' : ''}`}
              title={hub.label}
            >
              <div className="zono-tab-circle">
                <div className="tab-circle-icon">{hub.icon}</div>
                <span className="tab-circle-title">{hub.label}</span>
                {hub.badge && (
                  <span className="circle-bubble-badge">{hub.badge}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* System Status Strip at bottom */}
      <div className="zono-launcher-status-strip-light">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }} />
          <span>{language === 'ar' ? 'خادم ZONO وقاعدة بيانات PostgreSQL 16: متصل ومتزامن لحظياً' : 'ZONO PostgreSQL 16 Server: Connected & Live Synced'}</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {language === 'ar' ? 'نظام النقل والتوزيع والشحن الموحد' : 'Unified Logistics & Courier ERP Platform'}
        </div>
      </div>
    </div>
  );
};

export default CircularHubLauncher;
