import React, { useEffect, useState } from 'react';
import { DashboardKPIs, Shipment } from '../types';
import { apiFetch } from '../api';
import {
  Package,
  CheckCircle2,
  Truck,
  Coins,
  TrendingUp,
  RefreshCw,
  Printer
} from './icons';
import { useLanguage } from '../context/LanguageContext';

interface DashboardViewProps {
  onOpenShipment: (shipment: Shipment) => void;
  onPrintWaybill: (shipment: Shipment) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenShipment,
  onPrintWaybill,
}) => {
  const { t, language } = useLanguage();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const kpiRes = await apiFetch('/finance/dashboard-kpis');
      if (kpiRes.success) setKpis(kpiRes.data);

      const shpRes = await apiFetch('/shipments?limit=5');
      if (shpRes.success) setRecentShipments(shpRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="badge badge-green">{t('status_DELIVERED')}</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="badge badge-blue">{t('status_OUT_FOR_DELIVERY')}</span>;
      case 'ASSIGNED':
        return <span className="badge badge-blue">{t('status_ASSIGNED')}</span>;
      case 'NEW':
        return <span className="badge badge-amber">{t('status_NEW')}</span>;
      case 'FAILED_DELIVERY':
        return <span className="badge badge-red">{t('status_FAILED_DELIVERY')}</span>;
      default:
        return <span className="badge badge-gray">{t(`status_${status}`) || status}</span>;
    }
  };

  if (loading && !kpis) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
        <p>جاري تحميل مؤشرات أداء إيزي سند...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ZONO Wide Hero Billboard Banner */}
      <div className="zono-hero-banner-container">
        <img
          src="/assets/zono_banner.jpeg"
          alt="ZONO Delivery Banner - من متجرك .. لباب عميلك"
          className="zono-hero-banner-img"
        />
      </div>

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
            {t('dashboardTitle')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('dashboardSubtitle')}
          </p>
        </div>

        <button onClick={loadData} className="btn btn-secondary btn-sm">
          <RefreshCw size={16} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div>
            <div className="kpi-info-title">{t('kpiTotalShipments')}</div>
            <div className="kpi-value">{kpis?.totalShipments || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 700, marginTop: '4px' }}>
              {t('kpiDeliveryRate')}: {kpis?.deliveryRate || '100%'}
            </div>
          </div>
          <div className="kpi-icon-wrapper">
            <Package size={28} />
          </div>
        </div>

        <div className="kpi-card green">
          <div>
            <div className="kpi-info-title">{t('kpiDelivered')}</div>
            <div className="kpi-value">{kpis?.deliveredCount || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {kpis?.outForDeliveryCount || 0} {t('kpiOutForDelivery')}
            </div>
          </div>
          <div className="kpi-icon-wrapper">
            <CheckCircle2 size={28} />
          </div>
        </div>

        <div className="kpi-card amber">
          <div>
            <div className="kpi-info-title">{t('kpiCourierLiabilities')}</div>
            <div className="kpi-value">
              {kpis?.financials.courierOpenLiabilities.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('currency')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--warning-amber)', fontWeight: 700, marginTop: '4px' }}>
              {t('kpiActiveLiabilities')}
            </div>
          </div>
          <div className="kpi-icon-wrapper">
            <Coins size={28} />
          </div>
        </div>

        <div className="kpi-card green">
          <div>
            <div className="kpi-info-title">{t('kpiTotalRevenue')}</div>
            <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>
              {kpis?.financials.totalRevenue.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('currency')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {t('kpiEarnedRevenue')}
            </div>
          </div>
          <div className="kpi-icon-wrapper">
            <TrendingUp size={28} />
          </div>
        </div>
      </div>

      {/* Middle Section: Financial Summary & Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Coins size={20} />
              <span>{language === 'ar' ? 'الموقف المالي للخزينة والشركاء' : 'Treasury & Partners Balance'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--primary-blue-light)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600 }}>{t('kpiVaultCash')}:</span>
              <span style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>
                {kpis?.financials.branchCashBalance.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('currency')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600 }}>{t('kpiMerchantPayables')}:</span>
              <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                {kpis?.financials.merchantPayables.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('currency')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--warning-amber-light)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600 }}>{t('kpiCourierLiabilities')}:</span>
              <span style={{ fontWeight: 800, color: 'var(--warning-amber)' }}>
                {kpis?.financials.courierOpenLiabilities.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('currency')}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Truck size={20} />
              <span>{language === 'ar' ? 'توزيع دورة حياة الشحنات' : 'Shipments Lifecycle Distribution'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>{t('status_DELIVERED')}</span>
                <span>{kpis?.deliveredCount || 0} {language === 'ar' ? 'شحنة' : 'shipments'}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: kpis?.deliveryRate || '0%', height: '100%', background: 'var(--accent-green)' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>{t('status_OUT_FOR_DELIVERY')}</span>
                <span>{kpis?.outForDeliveryCount || 0} {language === 'ar' ? 'شحنة' : 'shipments'}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '35%', height: '100%', background: 'var(--primary-blue)' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>{t('status_NEW')}</span>
                <span>{kpis?.newCount || 0} {language === 'ar' ? 'شحنة' : 'shipments'}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '20%', height: '100%', background: 'var(--warning-amber)' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Shipments Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Package size={20} />
            <span>{t('recentShipments')}</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('trackingNumber')}</th>
                <th>{t('merchant')}</th>
                <th>{t('customer')}</th>
                <th>{t('destination')}</th>
                <th>{t('assignedCourier')}</th>
                <th>{t('codAmount')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {recentShipments.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>
                    {s.tracking_number}
                  </td>
                  <td>{s.merchant_name}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.recipient_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.recipient_phone}</div>
                  </td>
                  <td>{s.destination_city} - {s.destination_zone}</td>
                  <td>{s.courier_name || <span style={{ color: 'var(--text-muted)' }}>{language === 'ar' ? 'غير معين' : 'Unassigned'}</span>}</td>
                  <td style={{ fontWeight: 700 }}>
                    {Number.parseFloat(s.total_cod_amount).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('currency')}
                  </td>
                  <td>{getStatusBadge(s.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onPrintWaybill(s)}
                        className="btn btn-secondary btn-sm"
                        title={t('printWaybill')}
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        onClick={() => onOpenShipment(s)}
                        className="btn btn-primary btn-sm"
                      >
                        {language === 'ar' ? 'التفاصيل' : 'Details'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
