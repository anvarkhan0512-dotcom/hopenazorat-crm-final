'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

interface ExtraFan {
  groupId: string;
  price: number;
  discountAmount: number;
  discountEndDate?: string;
}

interface Student {
  _id: string;
  name: string;
  phone: string;
  phones?: string[];
  arrivalDate?: string;
  parentType?: string;
  parentName?: string;
  parentPhone?: string;
  groupId?: { _id: string; name: string };
  status: 'active' | 'inactive' | 'left';
  basePrice?: number;
  monthlyPrice: number;
  finalPrice?: number;
  discountAmount?: number;
  discountEndDate?: string;
  parentAccessCode?: string;
  parentTelegramChatId?: string;
  parentUserId?: string;
  debtReminderUntil?: string;
  telegramId?: string;
  extraFans?: ExtraFan[];
  extraDiscount?: number;
}

interface Group {
  _id: string;
  name: string;
  price?: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const { t, locale } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    phones: ['+998'] as string[],
    arrivalDate: new Date().toISOString().split('T')[0],
    parentType: '' as '' | 'father' | 'mother',
    parentName: '',
    parentPhone: '+998',
    groupId: '',
    status: 'active' as 'active' | 'inactive' | 'left',
    basePrice: 0,
    discountAmount: 0,
    discountEndDate: '',
    parentTelegramChatId: '',
    parentUserId: '',
    debtReminderUntil: '',
    username: '',
    password: '',
    telegramId: '',
    extraFans: [] as ExtraFan[],
    extraDiscount: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, groupsRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/groups'),
      ]);
      const studentsData = await studentsRes.json();
      const groupsData = await groupsRes.json();
      setStudents(studentsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (arrivalDate?: string) => {
    if (!arrivalDate) return '-';
    const start = new Date(arrivalDate);
    const end = new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return `${months} oy, ${days} kun`;
  };

  const filteredStudents = students.filter((student) => {
    const phoneHay = [student.phone, ...(student.phones || [])].join(' ');
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) || phoneHay.includes(search);
    const matchesStatus = !statusFilter || student.status === statusFilter;
    const matchesGroup = !groupFilter || student.groupId?._id === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const exportToExcel = () => {
    const dataToExport = filteredStudents.map((s, i) => ({
      '№': i + 1,
      'Ism': s.name,
      'Telefon': (s.phones || [s.phone]).join(', '),
      'Guruh': s.groupId?.name || '-',
      'Oylik narx': s.monthlyPrice,
      'Holat': s.status === 'active' ? 'Faol' : s.status === 'left' ? 'Ketgan' : 'Nofaol'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Talabalar');
    
    const groupName = groupFilter ? groups.find(g => g._id === groupFilter)?.name : 'barchasi';
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `talabalar_${groupName}_${date}.xlsx`);
  };

  const formatPhone = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      digits = digits.substring(3);
    }
    digits = digits.substring(0, 9);
    
    let res = '+998';
    if (digits.length > 0) {
      res += '(' + digits.substring(0, 2);
    }
    if (digits.length > 2) {
      res += ') ' + digits.substring(2, 5);
    }
    if (digits.length > 5) {
      res += '-' + digits.substring(5, 7);
    }
    if (digits.length > 7) {
      res += '-' + digits.substring(7, 9);
    }
    return res;
  };

  const handlePhoneChange = (val: string, idx: number, field: 'phones' | 'parentPhone' = 'phones') => {
    const formatted = formatPhone(val);
    if (field === 'phones') {
      const next = [...formData.phones];
      next[idx] = formatted;
      setFormData({ ...formData, phones: next });
    } else {
      setFormData({ ...formData, parentPhone: formatted });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingStudent ? `/api/students/${editingStudent._id}` : '/api/students';
    const method = editingStudent ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: formData.phones[0] || '',
          phones: formData.phones.map((p) => p.trim()).filter(p => p !== '+998'),
          groupId: formData.groupId || null,
        }),
      });

      if (res.ok) {
        if (!editingStudent) {
          const j = await res.json();
          if (j.credentials?.username && j.credentials?.password) {
            window.alert(
              `Talaba akkaunti yaratildi (bir marta ko‘rsatiladi):\n\nLogin: ${j.credentials.username}\nParol: ${j.credentials.password}`
            );
          }
        }
        fetchData();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      const plist =
        student.phones && student.phones.length > 0 ? [...student.phones] : [student.phone];
      setFormData({
        name: student.name,
        phones: plist.length ? plist : ['+998'],
        arrivalDate: student.arrivalDate ? String(student.arrivalDate).split('T')[0] : new Date().toISOString().split('T')[0],
        parentType: (student.parentType as 'father' | 'mother' | '') || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '+998',
        groupId: student.groupId?._id || '',
        status: student.status,
        basePrice: student.basePrice ?? student.monthlyPrice ?? 0,
        discountAmount: student.discountAmount ?? 0,
        discountEndDate: student.discountEndDate
          ? String(student.discountEndDate).split('T')[0]
          : '',
        parentTelegramChatId: student.parentTelegramChatId || '',
        parentUserId: student.parentUserId ? String(student.parentUserId) : '',
        debtReminderUntil: student.debtReminderUntil
          ? String(student.debtReminderUntil).split('T')[0]
          : '',
        username: '',
        password: '',
        telegramId: student.telegramId || '',
        extraFans: student.extraFans || [],
        extraDiscount: student.extraDiscount || 0,
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        phones: ['+998'],
        arrivalDate: new Date().toISOString().split('T')[0],
        parentType: '',
        parentName: '',
        parentPhone: '+998',
        groupId: '',
        status: 'active',
        basePrice: 0,
        discountAmount: 0,
        discountEndDate: '',
        parentTelegramChatId: '',
        parentUserId: '',
        debtReminderUntil: '',
        username: '',
        password: '',
        telegramId: '',
        extraFans: [],
        extraDiscount: 0,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
  };

  const addExtraFan = () => {
    setFormData({
      ...formData,
      extraFans: [...formData.extraFans, { groupId: '', price: 0, discountAmount: 0 }]
    });
  };

  const updateExtraFan = (idx: number, field: keyof ExtraFan, value: any) => {
    const next = [...formData.extraFans];
    next[idx] = { ...next[idx], [field]: value };
    
    if (field === 'groupId') {
      const g = groups.find(group => group._id === value);
      if (g) next[idx].price = g.price || 0;
    }
    
    setFormData({ ...formData, extraFans: next });
  };

  if (loading) {
    return (
      <DashboardLayout title={t('students')}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('students')}>
      <div className="toolbar">
        <input
          type="text"
          className="input"
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t('selectStatus')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>
        <select
          className="select"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value="">{t('allGroups')}</option>
          {groups.map((group) => (
            <option key={group._id} value={group._id}>{group.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className="btn btn-secondary bg-green-600 text-white hover:bg-green-700" onClick={exportToExcel}>
            Excelga yuklash
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            + {t('add')}
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('phone')}</th>
              <th>{t('group')}</th>
              <th>Ota-ona ID</th>
              <th>{t('monthlyPrice')} / chegirma</th>
              <th>{t('status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8">{t('noData')}</td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td className="text-sm">
                    {(student.phones && student.phones.length > 0
                      ? student.phones
                      : [student.phone]
                    ).join(', ')}
                  </td>
                  <td>{student.groupId?.name || '-'}</td>
                  <td className="font-mono text-xs">{student.parentAccessCode || '—'}</td>
                  <td>
                    {formatMoney(student.monthlyPrice, locale)}
                    {(student.discountAmount ?? 0) > 0 && (
                      <span className="text-xs text-amber-700 block">
                        −{formatMoney(student.discountAmount ?? 0, locale)}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${student.status === 'active' ? 'badge-success' : student.status === 'left' ? 'badge-warning' : 'badge-danger'}`}>
                      {student.status === 'active' ? t('active') : student.status === 'left' ? 'Ketgan' : t('inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => openModal(student)}
                      >
                        {t('edit')}
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => handleDelete(student._id)}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingStudent ? t('edit') : t('add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label font-bold">{t('name')}</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label font-bold">Tel raqamlar (birinchi — asosiy login)</label>
            {formData.phones.map((p, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="+998(XX) XXX-XX-XX"
                  value={p}
                  onChange={(e) => handlePhoneChange(e.target.value, idx)}
                  required={idx === 0}
                />
                {idx > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        phones: formData.phones.filter((_, j) => j !== idx),
                      })
                    }
                  >
                    −
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFormData({ ...formData, phones: [...formData.phones, '+998'] })}
            >
              + telefon qo'shish
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold">Kelgan sanasi</label>
              <input
                type="date"
                className="input"
                value={formData.arrivalDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
              />
              <p className="text-xs text-purple-600 mt-1 font-medium">
                Biz bilan: {calculateDuration(formData.arrivalDate)}
              </p>
            </div>
            <div className="form-group">
            <label className="form-label font-bold">Telegram ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={formData.telegramId}
                onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                placeholder="Telegram user id"
              />
              {editingStudent && (
                <a 
                  href={`https://t.me/hopenazorat_bot?start=${editingStudent._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary bg-blue-50 text-blue-600 border-blue-200 text-xs flex items-center gap-1"
                >
                  ✈️ Botga ulash
                </a>
              )}
            </div>
          </div>
          </div>

          <div className="form-group border-t pt-4">
            <label className="form-label font-bold">Asosiy Fan (Guruh)</label>
            <div className="grid grid-cols-2 gap-4">
              <select
                className="select"
                value={formData.groupId}
                onChange={(e) => {
                  const g = groups.find(group => group._id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    groupId: e.target.value,
                    basePrice: g?.price || 0 
                  });
                }}
              >
                <option value="">{t('selectGroup')}</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>{group.name}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="number"
                  className="input"
                  placeholder="Narxi"
                  value={formData.basePrice}
                  onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value, 10) || 0 })}
                />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">so'm</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <input
                type="number"
                className="input"
                placeholder="Chegirma"
                value={formData.discountAmount}
                onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                onChange={(e) => setFormData({ ...formData, discountAmount: parseInt(e.target.value, 10) || 0 })}
              />
              <input
                type="date"
                className="input"
                value={formData.discountEndDate}
                onChange={(e) => setFormData({ ...formData, discountEndDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label font-bold">Qo'shimcha fanlar</label>
              <button type="button" onClick={addExtraFan} className="btn btn-secondary btn-sm">+ Fan qo'shish</button>
            </div>
            <div className="space-y-4">
              {formData.extraFans.map((fan, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl border space-y-2 relative">
                  <button 
                    type="button" 
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-sm"
                    onClick={() => setFormData({ ...formData, extraFans: formData.extraFans.filter((_, j) => j !== idx) })}
                  >✕</button>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="select"
                      value={fan.groupId}
                      onChange={(e) => updateExtraFan(idx, 'groupId', e.target.value)}
                    >
                      <option value="">Fan tanlang</option>
                      {groups.map((g) => (
                        <option key={g._id} value={g._id}>{g.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="input"
                      placeholder="Narxi"
                      value={fan.price}
                      onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                      onChange={(e) => updateExtraFan(idx, 'price', parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="input"
                      placeholder="Chegirma"
                      value={fan.discountAmount}
                      onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                      onChange={(e) => updateExtraFan(idx, 'discountAmount', parseInt(e.target.value, 10) || 0)}
                    />
                    <input
                      type="date"
                      className="input"
                      value={fan.discountEndDate}
                      onChange={(e) => updateExtraFan(idx, 'discountEndDate', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group border-t pt-4">
            <label className="form-label font-bold">Qo'shimcha chegirma (jami)</label>
            <input
              type="number"
              className="input"
              value={formData.extraDiscount}
              onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
              onChange={(e) => setFormData({ ...formData, extraDiscount: parseInt(e.target.value, 10) || 0 })}
            />
            {formData.extraFans.length > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                Har bir fan uchun: {formatMoney(Math.round(formData.extraDiscount / (formData.extraFans.length + 1)), locale)}
              </p>
            )}
          </div>

          <div className="form-group border-t pt-4">
            <label className="form-label font-bold">Ota-ona ma'lumotlari</label>
            <div className="grid grid-cols-2 gap-4">
              <select
                className="select"
                value={formData.parentType}
                onChange={(e) => setFormData({ ...formData, parentType: e.target.value as any })}
              >
                <option value="">Ota-ona turi</option>
                <option value="father">{t('father')}</option>
                <option value="mother">{t('mother')}</option>
              </select>
              <input
                type="text"
                className="input"
                placeholder={t('parentName')}
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
              />
            </div>
            <input
              type="text"
              className="input mt-2"
              placeholder="Ota-ona tel"
              value={formData.parentPhone}
              onChange={(e) => handlePhoneChange(e.target.value, 0, 'parentPhone')}
            />
          </div>

          <div className="form-group">
            <label className="form-label font-bold">Ota-ona Telegram chat ID</label>
            <input
              type="text"
              className="input"
              value={formData.parentTelegramChatId}
              onChange={(e) => setFormData({ ...formData, parentTelegramChatId: e.target.value })}
            />
          </div>

          <div className="form-group border-t pt-4">
            <label className="form-label font-bold">{t('status')}</label>
            <select
              className="select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
              <option value="left">Ketgan (Arxiv)</option>
            </select>
          </div>

          <div className="flex gap-3 mt-8 pt-4 border-t">
            <button type="submit" className="btn btn-primary flex-1 py-3 text-lg font-bold shadow-lg">
              {t('save')}
            </button>
            <button type="button" className="btn btn-secondary px-6" onClick={closeModal}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount) + ' so\'m';
}
