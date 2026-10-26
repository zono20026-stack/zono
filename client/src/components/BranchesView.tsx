import React, { useState, useEffect } from 'react';
import { Branch } from '../types';
import { apiFetch } from '../api';
import { Plus, X, MapPin, Phone } from './icons';

export const BranchesView: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const [branchCode, setBranchCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/master/branches');
      if (res.success) setBranches(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/master/branches', {
        method: 'POST',
        body: JSON.stringify({ branchCode, name, phone, address }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setIsAddModalOpen(false);
        setBranchCode('');
        setName('');
        setPhone('');
        setAddress('');
        loadBranches();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
            إدارة الفروع ومراكز التوزيع
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            إضافة وتعديل فروع الشركة ديناميكياً من شاشة الإدارة بدون الحاجة لتعديل أي كود برمجي
          </p>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <Plus size={18} />
          <span>إضافة فرع جديد</span>
        </button>
      </div>

      {/* Branches Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {branches.map((b) => (
          <div key={b.id} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span className="badge badge-blue" style={{ marginBottom: '6px' }}>{b.branch_code}</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                  {b.name}
                </h3>
              </div>
              <span className={`badge ${b.is_active ? 'badge-green' : 'badge-red'}`}>
                {b.is_active ? 'نشط' : 'معطل'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="var(--primary-blue)" />
                <span>{b.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={16} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{b.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Branch Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                إضافة فرع جديد في النظام
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">كود الفرع:</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="مثال: TANT-01"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">اسم الفرع:</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="مثال: فرع طنطا والغربية"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">هاتف الفرع:</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="010XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">عنوان مقر الفرع:</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="الشارع، المدينة، المعلم المميز"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ وتفعيل الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
