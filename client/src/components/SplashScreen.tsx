import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface SplashScreenProps {
  onClose: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onClose }) => {
  const { t, language } = useLanguage();
  const [progress, setProgress] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Increment progress bar smoothly
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 110);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        onClose();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [progress, onClose]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className={`splash-screen-overlay ${isFadingOut ? 'splash-fade-out' : ''}`}>
      <div className="splash-screen-card">
        {/* Animated Circular Glowing Logo - Fixed Brand Asset */}
        <div className="splash-screen-logo-wrapper">
          <img
            src="/assets/zono_logo.jpeg"
            alt="ZONO Delivery Services Logo"
            className="splash-screen-logo"
          />
        </div>

        {/* Brand Titles - Fixed Name: ZONO */}
        <h1 className="splash-screen-title">
          <span>ZONO</span> Delivery Services
        </h1>
        <p className="splash-screen-subtitle">
          {t('splashSubtitle')}
        </p>
        <p className="splash-screen-tagline">
          {t('splashTagline')}
        </p>

        {/* Badges of industries served */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', background: 'rgba(255, 102, 0, 0.15)', color: '#FF7A00', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
            {language === 'ar' ? 'مطاعم 🍔' : 'Restaurants 🍔'}
          </span>
          <span style={{ fontSize: '0.78rem', background: 'rgba(255, 102, 0, 0.15)', color: '#FF7A00', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
            {language === 'ar' ? 'صيدليات 💊' : 'Pharmacies 💊'}
          </span>
          <span style={{ fontSize: '0.78rem', background: 'rgba(255, 102, 0, 0.15)', color: '#FF7A00', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
            {language === 'ar' ? 'متاجر 🛍️' : 'Retail Stores 🛍️'}
          </span>
          <span style={{ fontSize: '0.78rem', background: 'rgba(255, 102, 0, 0.15)', color: '#FF7A00', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
            {language === 'ar' ? 'سوبر ماركت 🛒' : 'Supermarkets 🛒'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="splash-progress-track">
          <div
            className="splash-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip Button */}
        <div>
          <button
            type="button"
            onClick={handleSkip}
            className="splash-skip-btn"
          >
            {t('splashSkip')}
          </button>
        </div>
      </div>
    </div>
  );
};
