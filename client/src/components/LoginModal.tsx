import React, { useState } from 'react';
import { apiFetch, setAuthToken, saveUser } from '../api';
import { User } from '../types';
import { Lock, Phone, LogIn, ShieldAlert } from './icons';
import { useLanguage } from '../context/LanguageContext';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
  onOpenPublicTracking: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginSuccess,
  onOpenPublicTracking,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [phone, setPhone] = useState('01000000001');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });

      if (res.success && res.data) {
        setAuthToken(res.data.accessToken);
        saveUser(res.data.user);
        onLoginSuccess(res.data.user);
      } else {
        setError(res.message || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
      }
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'تعذر الاتصال بالخادم' : 'Server connection failed'));
    } finally {
      setLoading(false);
    }
  };

  const applyRolePreset = (pPhone: string) => {
    setPhone(pPhone);
    setPassword('Admin@123456');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px', padding: '32px 24px' }}>
        {/* Language Switcher on Login Screen */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="lang-toggle-btn"
          >
            <span>🌐</span>
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>

        {/* Brand Section: Logo & ZONO ERP Name remain fixed */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/assets/zono_logo.jpeg"
            alt="ZONO Delivery Services"
            style={{ width: '84px', height: '84px', borderRadius: '50%', margin: '0 auto 12px', border: '3px solid var(--primary-orange)', boxShadow: 'var(--shadow-orange-glow)' }}
          />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
            ZONO <span style={{ color: 'var(--text-main)' }}>ERP</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
            {t('fromStoreToDoor')} | {language === 'ar' ? 'تسجيل الدخول للنظام' : 'System Sign In'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'var(--danger-red-light)', color: 'var(--danger-red)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">رقم الهاتف المسجل:</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                className="form-input"
                style={{ paddingRight: '38px', fontWeight: 700 }}
                placeholder="010XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور:</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingRight: '38px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '1.05rem', marginTop: '8px' }}
          >
            <LogIn size={20} />
            <span>{loading ? 'جاري التحقق...' : 'دخول إلى النظام'}</span>
          </button>
        </form>

        {/* Quick Demo Role Presets */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center' }}>
            حسابات تجريبية سريعة بنقرة واحدة:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => applyRolePreset('01000000001')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'flex-start' }}
            >
              👑 مدير عام (Admin)
            </button>

            <button
              type="button"
              onClick={() => applyRolePreset('01000000002')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'flex-start' }}
            >
              💼 رئيس حسابات (Finance)
            </button>

            <button
              type="button"
              onClick={() => applyRolePreset('01000000003')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'flex-start' }}
            >
              📝 مدخل بيانات (Operations)
            </button>

            <button
              type="button"
              onClick={() => applyRolePreset('01000000004')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'flex-start' }}
            >
              🏪 تاجر (Merchant)
            </button>

            <button
              type="button"
              onClick={() => applyRolePreset('01000000005')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'flex-start', gridColumn: 'span 2' }}
            >
              🛵 كابتن مندوب شحن (Courier)
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onOpenPublicTracking}
            style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            ← تتبع شحنة بدون تسجيل دخول (للعملاء)
          </button>
        </div>
      </div>
    </div>
  );
};
