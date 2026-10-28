import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Compass,
  Wallet,
  Building2,
  Briefcase,
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
      {/* Clean Welcome Header - Only Greeting */}
      <div
        className="zono-launcher-welcome-banner-light"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '16px 20px',
          marginBottom: '20px',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
        }}
      >
        <h2
          className="launcher-main-greeting-light"
          style={{
            margin: 0,
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#0F172A',
          }}
        >
          {language === 'ar'
            ? `مرحباً بك، ${user?.name || 'مستخدم النظام'}`
            : `Welcome, ${user?.name || 'User'}`}
        </h2>
      </div>

      {/* Opening Banner Image as Background for the Circles Grid */}
      <div className="zono-launcher-hero-card">
        <div className="zono-pure-circles-grid" style={{ padding: 0 }}>
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
      </div>
    </div>
  );
};

export default CircularHubLauncher;
