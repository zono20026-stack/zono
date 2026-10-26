import React, { useState } from 'react';
import { Search, CheckCircle2, ShieldCheck, ArrowRight, MapPin, Truck } from './icons';
import { apiFetch } from '../api';
import { useLanguage } from '../context/LanguageContext';

interface PublicTrackingViewProps {
  onBackToDashboard?: () => void;
  initialTracking?: string;
}

interface TrackingTimelineItem {
  status: string;
  title: string;
  timestamp: string;
}

interface TrackingResult {
  trackingNumber: string;
  merchantName: string;
  currentStatus: string;
  statusTitle: string;
  destinationCity: string;
  destinationZone: string;
  weightKg: string;
  packageCount: number;
  packageDescription: string;
  allowOpenPackage: boolean;
  scheduledDeliveryDate?: string;
  isDelivered: boolean;
  deliveryProof?: {
    type: string;
    verifiedAt: string;
  } | null;
  courierLiveLocation?: {
    courierName: string;
    latitude: number;
    longitude: number;
    lastUpdated: string;
    googleMapsUrl: string;
  } | null;
  timeline: TrackingTimelineItem[];
}

export const PublicTrackingView: React.FC<PublicTrackingViewProps> = ({
  onBackToDashboard,
  initialTracking = 'ES-9182-3401',
}) => {
  const { t, language } = useLanguage();
  const [trackingQuery, setTrackingQuery] = useState<string>(initialTracking);
  const [trackingData, setTrackingData] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/tracking/${encodeURIComponent(trackingQuery.trim())}`);
      if (res.success) {
        setTrackingData(res.data);
      } else {
        setError(res.message || 'رقم التتبع غير موجود');
      }
    } catch (err: any) {
      setError(err.message || 'فشل البحث عن الشحنة');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '20px' }}
        >
          <ArrowRight size={16} />
          <span>{language === 'ar' ? 'العودة للوحة التحكم' : 'Back to Dashboard'}</span>
        </button>
      )}

      {/* ZONO Wide Hero Billboard Banner - Fixed Visual Asset */}
      <div className="zono-hero-banner-container" style={{ marginBottom: '28px' }}>
        <img
          src="/assets/zono_banner.jpeg"
          alt="ZONO Delivery Banner - من متجرك .. لباب عميلك"
          className="zono-hero-banner-img"
        />
      </div>

      {/* Header Branding - ZONO Logo & Name remain fixed */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src="/assets/zono_logo.jpeg"
          alt="ZONO Delivery Services"
          style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 12px', border: '3px solid var(--primary-orange)', boxShadow: 'var(--shadow-orange-glow)' }}
        />
        <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary-orange)' }}>
          {t('trackingSearchTitle')}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
          {t('trackingSearchSubtitle')}
        </p>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ padding: '20px', marginBottom: '28px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={20}
              style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '14px', top: '14px', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '44px', fontSize: '1.05rem', fontWeight: 700 }}
              placeholder={t('trackingSearchPlaceholder')}
              value={trackingQuery}
              onChange={(e) => setTrackingQuery(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ minWidth: '120px' }}>
            {loading ? t('loading') : t('trackNow')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--accent-green)' }}>
          <ShieldCheck size={16} />
          <span>{language === 'ar' ? 'خدمة آمنة تماماً ومشفرة ولا تكشف أي بيانات شخصية أو هواتف' : 'Secure & encrypted tracking service complying with data privacy laws'}</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'var(--danger-red-light)', color: 'var(--danger-red)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* Tracking Result Card */}
      {trackingData && (
        <div className="card" style={{ padding: '28px', borderTop: '4px solid var(--primary-blue)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>رقم الشحنة الموحد:</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-blue)' }}>
                {trackingData.trackingNumber}
              </div>
            </div>

            <div>
              <span className={`badge ${trackingData.isDelivered ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.95rem', padding: '6px 14px' }}>
                {trackingData.statusTitle}
              </span>
            </div>
          </div>

          {/* Live Courier Location Card if Out For Delivery */}
          {trackingData.courierLiveLocation && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '2px solid #3b82f6',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 10px rgba(37,99,235,0.3)',
                  }}
                >
                  <Truck size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a8a' }}>
                      المندوب في الطريق إليك الآن (تتبع حي ومباشر)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', marginTop: '2px' }}>
                    اسم المندوب: <strong>{trackingData.courierLiveLocation.courierName || 'مندوب التوصيل'}</strong>
                    {trackingData.courierLiveLocation.lastUpdated && (
                      <span style={{ marginRight: '10px', fontSize: '0.75rem', opacity: 0.85 }}>
                        (آخر تحديث للموقع: {new Date(trackingData.courierLiveLocation.lastUpdated).toLocaleTimeString('ar-EG')})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <a
                href={trackingData.courierLiveLocation.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 800,
                  gap: '8px',
                  textDecoration: 'none',
                  padding: '9px 16px',
                  boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
                }}
              >
                <MapPin size={16} />
                <span>تتبع موقع المندوب على خريطة Google Maps</span>
              </a>
            </div>
          )}

          {/* Destination & Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px', background: 'var(--bg-offwhite)', borderRadius: 'var(--radius-md)', marginBottom: '28px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>التاجر الراسل:</div>
              <div style={{ fontWeight: 700 }}>{trackingData.merchantName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الوجهة:</div>
              <div style={{ fontWeight: 700 }}>{trackingData.destinationCity} - {trackingData.destinationZone}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الوزن والقطع:</div>
              <div style={{ fontWeight: 700 }}>{trackingData.weightKg} كجم ({trackingData.packageCount} طرد)</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>محتويات الطرد:</div>
              <div style={{ fontWeight: 700 }}>{trackingData.packageDescription || 'طرد بضائع عامة'}</div>
              <div style={{ marginTop: '4px' }}>
                {trackingData.allowOpenPackage ? (
                  <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                    مسموح بالمعاينة قبل الاستلام والسداد
                  </span>
                ) : (
                  <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                    ممنوع فتح الطرد إلا بعد الاستلام
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stepper / Timeline */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-blue)', marginBottom: '16px' }}>
              خط سير ومراحل التوصيل:
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative', paddingRight: '28px' }}>
              <div style={{ position: 'absolute', right: '11px', top: '10px', bottom: '10px', width: '2px', background: 'var(--primary-blue-subtle)' }} />

              {trackingData.timeline.map((item, idx) => (
                <div key={`${item.status}-${idx}`} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ position: 'absolute', right: '-24px', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: idx === trackingData.timeline.length - 1 ? 'var(--accent-green)' : 'var(--primary-blue)', border: '3px solid white', boxShadow: '0 0 0 2px var(--border-medium)' }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(item.timestamp).toLocaleString('ar-EG')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {trackingData.deliveryProof && (
            <div style={{ marginTop: '24px', padding: '14px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-green)', fontWeight: 700 }}>
              <CheckCircle2 size={20} />
              <span>
                تم التسليم بنجاح مع إثبات التحقق ({trackingData.deliveryProof.type}) في {new Date(trackingData.deliveryProof.verifiedAt).toLocaleString('ar-EG')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
