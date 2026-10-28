import React, { useState, useEffect } from 'react';
import { User, Shipment } from './types';
import { getSavedUser, removeAuthToken } from './api';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ShipmentsView } from './components/ShipmentsView';
import { PublicTrackingView } from './components/PublicTrackingView';
import { FinanceView } from './components/FinanceView';
import { BranchesView } from './components/BranchesView';
import { DirectoryCodingView } from './components/DirectoryCodingView';
import { HRView } from './components/HRView';
import { CircularHubLauncher } from './components/CircularHubLauncher';
import { WaybillModal } from './components/WaybillModal';
import { LoginModal } from './components/LoginModal';
import { SplashScreen } from './components/SplashScreen';
import { ArrowRight } from './components/icons';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(getSavedUser());
  const [currentTab, setCurrentTab] = useState<string>('portal');
  const [isPublicTrackingActive, setIsPublicTrackingActive] = useState<boolean>(false);
  const [printShipment, setPrintShipment] = useState<Shipment | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('easy_send_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('easy_send_auth_expired', handleAuthExpired);
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    setIsPublicTrackingActive(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const getSectionTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'لوحة المؤشرات والتحكم (KPIs)';
      case 'shipments': return 'إدارة وتوزيع الشحنات والطرود';
      case 'hr': return 'الموارد البشرية وشؤون الموظفين والرواتب';
      case 'finance': return 'الإدارة المالية والخزينة وشجرة الحسابات';
      case 'directory': return 'دليل التكويد (العملاء، المندوبين، والتجار)';
      case 'branches': return 'إدارة الفروع ومراكز التوزيع';
      case 'tracking': return 'تتبع الشحنات بالـ GPS';
      default: return 'بوابة الأقسام الرئيسية';
    }
  };

  const renderContent = () => {
    if (isPublicTrackingActive) {
      return (
        <PublicTrackingView
          onBackToDashboard={() => handleSelectTab('portal')}
        />
      );
    }

    if (!user) {
      return (
        <LoginModal
          onLoginSuccess={(u) => {
            setUser(u);
            setIsPublicTrackingActive(false);
            handleSelectTab('portal');
          }}
          onOpenPublicTracking={() => setIsPublicTrackingActive(true)}
        />
      );
    }

    switch (currentTab) {
      case 'portal':
        return (
          <CircularHubLauncher
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            user={user}
          />
        );
      case 'dashboard':
        return (
          <DashboardView
            onOpenShipment={(_s) => handleSelectTab('shipments')}
            onPrintWaybill={(s) => setPrintShipment(s)}
          />
        );
      case 'shipments':
        return (
          <ShipmentsView
            user={user}
            onPrintWaybill={(s) => setPrintShipment(s)}
          />
        );
      case 'hr':
        return <HRView user={user} />;
      case 'directory':
        return <DirectoryCodingView user={user} />;
      case 'tracking':
        return (
          <PublicTrackingView
            onBackToDashboard={() => handleSelectTab('portal')}
          />
        );
      case 'finance':
        return <FinanceView user={user} />;
      case 'branches':
        return <BranchesView />;
      default:
        return (
          <CircularHubLauncher
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            user={user}
          />
        );
    }
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <div className="main-wrapper">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onOpenPublicTracking={() => setIsPublicTrackingActive(true)}
          onGoHome={() => handleSelectTab('portal')}
          currentTab={currentTab}
        />

        <div className="app-body-layout" style={{ width: '100%' }}>
          {/* Main Content Area - Full Width without Sidebar */}
          <main className="content-container" style={{ width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
            {/* When inside any sub-module: Sticky header to return to main circular hub with one click */}
            {currentTab !== 'portal' && user && !isPublicTrackingActive && (
              <div className="main-portal-sticky-bar">
                <button
                  type="button"
                  onClick={() => handleSelectTab('portal')}
                  className="btn btn-primary btn-sm back-to-portal-btn"
                  title="العودة لبوابة الأقسام الرئيسية (الدواير)"
                >
                  <ArrowRight size={18} />
                  <span>العودة للبوابة الرئيسية (الدواير)</span>
                </button>

                <div className="portal-subview-title-pill">
                  <span className="portal-subview-label">القسم المفتوح:</span>
                  <span className="badge badge-orange portal-subview-badge">
                    {getSectionTitle(currentTab)}
                  </span>
                </div>
              </div>
            )}

            {renderContent()}
          </main>
        </div>
      </div>

      {/* Opening Splash Screen */}
      {showSplash && <SplashScreen onClose={() => setShowSplash(false)} />}

      {/* Printable Waybill Modal */}
      <WaybillModal
        shipment={printShipment}
        onClose={() => setPrintShipment(null)}
      />
    </div>
  );
};

export default App;
