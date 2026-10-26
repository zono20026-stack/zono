import React from 'react';
import { Shipment } from '../types';
import { Printer, X } from './icons';

interface WaybillModalProps {
  shipment: Shipment | null;
  onClose: () => void;
}

export const WaybillModal: React.FC<WaybillModalProps> = ({ shipment, onClose }) => {
  if (!shipment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header no-print">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
            معاينة وطباعة بوليصة الشحن (Waybill)
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Printable Container */}
          <div
            className="printable-waybill"
            style={{
              border: '2px dashed var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              backgroundColor: '#FFFFFF',
              color: '#000000',
              direction: 'rtl',
            }}
          >
            {/* Waybill Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="/assets/zono_logo.jpeg"
                  alt="ZONO Delivery Services"
                  style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #FF6600' }}
                />
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FF6600', margin: 0 }}>
                    ZONO Delivery Services
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#333', fontWeight: 700, margin: 0 }}>
                    زونو لخدمات التوصيل والشحن السريع | من متجرك .. لباب عميلك
                  </p>
                </div>
              </div>

              {/* Barcode Mock */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', letterSpacing: '4px', fontSize: '1.8rem', fontWeight: 900, background: '#F1F5F9', padding: '6px 12px', border: '1px solid #000' }}>
                  ||||| | |||| ||| |||||
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px', marginTop: '4px' }}>
                  {shipment.tracking_number}
                </div>
              </div>
            </div>

            {/* Main Parties Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #CCC', paddingBottom: '16px' }}>
              {/* Shipper */}
              <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FF6600', marginBottom: '4px' }}>الراسل (التاجر):</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{shipment.merchant_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#444' }}>فرع الإرسال: {shipment.origin_branch}</div>
              </div>

              {/* Consignee */}
              <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#059669', marginBottom: '4px' }}>المرسل إليه (العميل):</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{shipment.recipient_name}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{shipment.recipient_phone}</div>
                <div style={{ fontSize: '0.85rem', color: '#333', marginTop: '2px' }}>
                  {shipment.destination_city} - {shipment.destination_zone}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#555' }}>{shipment.recipient_address}</div>
              </div>
            </div>

            {/* Financial & COD Highlight */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ECFDF5', border: '2px solid #059669', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46' }}>المبلغ المطلوب تحصيله نقداً من المستلم (COD):</div>
                <div style={{ fontSize: '0.8rem', color: '#555' }}>
                  (ثمن البضاعة: {parseFloat(shipment.goods_value).toLocaleString('ar-EG')} ج.م + الشحن: {parseFloat(shipment.shipping_fee).toLocaleString('ar-EG')} ج.م)
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669' }}>
                {parseFloat(shipment.total_cod_amount).toLocaleString('ar-EG')} ج.م
              </div>
            </div>

            {/* Package Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center', background: '#F8FAFC', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div><strong>الوزن:</strong> {shipment.weight_kg} كجم</div>
              <div><strong>عدد الطرود:</strong> {shipment.package_count} طرد</div>
              <div><strong>تاريخ الشحن:</strong> {shipment.scheduled_delivery_date}</div>
            </div>

            {shipment.delivery_notes && (
              <div style={{ fontSize: '0.85rem', padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', marginBottom: '16px' }}>
                <strong>ملاحظات التوصيل:</strong> {shipment.delivery_notes}
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #CCC' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#555' }}>توقيع واستلام مندوب التوصيل</div>
                <div style={{ height: '35px' }}></div>
                <div style={{ borderBottom: '1px dotted #000' }}></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#555' }}>توقيع العميل المستلم</div>
                <div style={{ height: '35px' }}></div>
                <div style={{ borderBottom: '1px dotted #000' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button onClick={onClose} className="btn btn-secondary">
            إغلاق
          </button>
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={18} />
            <span>طباعة البوليصة الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
