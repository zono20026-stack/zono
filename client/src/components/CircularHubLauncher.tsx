import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Compass,
  Wallet,
  Building2,
  Briefcase
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

  const hubs = [
    {
      id: 'dashboard',
      label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
      subtitle: language === 'ar' ? 'المؤشرات والأداء' : 'KPIs & Overview',
      icon: <LayoutDashboard size={26} />,
      colorClass: 'hub-orange',
      badge: language === 'ar' ? 'الرئيسية' : 'Home',
      visible: true,
    },
    {
      id: 'shipments',
      label: language === 'ar' ? 'الشحنات والطرود' : 'Shipments',
      subtitle: language === 'ar' ? 'التسجيل والتوزيع' : 'Orders & Dispatch',
      icon: <Package size={26} />,
      colorClass: 'hub-blue',
      badge: language === 'ar' ? 'شحن فوري' : 'Live',
      visible: true,
    },
    {
      id: 'hr',
      label: language === 'ar' ? 'الموارد البشرية' : 'HR & Payroll',
      subtitle: language === 'ar' ? 'الموظفين والرواتب' : 'Staff & Salaries',
      icon: <Briefcase size={26} />,
      colorClass: 'hub-purple',
      badge: language === 'ar' ? 'جديد ZONO' : 'New',
      visible: isHrAllowed,
    },
    {
      id: 'finance',
      label: language === 'ar' ? 'المالية والخزينة' : 'Finance',
      subtitle: language === 'ar' ? 'العهد والتحصيلات' : 'Vault & Ledger',
      icon: <Wallet size={26} />,
      colorClass: 'hub-amber',
      badge: language === 'ar' ? 'حسابات' : 'Vault',
      visible: isFinanceAllowed,
    },
    {
      id: 'directory',
      label: language === 'ar' ? 'دليل التكويد' : 'Directory',
      subtitle: language === 'ar' ? 'العملاء والتجار' : 'Partners & Fleet',
      icon: <Users size={26} />,
      colorClass: 'hub-green',
      badge: language === 'ar' ? 'سجلات' : 'Master',
      visible: true,
    },
    {
      id: 'tracking',
      label: language === 'ar' ? 'تتبع الشحنات' : 'Live Tracking',
      subtitle: language === 'ar' ? 'تتبع حي بالـ GPS' : 'GPS Tracking',
      icon: <Compass size={26} />,
      colorClass: 'hub-teal',
      badge: language === 'ar' ? 'عام' : 'Public',
      visible: true,
    },
    {
      id: 'branches',
      label: language === 'ar' ? 'الفروع والمخازن' : 'Branches',
      subtitle: language === 'ar' ? 'مراكز التوزيع' : 'Hubs & Stores',
      icon: <Building2 size={26} />,
      colorClass: 'hub-indigo',
      badge: language === 'ar' ? 'فروع' : 'Hubs',
      visible: isBranchesAllowed,
    },
  ];

  return (
    <div className="zono-circular-launcher-container">
      <div className="zono-circular-launcher-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-pulse-dot" />
          <h3 className="launcher-title">
            {language === 'ar' ? 'بوابة تشغيل منظومة زونو ZONO' : 'ZONO Navigation Hub'}
          </h3>
        </div>
        <span className="launcher-subtitle">
          {language === 'ar' ? 'انقر على الدائرة للانتقال السريع للقسم' : 'Tap any circle to launch module'}
        </span>
      </div>

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
    </div>
  );
};
