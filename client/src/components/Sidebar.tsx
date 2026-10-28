import React from 'react';
import { LayoutDashboard, Package, Wallet, Building2, Search, Users, Briefcase } from './icons';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
}) => {
  const { t, language } = useLanguage();
  const isFinanceAllowed = user && ['SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER'].includes(user.role);
  const isBranchesAllowed = user && ['SUPER_ADMIN'].includes(user.role);
  const isHrAllowed = user && ['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DATA_ENTRY'].includes(user.role);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>{t('navDashboard')}</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'shipments' ? 'active' : ''}`}
          onClick={() => onSelectTab('shipments')}
        >
          <Package size={20} />
          <span>{t('navShipments')}</span>
        </button>

        {isHrAllowed && (
          <button
            className={`nav-item ${currentTab === 'hr' ? 'active' : ''}`}
            onClick={() => onSelectTab('hr')}
          >
            <Briefcase size={20} />
            <span>{language === 'ar' ? 'الموارد البشرية' : 'HR & Staff'}</span>
          </button>
        )}

        <button
          className={`nav-item ${currentTab === 'directory' ? 'active' : ''}`}
          onClick={() => onSelectTab('directory')}
        >
          <Users size={20} />
          <span>{t('navDirectory')}</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'tracking' ? 'active' : ''}`}
          onClick={() => onSelectTab('tracking')}
        >
          <Search size={20} />
          <span>{t('navTracking')}</span>
        </button>

        {isFinanceAllowed && (
          <button
            className={`nav-item ${currentTab === 'finance' ? 'active' : ''}`}
            onClick={() => onSelectTab('finance')}
          >
            <Wallet size={20} />
            <span>{t('navFinance')}</span>
          </button>
        )}

        {isBranchesAllowed && (
          <button
            className={`nav-item ${currentTab === 'branches' ? 'active' : ''}`}
            onClick={() => onSelectTab('branches')}
          >
            <Building2 size={20} />
            <span>{t('navBranches')}</span>
          </button>
        )}
      </nav>
    </aside>
  );
};
