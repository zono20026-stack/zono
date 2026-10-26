import React, { useState, useEffect } from 'react';
import { Shipment, CityWithZones, CourierMaster, User, Customer } from '../types';
import { apiFetch } from '../api';
import {
  PackagePlus,
  Search,
  Filter,
  UserCheck,
  CheckCircle,
  Printer,
  X,
  AlertTriangle,
  MapPin,
  Compass
} from './icons';

interface ShipmentsViewProps {
  user: User | null;
  onPrintWaybill: (shipment: Shipment) => void;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({
  user: _user,
  onPrintWaybill,
}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Master data for forms
  const [cities, setCities] = useState<CityWithZones[]>([]);
  const [couriers, setCouriers] = useState<CourierMaster[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Form states for New Shipment
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number>(1);
  const [selectedZoneId, setSelectedZoneId] = useState<number>(1);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [goodsValue, setGoodsValue] = useState<string>('0');
  const [weightKg, setWeightKg] = useState<string>('1.0');
  const [selectedMerchantId, setSelectedMerchantId] = useState<number>(1);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [packageDescription, setPackageDescription] = useState('طرد بضائع عامة');
  const [allowOpenPackage, setAllowOpenPackage] = useState<boolean>(true);
  const [recipientLatitude, setRecipientLatitude] = useState('');
  const [recipientLongitude, setRecipientLongitude] = useState('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Assign & Status states
  const [targetCourierId, setTargetCourierId] = useState<number | ''>('');
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [actualCod, setActualCod] = useState<string>('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadShipments = async () => {
    setLoading(true);
    try {
      let url = `/shipments?limit=50`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiFetch(url);
      if (res.success) setShipments(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الشحنات';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const cRes = await apiFetch('/master/cities-with-zones');
      if (cRes.success) setCities(cRes.data);

      const crRes = await apiFetch('/master/couriers');
      if (crRes.success) setCouriers(crRes.data);

      const mRes = await apiFetch('/master/merchants');
      if (mRes.success) setMerchants(mRes.data);

      const custRes = await apiFetch('/master/customers');
      if (custRes.success) setCustomers(custRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadShipments();
    void loadMasterData();
  }, [statusFilter]);

  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'المتصفح لا يدعم تحديد الموقع الجغرافي GPS' });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRecipientLatitude(pos.coords.latitude.toFixed(6));
        setRecipientLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
        setFeedback({ type: 'success', message: 'تم التقاط إحداثيات موقع المستلم بدقة!' });
      },
      (err) => {
        setIsLocating(false);
        setFeedback({ type: 'error', message: 'تعذر تحديد الموقع الجغرافي: ' + err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCustomerSelect = (custId: number | '') => {
    setSelectedCustomerId(custId);
    if (custId === '') return;
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setRecipientName(found.name);
      setRecipientPhone(found.phone);
      if (found.city_id) setSelectedCityId(found.city_id);
      if (found.zone_id) setSelectedZoneId(found.zone_id);
      if (found.address) setRecipientAddress(found.address);
      if (found.latitude) setRecipientLatitude(found.latitude);
      if (found.longitude) setRecipientLongitude(found.longitude);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          recipientName,
          recipientPhone,
          destinationCityId: selectedCityId,
          destinationZoneId: selectedZoneId,
          recipientAddress,
          goodsValue,
          weightKg,
          merchantId: selectedMerchantId,
          deliveryNotes,
          packageDescription,
          allowOpenPackage,
          customerId: selectedCustomerId || undefined,
          recipientLatitude: recipientLatitude || undefined,
          recipientLongitude: recipientLongitude || undefined,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsNewModalOpen(false);
        // Reset form
        setSelectedCustomerId('');
        setRecipientName('');
        setRecipientPhone('');
        setRecipientAddress('');
        setGoodsValue('0');
        setPackageDescription('طرد بضائع عامة');
        setAllowOpenPackage(true);
        setRecipientLatitude('');
        setRecipientLongitude('');
        setDeliveryNotes('');
        void loadShipments();
        void loadMasterData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الشحنة';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleAssignCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment || !targetCourierId) return;

    try {
      const res = await apiFetch(`/shipments/${selectedShipment.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ courierId: targetCourierId }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsAssignModalOpen(false);
        void loadShipments();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تعيين المندوب';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment || !targetStatus) return;

    try {
      const res = await apiFetch(`/shipments/${selectedShipment.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          toStatus: targetStatus,
          reason: statusReason,
          podType: targetStatus === 'DELIVERED' ? 'OTP' : undefined,
          otpCode: otpCode || undefined,
          actualCodCollected: actualCod ? Number.parseFloat(actualCod) : undefined,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsStatusModalOpen(false);
        void loadShipments();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث حالة الشحنة';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="badge badge-green">تم التسليم</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="badge badge-blue">في الطريق</span>;
      case 'ASSIGNED':
        return <span className="badge badge-blue">تم التعيين</span>;
      case 'NEW':
        return <span className="badge badge-amber">جديدة</span>;
      case 'FAILED_DELIVERY':
        return <span className="badge badge-red">فشل التسليم</span>;
      case 'RETURNED':
        return <span className="badge badge-gray">مرتجع</span>;
      case 'CANCELLED':
        return <span className="badge badge-red">ملغاة</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  // Get selected city zones
  const activeZones = cities.find((c) => c.id === selectedCityId)?.zones || [];

  return (
    <div>
      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            backgroundColor: feedback.type === 'success' ? 'var(--accent-green-light)' : 'var(--danger-red-light)',
            color: feedback.type === 'success' ? 'var(--accent-green)' : 'var(--danger-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Action Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
            إدارة الشحنات والطرود
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            تتبع وتسجيل وتعيين الشحنات بدقة مع ربط القيود المالية آلياً
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="btn btn-primary"
        >
          <PackagePlus size={18} />
          <span>إضافة شحنة جديدة</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingRight: '38px' }}
              placeholder="البحث برقم التتبع، اسم المستلم، أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void loadShipments()}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">جميع الحالات</option>
              <option value="NEW">جديدة (NEW)</option>
              <option value="ASSIGNED">تم التعيين (ASSIGNED)</option>
              <option value="OUT_FOR_DELIVERY">في الطريق (OUT_FOR_DELIVERY)</option>
              <option value="DELIVERED">تم التسليم (DELIVERED)</option>
              <option value="FAILED_DELIVERY">فشل التسليم (FAILED)</option>
              <option value="RETURNED">مرتجع (RETURNED)</option>
            </select>
          </div>

          <button onClick={() => { void loadShipments(); }} className="btn btn-secondary">
            <Filter size={16} />
            <span>تصفية</span>
          </button>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم التتبع</th>
                <th>التاجر</th>
                <th>المستلم والموقع</th>
                <th>محتويات الطرد والمعاينة</th>
                <th>الوجهة</th>
                <th>المندوب</th>
                <th>قيمة البضاعة</th>
                <th>رسوم الشحن</th>
                <th>إجمالي COD</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    جاري تحميل بيانات الشحنات والطرود...
                  </td>
                </tr>
              )}
              {!loading && shipments.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>
                    {s.tracking_number}
                  </td>
                  <td>{s.merchant_name}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.recipient_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.recipient_phone}</div>
                    {s.recipient_latitude && s.recipient_longitude && (
                      <a
                        href={`https://maps.google.com/?q=${s.recipient_latitude},${s.recipient_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.7rem',
                          color: 'var(--primary-blue)',
                          marginTop: '2px',
                          textDecoration: 'none',
                          fontWeight: 700,
                        }}
                        title="فتح موقع العميل على خريطة Google Maps"
                      >
                        <MapPin size={11} />
                        <span>لوكيشن GPS</span>
                      </a>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.package_description || 'طرد عام'}
                    </div>
                    <div style={{ marginTop: '3px' }}>
                      {s.allow_open_package ? (
                        <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          مسموح بالمعاينة
                        </span>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          ممنوع الفتح
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>{s.destination_city}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.destination_zone}</div>
                  </td>
                  <td>
                    {s.courier_name ? (
                      <span style={{ fontWeight: 600 }}>{s.courier_name}</span>
                    ) : (
                      <span style={{ color: 'var(--danger-red)', fontSize: '0.85rem' }}>غير معين</span>
                    )}
                  </td>
                  <td>{Number.parseFloat(s.goods_value).toLocaleString('ar-EG')} ج.م</td>
                  <td>{Number.parseFloat(s.shipping_fee).toLocaleString('ar-EG')} ج.م</td>
                  <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>
                    {Number.parseFloat(s.total_cod_amount).toLocaleString('ar-EG')} ج.م
                  </td>
                  <td>{getStatusBadge(s.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onPrintWaybill(s)}
                        className="btn btn-secondary btn-sm"
                        title="طباعة بوليصة الشحن"
                      >
                        <Printer size={14} />
                      </button>

                      {s.status === 'NEW' && (
                        <button
                          onClick={() => {
                            setSelectedShipment(s);
                            setIsAssignModalOpen(true);
                          }}
                          className="btn btn-primary btn-sm"
                          title="تعيين مندوب"
                        >
                          <UserCheck size={14} />
                          <span>تعيين</span>
                        </button>
                      )}

                      {['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(s.status) && (
                        <button
                          onClick={() => {
                            setSelectedShipment(s);
                            setIsStatusModalOpen(true);
                          }}
                          className="btn btn-success btn-sm"
                          title="تغيير الحالة أو تسليم"
                        >
                          <CheckCircle size={14} />
                          <span>تحديث</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Shipment */}
      {isNewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                إضافة شحنة جديدة
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateShipment}>
              <div className="modal-body">
                {/* 1. Quick Customer Directory Auto-fill */}
                <div style={{ background: 'var(--bg-offwhite)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <label htmlFor="shipmentCustomerSelect" className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary-blue)', fontWeight: 800 }}>
                    <span>اختيار عميل مسجل مسبقاً من الدليل (تعبئة تلقائية):</span>
                    {selectedCustomerId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId('');
                          setRecipientName('');
                          setRecipientPhone('');
                          setRecipientAddress('');
                          setRecipientLatitude('');
                          setRecipientLongitude('');
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger-red)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                      >
                        مسح التحديد والكتابة يدوياً
                      </button>
                    )}
                  </label>
                  <select
                    id="shipmentCustomerSelect"
                    className="form-select"
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value ? Number.parseInt(e.target.value, 10) : '')}
                  >
                    <option value="">-- كتابة بيانات عميل جديد أو اختيار من الدليل --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.customer_code}] {c.name} - {c.phone} ({c.city_name || 'غير محدد'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="shipmentMerchantSelect" className="form-label">التاجر الراسل:</label>
                  <select
                    id="shipmentMerchantSelect"
                    className="form-select"
                    value={selectedMerchantId}
                    onChange={(e) => setSelectedMerchantId(Number.parseInt(e.target.value, 10))}
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.business_name} ({m.city_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Package description & open allowance */}
                <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label htmlFor="shipmentPkgDescInput" className="form-label" style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>
                      تفاصيل ومحتويات الشحنة / الطرد (مطلوب):
                    </label>
                    <input
                      id="shipmentPkgDescInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="مثال: فستان سهرة + حذاء بيج كعب عالي / أجهزة إلكترونية وإكسسوارات"
                      value={packageDescription}
                      onChange={(e) => setPackageDescription(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="allowOpenPkg"
                      checked={allowOpenPackage}
                      onChange={(e) => setAllowOpenPackage(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-green)' }}
                    />
                    <label htmlFor="allowOpenPkg" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)' }}>
                      السماح للعميل بفتح الشحنة والمعاينة قبل السداد (إذن الفحص)
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="shipmentRecipientNameInput" className="form-label">اسم العميل المستلم:</label>
                    <input
                      id="shipmentRecipientNameInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="مثال: أحمد عبد الله"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="shipmentRecipientPhoneInput" className="form-label">رقم هاتف المستلم:</label>
                    <input
                      id="shipmentRecipientPhoneInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="010XXXXXXXX"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="shipmentCitySelect" className="form-label">المحافظة / المدينة:</label>
                    <select
                      id="shipmentCitySelect"
                      className="form-select"
                      value={selectedCityId}
                      onChange={(e) => {
                        const cid = Number.parseInt(e.target.value, 10);
                        setSelectedCityId(cid);
                        const firstZ = cities.find((c) => c.id === cid)?.zones[0]?.id;
                        if (firstZ) setSelectedZoneId(firstZ);
                      }}
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="shipmentZoneSelect" className="form-label">المنطقة:</label>
                    <select
                      id="shipmentZoneSelect"
                      className="form-select"
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(Number.parseInt(e.target.value, 10))}
                    >
                      {activeZones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="shipmentAddressInput" className="form-label">العنوان التفصيلي:</label>
                  <input
                    id="shipmentAddressInput"
                    type="text"
                    required
                    className="form-input"
                    placeholder="رقم العقار، اسم الشارع، علامة مميزة"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </div>

                {/* GPS Location Section */}
                <div style={{ background: 'var(--bg-offwhite)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                      ربط عنوان المستلم بالـ GPS وموقع الخريطة:
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoDetectGPS}
                      disabled={isLocating}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px' }}
                    >
                      <Compass size={14} />
                      <span>{isLocating ? 'جاري الالتقاط...' : 'التقاط موقع GPS الحالي'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="خط العرض Latitude (مثال: 30.0444)"
                      value={recipientLatitude}
                      onChange={(e) => setRecipientLatitude(e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="خط الطول Longitude (مثال: 31.2357)"
                      value={recipientLongitude}
                      onChange={(e) => setRecipientLongitude(e.target.value)}
                    />
                  </div>

                  {recipientLatitude && recipientLongitude && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                      <a
                        href={`https://maps.google.com/?q=${recipientLatitude},${recipientLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary-blue)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <MapPin size={13} />
                        <span>معاينة إحداثيات المستلم على خرائط Google Maps</span>
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="shipmentGoodsValueInput" className="form-label">ثمن البضاعة المطلوب تحصيله (ج.م):</label>
                    <input
                      id="shipmentGoodsValueInput"
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={goodsValue}
                      onChange={(e) => setGoodsValue(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="shipmentWeightInput" className="form-label">الوزن التقديري (كجم):</label>
                    <input
                      id="shipmentWeightInput"
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="shipmentDeliveryNotesInput" className="form-label">ملاحظات التوصيل للعميل:</label>
                  <input
                    id="shipmentDeliveryNotesInput"
                    type="text"
                    className="form-input"
                    placeholder="مثال: يرجى الاتصال قبل الوصول"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="btn btn-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ الشحنة وتوليد الباركود
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Courier */}
      {isAssignModalOpen && selectedShipment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                تعيين مندوب للشحنة {selectedShipment.tracking_number}
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignCourier}>
              <div className="modal-body">
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div><strong>المستلم:</strong> {selectedShipment.recipient_name} ({selectedShipment.destination_city} - {selectedShipment.destination_zone})</div>
                  <div><strong>المطلوب تحصيله:</strong> {Number.parseFloat(selectedShipment.total_cod_amount).toLocaleString('ar-EG')} ج.م</div>
                </div>

                <div className="form-group">
                  <label htmlFor="assignTargetCourierSelect" className="form-label">اختر المندوب المسؤول:</label>
                  <select
                    id="assignTargetCourierSelect"
                    className="form-select"
                    required
                    value={targetCourierId}
                    onChange={(e) => setTargetCourierId(Number.parseInt(e.target.value, 10))}
                  >
                    <option value="">-- اختر مناديب الفرع --</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.vehicle_type} - {c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                  <AlertTriangle size={16} color="var(--warning-amber)" />
                  <span>
                    يقوم النظام آلياً بمنع الإسناد إذا كان لدى المندوب عهدة متأخرة تجاوزت الحد المسموح به.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="btn btn-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  تأكيد الإسناد للمندوب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Status */}
      {isStatusModalOpen && selectedShipment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                تحديث حالة الشحنة {selectedShipment.tracking_number}
              </h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="updateStatusSelect" className="form-label">الحالة الجديدة:</label>
                  <select
                    id="updateStatusSelect"
                    className="form-select"
                    required
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                  >
                    <option value="">-- اختر الحالة --</option>
                    {selectedShipment.status === 'ASSIGNED' && (
                      <>
                        <option value="PICKED_UP">تم الاستلام في المركز (PICKED_UP)</option>
                        <option value="OUT_FOR_DELIVERY">خرج للتوصيل في الطريق (OUT_FOR_DELIVERY)</option>
                        <option value="CANCELLED">إلغاء الشحنة (CANCELLED)</option>
                      </>
                    )}
                    {selectedShipment.status === 'OUT_FOR_DELIVERY' && (
                      <>
                        <option value="DELIVERED">تم التسليم بنجاح (DELIVERED)</option>
                        <option value="FAILED_DELIVERY">فشل التسليم / تأجيل (FAILED_DELIVERY)</option>
                        <option value="RETURNED">مرتجع للفرع (RETURNED)</option>
                      </>
                    )}
                  </select>
                </div>

                {targetStatus === 'DELIVERED' && (
                  <div style={{ padding: '14px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="shipmentOtpCodeInput" className="form-label">كود تأكيد التسليم OTP (إن وجد):</label>
                      <input
                        id="shipmentOtpCodeInput"
                        type="text"
                        className="form-input"
                        placeholder="مثال: 8492"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="shipmentActualCodInput" className="form-label">المبلغ المحصل فعلياً (ج.م):</label>
                      <input
                        id="shipmentActualCodInput"
                        type="number"
                        className="form-input"
                        placeholder={selectedShipment.total_cod_amount}
                        value={actualCod}
                        onChange={(e) => setActualCod(e.target.value)}
                      />
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                      ✓ سيقوم النظام تلقائياً بتسجيل قيد مزدوج متزن لإثبات العهدة على المندوب وحفظ مستحقات التاجر.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="shipmentStatusReasonInput" className="form-label">ملاحظات أو سبب التغيير:</label>
                  <input
                    id="shipmentStatusReasonInput"
                    type="text"
                    className="form-input"
                    placeholder="ملاحظات المندوب أو سبب التأجيل"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="btn btn-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-success">
                  حفظ وتأكيد التغيير
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
