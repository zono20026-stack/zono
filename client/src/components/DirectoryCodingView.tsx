import React, { useState, useEffect } from 'react';
import { Customer, Merchant, Courier, CityWithZones, User } from '../types';
import { apiFetch } from '../api';
import {
  User as UserIcon,
  Plus,
  Search,
  MapPin,
  Compass,
  FileText,
  CreditCard,
  Coins,
  X,
  Truck,
  Printer
} from './icons';

interface DirectoryCodingViewProps {
  user?: User | null;
}

interface CustomerHistoryData {
  customer: Customer;
  shipments: Array<{
    id: number;
    tracking_number: string;
    merchant_name: string;
    package_description?: string;
    total_cod_amount: string;
    status: string;
    scheduled_delivery_date: string;
  }>;
}

interface CourierStatementData {
  courier: Courier;
  totalCollected: number;
  totalRemitted: number;
  netLiability: number;
  transactions: Array<{
    id: string | number;
    entry_number: string;
    entry_date: string;
    description: string;
    line_description?: string;
    debit: string;
    credit: string;
  }>;
}

interface MerchantStatementData {
  merchant: Merchant;
  totalCredit: number;
  totalDebit: number;
  netPayableBalance: number;
  transactions: Array<{
    id: string | number;
    entry_number: string;
    entry_date: string;
    description: string;
    line_description?: string;
    debit: string;
    credit: string;
  }>;
}

export const DirectoryCodingView: React.FC<DirectoryCodingViewProps> = ({ user: _user }) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'couriers' | 'merchants'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [cities, setCities] = useState<CityWithZones[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState<boolean>(false);
  const [isAddCourierOpen, setIsAddCourierOpen] = useState<boolean>(false);
  const [isAddMerchantOpen, setIsAddMerchantOpen] = useState<boolean>(false);

  // Statements & History View Modals
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<CustomerHistoryData | null>(null);
  const [selectedCourierStatement, setSelectedCourierStatement] = useState<CourierStatementData | null>(null);
  const [selectedMerchantStatement, setSelectedMerchantStatement] = useState<MerchantStatementData | null>(null);

  // Form states - Customer
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPhoneAlt, setCustPhoneAlt] = useState('');
  const [custCityId, setCustCityId] = useState<number>(1);
  const [custZoneId, setCustZoneId] = useState<number>(1);
  const [custAddress, setCustAddress] = useState('');
  const [custLat, setCustLat] = useState('');
  const [custLng, setCustLng] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Form states - Courier
  const [courName, setCourName] = useState('');
  const [courPhone, setCourPhone] = useState('');
  const [courNationalId, setCourNationalId] = useState('');
  const [courVehicle, setCourVehicle] = useState('MOTORCYCLE');
  const [courPlate, setCourPlate] = useState('');
  const [courBranchId, setCourBranchId] = useState<number>(1);
  const [courMaxDays, setCourMaxDays] = useState<number>(2);
  const [courMaxAmount, setCourMaxAmount] = useState<string>('25000');

  // Form states - Merchant
  const [merchBusinessName, setMerchBusinessName] = useState('');
  const [merchContactName, setMerchContactName] = useState('');
  const [merchPhone, setMerchPhone] = useState('');
  const [merchEmail, setMerchEmail] = useState('');
  const [merchCityId, setMerchCityId] = useState<number>(1);
  const [merchZoneId, setMerchZoneId] = useState<number>(1);
  const [merchPickupAddress, setMerchPickupAddress] = useState('');
  const [merchDiscount, setMerchDiscount] = useState<string>('0');
  const [merchLat, setMerchLat] = useState('');
  const [merchLng, setMerchLng] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'customers') {
        const res = await apiFetch(`/master/customers?search=${encodeURIComponent(search)}`);
        if (res.success) setCustomers(res.data);
      } else if (activeTab === 'couriers') {
        const res = await apiFetch('/master/couriers');
        if (res.success) setCouriers(res.data);
      } else if (activeTab === 'merchants') {
        const res = await apiFetch('/master/merchants');
        if (res.success) setMerchants(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل البيانات';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const res = await apiFetch('/master/cities-with-zones');
      if (res.success) {
        setCities(res.data);
        if (res.data.length > 0 && res.data[0].zones.length > 0) {
          setCustCityId(res.data[0].id);
          setCustZoneId(res.data[0].zones[0].id);
          setMerchCityId(res.data[0].id);
          setMerchZoneId(res.data[0].zones[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadData();
    void loadCities();
  }, [activeTab]);

  const handleDetectGPS = (type: 'cust' | 'merch') => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'المتصفح لا يدعم تحديد الموقع الجغرافي GPS' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        if (type === 'cust') {
          setCustLat(lat);
          setCustLng(lng);
        } else {
          setMerchLat(lat);
          setMerchLng(lng);
        }
        setFeedback({ type: 'success', message: 'تم التقاط إحداثيات GPS بنجاح!' });
      },
      (err) => {
        setFeedback({ type: 'error', message: `تعذر التقاط الموقع: ${err.message}` });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/master/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: custName,
          phone: custPhone,
          phoneAlt: custPhoneAlt || undefined,
          cityId: custCityId,
          zoneId: custZoneId,
          address: custAddress,
          latitude: custLat || undefined,
          longitude: custLng || undefined,
          notes: custNotes || undefined,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsAddCustomerOpen(false);
        setCustName('');
        setCustPhone('');
        setCustPhoneAlt('');
        setCustAddress('');
        setCustLat('');
        setCustLng('');
        setCustNotes('');
        void loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة العميل';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/master/couriers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: courName,
          phone: courPhone,
          nationalId: courNationalId,
          vehicleType: courVehicle,
          vehiclePlateNumber: courPlate || undefined,
          branchId: courBranchId,
          maxUnsettledDays: courMaxDays,
          maxUnsettledAmount: Number.parseFloat(courMaxAmount),
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsAddCourierOpen(false);
        setCourName('');
        setCourPhone('');
        setCourNationalId('');
        setCourPlate('');
        void loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة المندوب';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/master/merchants', {
        method: 'POST',
        body: JSON.stringify({
          businessName: merchBusinessName,
          contactName: merchContactName,
          phone: merchPhone,
          email: merchEmail || undefined,
          cityId: merchCityId,
          zoneId: merchZoneId,
          pickupAddress: merchPickupAddress,
          specialDiscountPercentage: Number.parseFloat(merchDiscount || '0'),
          latitude: merchLat || undefined,
          longitude: merchLng || undefined,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsAddMerchantOpen(false);
        setMerchBusinessName('');
        setMerchContactName('');
        setMerchPhone('');
        setMerchEmail('');
        setMerchPickupAddress('');
        setMerchLat('');
        setMerchLng('');
        void loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة التاجر';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleUpdateCourierGPS = async (courierId: number) => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'المتصفح لا يدعم تحديد الموقع الجغرافي GPS' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await apiFetch(`/master/couriers/${courierId}/location`, {
            method: 'POST',
            body: JSON.stringify({ latitude: lat, longitude: lng }),
          });
          if (res.success) {
            setFeedback({ type: 'success', message: res.message });
            void loadData();
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'فشل تحديث موقع المندوب';
          setFeedback({ type: 'error', message: msg });
        }
      },
      (err) => {
        setFeedback({ type: 'error', message: `تعذر التقاط موقع GPS: ${err.message}` });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleViewCustomerHistory = async (customer: Customer) => {
    try {
      const res = await apiFetch(`/master/customers/${customer.id}/history`);
      if (res.success) {
        setSelectedCustomerHistory(res.data as CustomerHistoryData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل جلب تاريخ العميل';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleViewCourierStatement = async (courier: Courier) => {
    try {
      const res = await apiFetch(`/master/couriers/${courier.id}/statement`);
      if (res.success) {
        setSelectedCourierStatement(res.data as CourierStatementData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل جلب كشف حساب المندوب';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleViewMerchantStatement = async (merchant: Merchant) => {
    try {
      const res = await apiFetch(`/master/merchants/${merchant.id}/statement`);
      if (res.success) {
        setSelectedMerchantStatement(res.data as MerchantStatementData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل جلب كشف حساب التاجر';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'badge-green';
      case 'RETURNED':
      case 'FAILED_DELIVERY':
        return 'badge-red';
      default:
        return 'badge-blue';
    }
  };

  const activeZones = cities.find((c) => c.id === custCityId)?.zones || [];
  const merchActiveZones = cities.find((c) => c.id === merchCityId)?.zones || [];

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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
            دليل التكويد والأطراف (العملاء، المناديب، التجار)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            تكويد دقيق لكافة الأطراف مع ربط عناوينهم باللوكيشن الجغرافي GPS وكشوف الحسابات
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'customers' && (
            <button onClick={() => setIsAddCustomerOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>تكويد عميل جديد</span>
            </button>
          )}
          {activeTab === 'couriers' && (
            <button onClick={() => setIsAddCourierOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>تكويد مندوب جديد</span>
            </button>
          )}
          {activeTab === 'merchants' && (
            <button onClick={() => setIsAddMerchantOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>تكويد تاجر جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('customers')}
        >
          <UserIcon size={16} />
          <span>دليل العملاء ({customers.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'couriers' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('couriers')}
        >
          <Truck size={16} />
          <span>دليل المناديب وتتبع GPS ({couriers.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'merchants' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('merchants')}
        >
          <CreditCard size={16} />
          <span>دليل التجار والشركاء ({merchants.length})</span>
        </button>
      </div>

      {/* Search Bar for Customers */}
      {activeTab === 'customers' && (
        <div className="card" style={{ padding: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingRight: '38px' }}
                placeholder="ابحث بالاسم، الكود، أو رقم الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void loadData()}
              />
            </div>
            <button onClick={() => { void loadData(); }} className="btn btn-secondary">بحث</button>
          </div>
        </div>
      )}

      {/* 1. CUSTOMERS TABLE */}
      {activeTab === 'customers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود العميل</th>
                  <th>الاسم</th>
                  <th>رقم الهاتف</th>
                  <th>المدينة والمنطقة</th>
                  <th>العنوان وخريطة الموقع</th>
                  <th>إجمالي الطلبات</th>
                  <th>المسلم</th>
                  <th>إجمالي الإنفاق</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      جاري تحميل بيانات دليل العملاء...
                    </td>
                  </tr>
                )}
                {!loading && customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>{c.customer_code}</td>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.city_name} - {c.zone_name}</td>
                    <td>
                      <div>{c.address}</div>
                      {c.google_maps_url ? (
                        <a
                          href={c.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary-blue)', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}
                        >
                          <MapPin size={12} />
                          <span>عرض في Google Maps</span>
                        </a>
                      ) : (
                        c.latitude && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 GPS: {c.latitude}, {c.longitude}</span>
                        )
                      )}
                    </td>
                    <td>{c.total_shipments_count || 0} طلب</td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{c.delivered_count || 0} مسلم</td>
                    <td style={{ fontWeight: 800 }}>{Number.parseFloat(c.total_spent || '0').toLocaleString('ar-EG')} ج.م</td>
                    <td>
                      <button
                        onClick={() => { void handleViewCustomerHistory(c); }}
                        className="btn btn-secondary btn-sm"
                        title="عرض سجل وتاريخ تعاملات العميل"
                      >
                        <FileText size={14} />
                        <span>سجل العميل</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. COURIERS TABLE */}
      {activeTab === 'couriers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود المندوب</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الرقم القومي</th>
                  <th>المركبة واللوحة</th>
                  <th>الفرع</th>
                  <th>العهدة المعلقة</th>
                  <th>الموقع الجغرافي الحي</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      جاري تحميل بيانات دليل المناديب...
                    </td>
                  </tr>
                )}
                {!loading && couriers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>{c.courier_code}</td>
                    <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                    <td>{c.phone}</td>
                    <td style={{ fontSize: '0.85rem' }}>{c.national_id}</td>
                    <td>
                      <div>{c.vehicle_type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.vehicle_plate_number || 'بدون لوحة'}</div>
                    </td>
                    <td>{c.branch_name}</td>
                    <td style={{ fontWeight: 800, color: Number.parseFloat(c.current_liability || '0') > 0 ? 'var(--warning-amber)' : 'var(--text-main)' }}>
                      {Number.parseFloat(c.current_liability || '0').toLocaleString('ar-EG')} ج.م
                    </td>
                    <td>
                      {c.last_known_lat ? (
                        <div>
                          <a
                            href={`https://maps.google.com/?q=${c.last_known_lat},${c.last_known_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.8rem' }}
                          >
                            <Compass size={14} />
                            <span>موقع حي نشط</span>
                          </a>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {c.last_location_updated_at ? new Date(c.last_location_updated_at).toLocaleTimeString('ar-EG') : ''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>غير متصل</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => { void handleUpdateCourierGPS(c.id); }}
                          className="btn btn-secondary btn-sm"
                          title="محاكاة بث موقع GPS حي للمندوب"
                        >
                          <Compass size={14} />
                          <span>بث GPS</span>
                        </button>
                        <button
                          onClick={() => { void handleViewCourierStatement(c); }}
                          className="btn btn-primary btn-sm"
                          title="عرض كشف حساب المندوب"
                        >
                          <Coins size={14} />
                          <span>كشف حساب</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MERCHANTS TABLE */}
      {activeTab === 'merchants' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود التاجر</th>
                  <th>الاسم التجاري</th>
                  <th>المسؤول</th>
                  <th>الهاتف</th>
                  <th>المدينة</th>
                  <th>عنوان الاستلام (Pickup)</th>
                  <th>خصم الشحن</th>
                  <th>المستحقات المعلقة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      جاري تحميل بيانات دليل التجار...
                    </td>
                  </tr>
                )}
                {!loading && merchants.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>{m.merchant_code}</td>
                    <td style={{ fontWeight: 700 }}>{m.business_name}</td>
                    <td>{m.contact_name}</td>
                    <td>{m.phone}</td>
                    <td>{m.city_name} - {m.zone_name}</td>
                    <td>
                      <div>{m.pickup_address}</div>
                      {m.google_maps_url && (
                        <a
                          href={m.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary-blue)', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}
                        >
                          <MapPin size={12} />
                          <span>موقع المتجر</span>
                        </a>
                      )}
                    </td>
                    <td>{m.special_discount_percentage}%</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                      {Number.parseFloat(m.current_payable || '0').toLocaleString('ar-EG')} ج.م
                    </td>
                    <td>
                      <button
                        onClick={() => { void handleViewMerchantStatement(m); }}
                        className="btn btn-secondary btn-sm"
                        title="عرض كشف حساب التاجر التفصيلي"
                      >
                        <FileText size={14} />
                        <span>كشف حساب</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {isAddCustomerOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                تكويد عميل جديد في النظام
              </h3>
              <button onClick={() => setIsAddCustomerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalCustNameInput" className="form-label">اسم العميل بالكامل:</label>
                    <input
                      id="modalCustNameInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="مثال: حسام الدين محمود"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalCustPhoneInput" className="form-label">رقم هاتف العميل:</label>
                    <input
                      id="modalCustPhoneInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="010XXXXXXXX"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="modalCustPhoneAltInput" className="form-label">رقم هاتف بديل / إضافي (اختياري):</label>
                  <input
                    id="modalCustPhoneAltInput"
                    type="text"
                    className="form-input"
                    placeholder="011XXXXXXXX"
                    value={custPhoneAlt}
                    onChange={(e) => setCustPhoneAlt(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalCustCitySelect" className="form-label">المحافظة:</label>
                    <select
                      id="modalCustCitySelect"
                      className="form-select"
                      value={custCityId}
                      onChange={(e) => {
                        const cid = Number.parseInt(e.target.value, 10);
                        setCustCityId(cid);
                        const firstZ = cities.find((c) => c.id === cid)?.zones[0]?.id;
                        if (firstZ) setCustZoneId(firstZ);
                      }}
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalCustZoneSelect" className="form-label">المنطقة:</label>
                    <select
                      id="modalCustZoneSelect"
                      className="form-select"
                      value={custZoneId}
                      onChange={(e) => setCustZoneId(Number.parseInt(e.target.value, 10))}
                    >
                      {activeZones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="modalCustAddressInput" className="form-label">العنوان التفصيلي:</label>
                  <input
                    id="modalCustAddressInput"
                    type="text"
                    required
                    className="form-input"
                    placeholder="رقم العقار، الشارع، علامة مميزة"
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                  />
                </div>

                {/* GPS Location Pick */}
                <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📍 ربط عنوان العميل باللوكيشن (GPS / Maps):</span>
                    <button
                      type="button"
                      onClick={() => handleDetectGPS('cust')}
                      className="btn btn-secondary btn-sm"
                    >
                      <Compass size={14} />
                      <span>تحديد موقعي الحالي GPS</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="خط العرض (Latitude) مثال: 30.0131"
                      value={custLat}
                      onChange={(e) => setCustLat(e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="خط الطول (Longitude) مثال: 31.4294"
                      value={custLng}
                      onChange={(e) => setCustLng(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="modalCustNotesInput" className="form-label">ملاحظات عن العميل (تعليمات تسليم دائمة):</label>
                  <input
                    id="modalCustNotesInput"
                    type="text"
                    className="form-input"
                    placeholder="مثال: يفضل الاتصال قبل التوصيل"
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddCustomerOpen(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ وتوليد كود العميل</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer History & Past Shipments */}
      {selectedCustomerHistory && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header no-print">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                سجل وتاريخ تعاملات العميل: {selectedCustomerHistory.customer.name} ({selectedCustomerHistory.customer.customer_code})
              </h3>
              <button onClick={() => setSelectedCustomerHistory(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body printable-statement">
              {/* ZONO Official Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FF6600', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src="/assets/zono_logo.jpeg"
                    alt="ZONO Delivery Logo"
                    style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #FF6600' }}
                  />
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FF6600', margin: 0 }}>
                      ZONO Delivery Services
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
                      زونو لخدمات التوصيل والشحن السريع | تقرير سجل العميل
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    كود العميل: {selectedCustomerHistory.customer.customer_code}
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-offwhite)', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><strong>الاسم:</strong> {selectedCustomerHistory.customer.name}</div>
                <div><strong>الهاتف:</strong> {selectedCustomerHistory.customer.phone}</div>
                <div><strong>العنوان:</strong> {selectedCustomerHistory.customer.address}</div>
              </div>

              <h4 style={{ fontWeight: 800, color: 'var(--primary-orange)', marginBottom: '12px' }}>سجل الشحنات والطلبات المسجلة:</h4>

              <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم التتبع</th>
                      <th>التاجر</th>
                      <th>تفاصيل الشحنة</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                      <th>تاريخ التوصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomerHistory.shipments.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary-orange)' }}>{s.tracking_number}</td>
                        <td>{s.merchant_name}</td>
                        <td>{s.package_description || 'طرد بضائع'}</td>
                        <td style={{ fontWeight: 700 }}>{Number.parseFloat(s.total_cod_amount).toLocaleString('ar-EG')} ج.م</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>{s.scheduled_delivery_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
              >
                <Printer size={16} />
                <span>طباعة التقرير</span>
              </button>
              <button onClick={() => setSelectedCustomerHistory(null)} className="btn btn-secondary">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Courier Statement */}
      {selectedCourierStatement && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header no-print">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                كشف حساب المندوب: {selectedCourierStatement.courier.full_name} ({selectedCourierStatement.courier.courier_code})
              </h3>
              <button onClick={() => setSelectedCourierStatement(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body printable-statement">
              {/* ZONO Official Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FF6600', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src="/assets/zono_logo.jpeg"
                    alt="ZONO Delivery Logo"
                    style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #FF6600' }}
                  />
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FF6600', margin: 0 }}>
                      ZONO Delivery Services
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
                      زونو لخدمات التوصيل والشحن السريع | كشف حساب عهدة المندوب
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    كود المندوب: {selectedCourierStatement.courier.courier_code}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '14px', background: 'var(--bg-offwhite)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي المبالغ المحصلة (COD):</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-orange)' }}>
                    {selectedCourierStatement.totalCollected.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي النقدية الموردة للخزينة:</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-green)' }}>
                    {selectedCourierStatement.totalRemitted.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>صافي العهدة المعلقة الحالية:</div>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', color: selectedCourierStatement.netLiability > 0 ? 'var(--warning-amber)' : 'var(--text-main)' }}>
                    {selectedCourierStatement.netLiability.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم القيد</th>
                      <th>التاريخ</th>
                      <th>البيان المحاسبي</th>
                      <th>مدين (Debit)</th>
                      <th>دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCourierStatement.transactions.map((tx, idx) => (
                      <tr key={`cr-tx-${tx.id || idx}`}>
                        <td style={{ fontWeight: 700, color: 'var(--primary-orange)' }}>{tx.entry_number}</td>
                        <td>{new Date(tx.entry_date).toLocaleDateString('ar-EG')}</td>
                        <td>{tx.description}</td>
                        <td style={{ fontWeight: 700, color: Number.parseFloat(tx.debit) > 0 ? 'var(--primary-orange)' : 'inherit' }}>
                          {Number.parseFloat(tx.debit) > 0 ? `${Number.parseFloat(tx.debit).toLocaleString('ar-EG')} ج.م` : '-'}
                        </td>
                        <td style={{ fontWeight: 700, color: Number.parseFloat(tx.credit) > 0 ? 'var(--accent-green)' : 'inherit' }}>
                          {Number.parseFloat(tx.credit) > 0 ? `${Number.parseFloat(tx.credit).toLocaleString('ar-EG')} ج.م` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
              >
                <Printer size={16} />
                <span>طباعة كشف الحساب</span>
              </button>
              <button onClick={() => setSelectedCourierStatement(null)} className="btn btn-secondary">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Merchant Statement */}
      {selectedMerchantStatement && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header no-print">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                كشف حساب التاجر: {selectedMerchantStatement.merchant.business_name} ({selectedMerchantStatement.merchant.merchant_code})
              </h3>
              <button onClick={() => setSelectedMerchantStatement(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body printable-statement">
              {/* ZONO Official Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FF6600', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src="/assets/zono_logo.jpeg"
                    alt="ZONO Delivery Logo"
                    style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #FF6600' }}
                  />
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FF6600', margin: 0 }}>
                      ZONO Delivery Services
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
                      زونو لخدمات التوصيل والشحن السريع | كشف حساب مستحقات التاجر
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    كود التاجر: {selectedMerchantStatement.merchant.merchant_code}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '14px', background: 'var(--bg-offwhite)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي الأمانات المستحقة:</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-green)' }}>
                    {selectedMerchantStatement.totalCredit.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي المبالغ المنصرفة للتاجر:</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-orange)' }}>
                    {selectedMerchantStatement.totalDebit.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>صافي الرصيد المتبقي للصرف:</div>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--accent-green)' }}>
                    {selectedMerchantStatement.netPayableBalance.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم القيد</th>
                      <th>التاريخ</th>
                      <th>البيان المحاسبي</th>
                      <th>مدين (صرف)</th>
                      <th>دائن (استحقاق)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMerchantStatement.transactions.map((tx, idx) => (
                      <tr key={`mrc-tx-${tx.id || idx}`}>
                        <td style={{ fontWeight: 700, color: 'var(--primary-orange)' }}>{tx.entry_number}</td>
                        <td>{new Date(tx.entry_date).toLocaleDateString('ar-EG')}</td>
                        <td>{tx.description}</td>
                        <td style={{ fontWeight: 700, color: Number.parseFloat(tx.debit) > 0 ? 'var(--primary-orange)' : 'inherit' }}>
                          {Number.parseFloat(tx.debit) > 0 ? `${Number.parseFloat(tx.debit).toLocaleString('ar-EG')} ج.م` : '-'}
                        </td>
                        <td style={{ fontWeight: 700, color: Number.parseFloat(tx.credit) > 0 ? 'var(--accent-green)' : 'inherit' }}>
                          {Number.parseFloat(tx.credit) > 0 ? `${Number.parseFloat(tx.credit).toLocaleString('ar-EG')} ج.م` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
              >
                <Printer size={16} />
                <span>طباعة كشف الحساب</span>
              </button>
              <button onClick={() => setSelectedMerchantStatement(null)} className="btn btn-secondary">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Courier */}
      {isAddCourierOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                تكويد مندوب جديد في الأسطول
              </h3>
              <button onClick={() => setIsAddCourierOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCourier}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalCourNameInput" className="form-label">الاسم رباعي:</label>
                    <input
                      id="modalCourNameInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="اسم المندوب"
                      value={courName}
                      onChange={(e) => setCourName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalCourPhoneInput" className="form-label">رقم الهاتف (حساب الدخول):</label>
                    <input
                      id="modalCourPhoneInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="010XXXXXXXX"
                      value={courPhone}
                      onChange={(e) => setCourPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalCourNationalIdInput" className="form-label">الرقم القومي (14 رقم):</label>
                    <input
                      id="modalCourNationalIdInput"
                      type="text"
                      required
                      maxLength={14}
                      className="form-input"
                      placeholder="الرقم القومي"
                      value={courNationalId}
                      onChange={(e) => setCourNationalId(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalCourVehicleSelect" className="form-label">نوع وسيلة النقل:</label>
                    <select
                      id="modalCourVehicleSelect"
                      className="form-select"
                      value={courVehicle}
                      onChange={(e) => setCourVehicle(e.target.value)}
                    >
                      <option value="MOTORCYCLE">دراجة نارية (موتوسيكل)</option>
                      <option value="CAR">سيارة ملاكي</option>
                      <option value="VAN">سيارة فان مغلقة</option>
                      <option value="PICKUP">سيارة ربع نقل</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalCourPlateInput" className="form-label">رقم لوحة المركبة:</label>
                    <input
                      id="modalCourPlateInput"
                      type="text"
                      className="form-input"
                      placeholder="مثال: ق د س 918"
                      value={courPlate}
                      onChange={(e) => setCourPlate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalCourMaxDaysInput" className="form-label">أيام مهلة التوريد المسموح بها:</label>
                    <input
                      id="modalCourMaxDaysInput"
                      type="number"
                      required
                      min={1}
                      max={7}
                      className="form-input"
                      value={courMaxDays}
                      onChange={(e) => setCourMaxDays(Number.parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddCourierOpen(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ وتكويد المندوب</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Merchant */}
      {isAddMerchantOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                تكويد تاجر وشريك جديد
              </h3>
              <button onClick={() => setIsAddMerchantOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMerchant}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalMerchBusinessInput" className="form-label">الاسم التجاري للمتجر:</label>
                    <input
                      id="modalMerchBusinessInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="اسم النشاط أو المتجر"
                      value={merchBusinessName}
                      onChange={(e) => setMerchBusinessName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalMerchContactInput" className="form-label">اسم المسؤول / جهة الاتصال:</label>
                    <input
                      id="modalMerchContactInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="اسم المفوض بالإدارة"
                      value={merchContactName}
                      onChange={(e) => setMerchContactName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalMerchPhoneInput" className="form-label">رقم الهاتف (حساب الدخول):</label>
                    <input
                      id="modalMerchPhoneInput"
                      type="text"
                      required
                      className="form-input"
                      placeholder="010XXXXXXXX"
                      value={merchPhone}
                      onChange={(e) => setMerchPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalMerchDiscountInput" className="form-label">نسبة خصم الشحن الخاصة (%):</label>
                    <input
                      id="modalMerchDiscountInput"
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      className="form-input"
                      value={merchDiscount}
                      onChange={(e) => setMerchDiscount(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modalMerchCitySelect" className="form-label">المحافظة:</label>
                    <select
                      id="modalMerchCitySelect"
                      className="form-select"
                      value={merchCityId}
                      onChange={(e) => {
                        const cid = Number.parseInt(e.target.value, 10);
                        setMerchCityId(cid);
                        const firstZ = cities.find((c) => c.id === cid)?.zones[0]?.id;
                        if (firstZ) setMerchZoneId(firstZ);
                      }}
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="modalMerchZoneSelect" className="form-label">المنطقة:</label>
                    <select
                      id="modalMerchZoneSelect"
                      className="form-select"
                      value={merchZoneId}
                      onChange={(e) => setMerchZoneId(Number.parseInt(e.target.value, 10))}
                    >
                      {merchActiveZones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="modalMerchPickupAddressInput" className="form-label">عنوان الاستلام الدائم (Pickup Address):</label>
                  <input
                    id="modalMerchPickupAddressInput"
                    type="text"
                    required
                    className="form-input"
                    placeholder="العنوان الذي سيتوجه إليه المندوب لاستلام الشحنات"
                    value={merchPickupAddress}
                    onChange={(e) => setMerchPickupAddress(e.target.value)}
                  />
                </div>

                {/* GPS Location Pick */}
                <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📍 ربط مقر المتجر باللوكيشن (GPS / Maps):</span>
                    <button
                      type="button"
                      onClick={() => handleDetectGPS('merch')}
                      className="btn btn-secondary btn-sm"
                    >
                      <Compass size={14} />
                      <span>تحديد موقع المتجر GPS</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="خط العرض (Latitude)"
                      value={merchLat}
                      onChange={(e) => setMerchLat(e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="خط الطول (Longitude)"
                      value={merchLng}
                      onChange={(e) => setMerchLng(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddMerchantOpen(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ وتكويد التاجر</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
