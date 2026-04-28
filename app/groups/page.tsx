'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

interface Group {
  _id: string;
  name: string;
  teacherName: string;
  teacherUserId?: string;
  schedule: string;
  price: number;
  studentIds: string[];
  createdAt: string;
}

interface TeacherOpt {
  id: string;
  username: string;
  displayName: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    teacherName: '',
    teacherUserId: '',
    schedule: '',
    price: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gRes, tRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/users/teachers'),
      ]);
      const data = await gRes.json();
      setGroups(data);
      if (tRes.ok) setTeachers(await tRes.json());
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingGroup ? `/api/groups/${editingGroup._id}` : '/api/groups';
    const method = editingGroup ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teacherUserId: formData.teacherUserId || null,
        }),
      });

      if (res.ok) {
        fetchData();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving group:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const openModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        teacherName: group.teacherName,
        teacherUserId: group.teacherUserId || '',
        schedule: group.schedule,
        price: group.price,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        teacherName: '',
        teacherUserId: '',
        schedule: '',
        price: 0,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGroup(null);
  };

  if (loading) {
    return (
      <DashboardLayout title={t('groups')}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('groups')}>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => openModal()}>
          + {t('add')} {t('groups')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.length === 0 ? (
          <div className="card col-span-full text-center py-8">{t('noData')}</div>
        ) : (
          groups.map((group) => (
            <div key={group._id} className="card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">{group.name}</h3>
                <div className="flex gap-2">
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => openModal(group)}
                  >
                    {t('edit')}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => handleDelete(group._id)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('teacherName')}:</span>
                  <span className="font-medium">{group.teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('schedule')}:</span>
                  <span className="font-medium">{group.schedule || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('price')}:</span>
                  <span className="font-medium">{formatMoney(group.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('studentsCount')}:</span>
                  <span className="font-medium">{group.studentIds?.length || 0}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingGroup ? t('edit') : t('add')}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('groupName')}</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('teacherName')}</label>
            <input
              type="text"
              className="input"
              value={formData.teacherName}
              onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ustoz akkaunti (login)</label>
            <select
              className="select"
              value={formData.teacherUserId}
              onChange={(e) => setFormData({ ...formData, teacherUserId: e.target.value })}
            >
              <option value="">— tanlanmagan —</option>
              {teachers.map((te) => (
                <option key={te.id} value={te.id}>
                  {te.displayName || te.username}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('schedule')}</label>
            <input
              type="text"
              className="input"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              placeholder="Dushanba-Juma, 10:00-12:00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('monthlyPrice')}</label>
            <input
              type="number"
              className="input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
            />
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

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}