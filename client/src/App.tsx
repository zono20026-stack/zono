import React, { useState, useEffect } from 'react';
import { User, Shipment } from './types';
import { getSavedUser, removeAuthToken } from './api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ShipmentsView } from './components/ShipmentsView';
import { PublicTrackingView } from './components/PublicTrackingView';
import { FinanceView } from './components/FinanceView';
import { BranchesView } from './components/BranchesView';
import { DirectoryCodingView } from './components/DirectoryCodingView';
import { WaybillModal } from './components/WaybillModal';
import { LoginModal } from './components/LoginModal';
import { SplashScreen } from './components/SplashScreen';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(getSavedUser());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
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

  const renderContent = () => {
    if (isPublicTrackingActive) {
      return (
        <PublicTrackingView
          onBackToDashboard={() => setIsPublicTrackingActive(false)}
        />
      );
    }

    if (!user) {
      return (
        <LoginModal
          onLoginSuccess={(u) => {
            setUser(u);
            setIsPublicTrackingActive(false);
          }}
          onOpenPublicTracking={() => setIsPublicTrackingActive(true)}
        />
      );
    }

    switch (currentTab) {
      case 'shipments':
        return (
          <ShipmentsView
            user={user}
            onPrintWaybill={(s) => setPrintShipment(s)}
          />
        );
      case 'directory':
        return <DirectoryCodingView user={user} />;
      case 'tracking':
        return <PublicTrackingView />;
      case 'finance':
        return <FinanceView user={user} />;
      case 'branches':
        return <BranchesView />;
      case 'dashboard':
      default:
        return (
          <DashboardView
            onOpenShipment={(_s) => setCurrentTab('shipments')}
            onPrintWaybill={(s) => setPrintShipment(s)}
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
        />

        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar */}
          {user && !isPublicTrackingActive && (
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setIsPublicTrackingActive(false);
              }}
              user={user}
            />
          )}

          {/* Main Content */}
          <main className="content-container">
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
