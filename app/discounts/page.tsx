'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

interface Student {
  _id: string;
  name: string;
  phone: string;
  monthlyPrice: number;
}

interface DiscountData {
  _id: string;
  familyId: string;
  familyName: string;
  students: Student[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  reason: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const discountReasons = [
  { value: 'family', labelKey: 'oilaviy' },
  { value: 'financial_aid', labelKey: 'moddiy' },
  { value: 'orphan', labelKey: 'yetim' },
  { value: 'disabled', labelKey: 'nogiron' },
  { value: 'low_income', labelKey: 'kamta minotli' },
  { value: 'excellent', labelKey: 'alochi' },
  { value: 'special', labelKey: 'maxsus' },
  { value: 'other', labelKey: 'boshqa' },
];

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountData | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    familyName: '',
    studentIds: [] as string[],
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    reason: 'family',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [activeOnly]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [discountsRes, studentsRes] = await Promise.all([
        fetch(`/api/discounts${activeOnly ? '?active=true' : ''}`),
        fetch('/api/students?status=active'),
      ]);
      const discountsData = await discountsRes.json();
      const studentsData = await studentsRes.json();
      setDiscounts(discountsData);
      setStudents(studentsData.filter((s: Student) => s.monthlyPrice > 0));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingDiscount 
        ? `/api/discounts/${editingDiscount._id}` 
        : '/api/discounts';
      const method = editingDiscount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
        }),
      });

      if (res.ok) {
        fetchData();
        closeModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Error saving discount:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const res = await fetch(`/api/discounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
    }
  };

  const openModal = (discount?: DiscountData) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        familyName: discount.familyName,
        studentIds: discount.students?.map(s => s._id) || [],
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        reason: discount.reason,
        startDate: new Date(discount.startDate).toISOString().split('T')[0],
        endDate: new Date(discount.endDate).toISOString().split('T')[0],
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        familyName: '',
        studentIds: [],
        discountType: 'percentage',
        discountValue: 0,
        reason: 'family',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  const getReasonLabel = (reason: string): string => {
    const reasonsMap: Record<string, string> = {
      family: 'Oilaviy chegirma',
      financial_aid: 'Moddiy yordam',
      orphan: 'Yetim',
      disabled: 'Nogiron',
      low_income: "Kam ta'minotli",
      excellent: "A'lochi",
      special: 'Maxsus',
      other: 'Boshqa',
    };
    return reasonsMap[reason] || reason;
  };

  const summary = {
    totalDiscounts: discounts.length,
    activeCount: discounts.filter(d => d.isActive).length,
    totalSavings: discounts.reduce((sum, d) => sum + d.discountAmount, 0),
    familiesCount: new Set(discounts.map(d => d.familyName)).size,
  };

  return (
    <DashboardLayout title="Chegirmalar">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon primary">🎫</div>
          <div className="stat-label">Jami chegirmalar</div>
          <div className="stat-value">{summary.totalDiscounts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success">✓</div>
          <div className="stat-label">Faol</div>
          <div className="stat-value">{summary.activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon warning">👨‍👩‍👧‍👦</div>
          <div className="stat-label">Oilaviy guruhlar</div>
          <div className="stat-value">{summary.familiesCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger">💸</div>
          <div className="stat-label">Jami chegirma</div>
          <div className="stat-value">{formatMoney(summary.totalSavings)}</div>
        </div>
      </div>

      <div className="toolbar">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          <span>Faol chegirmalar</span>
        </label>
        <button className="btn btn-primary ml-auto" onClick={() => openModal()}>
          + Chegirma qo'shish
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : discounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎫</div>
            <div className="empty-state-title">{t('noData')}</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Oilaviy nom</th>
                  <th>Talabalar</th>
                  <th>Chegirma turi</th>
                  <th>Asl narx</th>
                  <th>Chegirma</th>
                  <th>Yangi narx</th>
                  <th>Sabab</th>
                  <th>Muddati</th>
                  <th>Holat</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr key={discount._id}>
                    <td className="font-bold">{discount.familyName}</td>
                    <td>{discount.students?.length || 0}</td>
                    <td>
                      {discount.discountType === 'percentage' 
                        ? `${discount.discountValue}%` 
                        : formatMoney(discount.discountValue)}
                    </td>
                    <td>{formatMoney(discount.originalTotal)}</td>
                    <td className="text-green-600">-{formatMoney(discount.discountAmount)}</td>
                    <td className="font-bold">{formatMoney(discount.finalTotal)}</td>
                    <td><span className="badge badge-info">{getReasonLabel(discount.reason)}</span></td>
                    <td className="text-sm">
                      {new Date(discount.startDate).toLocaleDateString()} - 
                      {new Date(discount.endDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${discount.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {discount.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openModal(discount)}
                        >
                          {t('edit')}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(discount._id)}
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingDiscount ? 'Chegirmani tahrirlash' : 'Yangi chegirma'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Oilaviy nom *</label>
            <input
              type="text"
              className="input"
              value={formData.familyName}
              onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
              placeholder="Masalan: Karimov oilasi"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Talabalarni tanlash *</label>
            <div className="max-h-48 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-2">
              {students.map((student) => (
                <label key={student._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.studentIds.includes(student._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          studentIds: [...formData.studentIds, student._id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          studentIds: formData.studentIds.filter(id => id !== student._id),
                        });
                      }
                    }}
                  />
                  <span>{student.name}</span>
                  <span className="text-gray-400">{formatMoney(student.monthlyPrice)}</span>
                </label>
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Tanlangan: {formData.studentIds.length} ta talaba
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Chegirma turi</label>
              <select
                className="select"
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
              >
                <option value="percentage">Foiz (%)</option>
                <option value="fixed">Summa (so'm)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                {formData.discountType === 'percentage' ? 'Foiz (%)' : 'Summa'}
              </label>
              <input
                type="number"
                className="input"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                min="0"
                max={formData.discountType === 'percentage' ? 100 : undefined}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Chegirma sababi</label>
            <select
              className="select"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            >
              {discountReasons.map((r) => (
                <option key={r.value} value={r.value}>{getReasonLabel(r.value)}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Boshlanish sanasi</label>
              <input
                type="date"
                className="input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tugash sanasi</label>
              <input
                type="date"
                className="input"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary flex-1">
              {t('save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}