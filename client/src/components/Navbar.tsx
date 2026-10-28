import React from 'react';
import { User } from '../types';
import { LogOut, ShieldCheck, Compass, LayoutDashboard } from './icons';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenPublicTracking: () => void;
  onGoHome?: () => void;
  currentTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenPublicTracking,
  onGoHome,
  currentTab,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: t('role_SUPER_ADMIN'),
    BRANCH_MANAGER: t('role_BRANCH_MANAGER'),
    ACCOUNTANT: t('role_ACCOUNTANT'),
    DATA_ENTRY: t('role_DATA_ENTRY'),
    VIEWER: t('role_VIEWER'),
    MERCHANT: t('role_MERCHANT'),
    COURIER: t('role_COURIER'),
  };

  const handleLanguageToggle = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="top-navbar">
      {/* Brand Section: ZONO Logo & Name remain fixed */}
      <div
        className="brand-section"
        style={{ cursor: onGoHome ? 'pointer' : 'default' }}
        onClick={onGoHome}
        title={language === 'ar' ? 'العودة للرئيسية وبوابة الأقسام' : 'Go to Home Hub'}
      >
        <img
          src="/assets/zono_logo.jpeg"
          alt="ZONO Delivery Logo"
          className="brand-logo-img"
          style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--primary-orange)' }}
        />
        <div>
          <h1 className="brand-title" style={{ color: 'var(--primary-orange)' }}>
            ZONO <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>Delivery</span>
          </h1>
          <p className="brand-subtitle">{t('brandSubtitle')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Quick Home Hub Button when inside sub-screens */}
        {user && onGoHome && currentTab !== 'portal' && (
          <button
            type="button"
            onClick={onGoHome}
            className="btn btn-primary btn-sm"
            title={language === 'ar' ? 'العودة لبوابة الأقسام الرئيسية (الدواير)' : 'Go to Main Hub'}
            style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <LayoutDashboard size={16} />
            <span>{language === 'ar' ? 'الدواير الرئيسية' : 'Main Hub'}</span>
          </button>
        )}
        {/* Language Switcher Pill */}
        <button
          type="button"
          onClick={handleLanguageToggle}
          className="lang-toggle-btn"
          title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
        >
          <span style={{ fontSize: '1rem' }}>🌐</span>
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        <button
          onClick={onOpenPublicTracking}
          className="btn btn-secondary btn-sm"
          title={t('trackShipmentBtn')}
        >
          <Compass size={16} />
          <span>{t('trackShipmentBtn')}</span>
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: language === 'ar' ? 'left' : 'right', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {user.fullName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className="badge badge-blue">
                  <ShieldCheck size={12} />
                  {roleLabels[user.role] || user.role}
                </span>
                {user.branchName && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({user.branchName})
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--danger-red)', padding: '8px' }}
              title={t('logout')}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {language === 'ar' ? 'غير مسجل' : 'Guest'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
