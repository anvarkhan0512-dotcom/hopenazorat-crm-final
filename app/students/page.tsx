'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

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
  status: 'active' | 'inactive';
  basePrice?: number;
  monthlyPrice: number;
  finalPrice?: number;
  discountAmount?: number;
  discountEndDate?: string;
  parentAccessCode?: string;
  parentTelegramChatId?: string;
  parentUserId?: string;
  debtReminderUntil?: string;
}

interface Group {
  _id: string;
  name: string;
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
    phones: [''] as string[],
    arrivalDate: '',
    parentType: '' as '' | 'father' | 'mother',
    parentName: '',
    parentPhone: '',
    groupId: '',
    status: 'active' as 'active' | 'inactive',
    basePrice: 0,
    discountAmount: 0,
    discountEndDate: '',
    parentTelegramChatId: '',
    parentUserId: '',
    debtReminderUntil: '',
    username: '',
    password: '',
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

  const filteredStudents = students.filter((student) => {
    const phoneHay = [student.phone, ...(student.phones || [])].join(' ');
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) || phoneHay.includes(search);
    const matchesStatus = !statusFilter || student.status === statusFilter;
    const matchesGroup = !groupFilter || student.groupId?._id === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingStudent ? `/api/students/${editingStudent._id}` : '/api/students';
    const method = editingStudent ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phones[0] || '',
          phones: formData.phones.map((p) => p.trim()).filter(Boolean),
          arrivalDate: formData.arrivalDate || undefined,
          parentType: formData.parentType || undefined,
          parentName: formData.parentName || undefined,
          parentPhone: formData.parentPhone || undefined,
          groupId: formData.groupId || null,
          username: formData.username || undefined,
          password: formData.password || undefined,
          status: formData.status,
          basePrice: formData.basePrice,
          discountAmount: formData.discountAmount,
          discountEndDate: formData.discountEndDate || undefined,
          parentTelegramChatId: formData.parentTelegramChatId || undefined,
          debtReminderUntil: formData.debtReminderUntil || undefined,
          ...(editingStudent && formData.parentUserId
            ? { parentUserId: formData.parentUserId || null }
            : {}),
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
        phones: plist.length ? plist : [''],
        arrivalDate: student.arrivalDate ? String(student.arrivalDate).split('T')[0] : '',
        parentType: (student.parentType as 'father' | 'mother' | '') || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
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
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        phones: [''],
        arrivalDate: '',
        parentType: '',
        parentName: '',
        parentPhone: '',
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
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
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
        <button className="btn btn-primary" onClick={() => openModal()}>
          + {t('add')}
        </button>
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
                    <span className={`badge ${student.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {student.status === 'active' ? t('active') : t('inactive')}
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
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('name')}</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tel raqamlar (birinchi — asosiy login)</label>
            {formData.phones.map((p, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={idx === 0 ? '+998...' : '+998... qo‘shimcha'}
                  value={p}
                  onChange={(e) => {
                    const next = [...formData.phones];
                    next[idx] = e.target.value;
                    setFormData({ ...formData, phones: next });
                  }}
                  required={idx === 0}
                />
                {idx > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
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
              className="btn btn-secondary btn-sm mt-1"
              onClick={() => setFormData({ ...formData, phones: [...formData.phones, ''] })}
            >
              + telefon
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Kelgan sanasi</label>
            <input
              type="date"
              className="input"
              value={formData.arrivalDate}
              onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('username')} ({t('optional')})</label>
            <input
              type="text"
              className="input"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Login kiriting..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('password')} ({t('optional')})</label>
            <input
              type="text"
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Parol kiriting..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ota-ona turi</label>
            <select
              className="select"
              value={formData.parentType}
              onChange={(e) =>
                setFormData({ ...formData, parentType: e.target.value as 'father' | 'mother' | '' })
              }
            >
              <option value="">—</option>
              <option value="father">{t('father')}</option>
              <option value="mother">{t('mother')}</option>
            </select>
          </div>

          {formData.parentType && (
            <>
              <div className="form-group">
                <label className="form-label">
                  {formData.parentType === 'father' ? t('fatherName') : t('motherName')}
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  placeholder={t('parentName')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {formData.parentType === 'father' ? t('fatherPhone') : t('motherPhone')}
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="+998..."
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">{t('group')}</label>
            <select
              className="select"
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            >
              <option value="">{t('selectGroup')}</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>{group.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('monthlyPrice')} (asosiy)</label>
            <input
              type="number"
              className="input"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Chegirma (so&apos;m)</label>
            <input
              type="number"
              className="input"
              value={formData.discountAmount}
              onChange={(e) =>
                setFormData({ ...formData, discountAmount: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Chegirma tugash sanasi</label>
            <input
              type="date"
              className="input"
              value={formData.discountEndDate}
              onChange={(e) => setFormData({ ...formData, discountEndDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ota-ona Telegram chat ID (eslatma uchun)</label>
            <input
              type="text"
              className="input"
              value={formData.parentTelegramChatId}
              onChange={(e) => setFormData({ ...formData, parentTelegramChatId: e.target.value })}
              placeholder="Telegram chat id (faqat raqam)"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Qarz eslatmasi tugash sanasi (Telegram, kunlik)</label>
            <input
              type="date"
              className="input"
              value={formData.debtReminderUntil}
              onChange={(e) => setFormData({ ...formData, debtReminderUntil: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Bo‘sh qoldirilsa, avtomatik qarz xabarlari yuborilmaydi.
            </p>
          </div>
          {editingStudent && (
            <>
              <div className="form-group">
                <label className="form-label">Ota-ona ID (farzandni bog‘lash uchun)</label>
                <div className="flex gap-2 flex-wrap items-center">
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {editingStudent.parentAccessCode || '—'}
                  </code>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const r = await fetch(`/api/students/${editingStudent._id}/regenerate-code`, {
                        method: 'POST',
                      });
                      const j = await r.json();
                      if (r.ok) {
                        setEditingStudent({ ...editingStudent, parentAccessCode: j.parentAccessCode });
                        fetchData();
                      }
                    }}
                  >
                    Yangi kod
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ota-ona akkaunt User ID (ixtiyoriy bog‘lash)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.parentUserId}
                  onChange={(e) => setFormData({ ...formData, parentUserId: e.target.value })}
                  placeholder="MongoDB User _id"
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">{t('status')}</label>
            <select
              className="select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            >
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
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

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount) + ' so\'m';
}