'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';
import RadialTimePicker from '@/components/RadialTimePicker';

interface WeeklySlot {
  day: number;
  time: string;
}

interface Group {
  _id: string;
  name: string;
  teacherName: string;
  teacherUserId?: string;
  teacherUserId2?: string;
  schedule: string;
  weeklySchedule?: WeeklySlot[];
  price: number;
  teacherSharePercent?: number;
  teacherPayoutFixed?: number;
  lessonCalendarWeekParity?: 'all' | 'odd' | 'even';
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
  const { t, locale } = useLanguage();

  const DAY_OPTS = [
    { v: 1, l: t('monday') || 'Dushanba' },
    { v: 2, l: t('tuesday') || 'Seshanba' },
    { v: 3, l: t('wednesday') || 'Chorshanba' },
    { v: 4, l: t('thursday') || 'Payshanba' },
    { v: 5, l: t('friday') || 'Juma' },
    { v: 6, l: t('saturday') || 'Shanba' },
    { v: 0, l: t('sunday') || 'Yakshanba' },
  ];
    name: '',
    teacherName: '',
    teacherUserId: '',
    teacherUserId2: '',
    schedule: '',
    price: 0,
    teacherSharePercent: 30,
    teacherPayoutFixed: 0,
    lessonCalendarWeekParity: 'all' as 'all' | 'odd' | 'even',
    weeklySchedule: [] as WeeklySlot[],
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
          name: formData.name,
          teacherName: formData.teacherName,
          teacherUserId: formData.teacherUserId || null,
          teacherUserId2: formData.teacherUserId2 || null,
          schedule: formData.schedule,
          price: formData.price,
          weeklySchedule: formData.weeklySchedule,
          teacherSharePercent: formData.teacherSharePercent,
          teacherPayoutFixed:
            formData.teacherSharePercent === 0 ? formData.teacherPayoutFixed : 0,
          lessonCalendarWeekParity: formData.lessonCalendarWeekParity,
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

  const addWeeklySlot = () => {
    setFormData({
      ...formData,
      weeklySchedule: [...formData.weeklySchedule, { day: 1, time: '09:00' }],
    });
  };

  const updateSlot = (i: number, patch: Partial<WeeklySlot>) => {
    const next = [...formData.weeklySchedule];
    next[i] = { ...next[i], ...patch };
    setFormData({ ...formData, weeklySchedule: next });
  };

  const removeSlot = (i: number) => {
    const next = formData.weeklySchedule.filter((_, j) => j !== i);
    setFormData({ ...formData, weeklySchedule: next });
  };

  const openModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        teacherName: group.teacherName,
        teacherUserId: group.teacherUserId || '',
        teacherUserId2: group.teacherUserId2 || '',
        schedule: group.schedule,
        price: group.price,
        teacherSharePercent: group.teacherSharePercent ?? 30,
        teacherPayoutFixed: group.teacherPayoutFixed ?? 0,
        lessonCalendarWeekParity: group.lessonCalendarWeekParity ?? 'all',
        weeklySchedule: Array.isArray(group.weeklySchedule) ? [...group.weeklySchedule] : [],
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        teacherName: '',
        teacherUserId: '',
        teacherUserId2: '',
        schedule: '',
        price: 0,
        teacherSharePercent: 30,
        teacherPayoutFixed: 0,
        lessonCalendarWeekParity: 'all',
        weeklySchedule: [],
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
        <button type="button" className="btn btn-primary" onClick={() => openModal()}>
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
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => openModal(group)}
                  >
                    {t('edit')}
                  </button>
                  <button
                    type="button"
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
                {(group.weeklySchedule?.length ?? 0) > 0 && (
                  <div className="text-xs text-gray-600">
                    {t('weekly')}:{' '}
                    {group.weeklySchedule!.map((s) => {
                      const d = DAY_OPTS.find((x) => x.v === s.day)?.l || s.day;
                      return `${d} ${s.time}`;
                    }).join(', ')}
                  </div>
                )}
                {group.lessonCalendarWeekParity && group.lessonCalendarWeekParity !== 'all' && (
                  <div className="text-xs text-amber-800">
                    {t('week')}:{' '}
                    {group.lessonCalendarWeekParity === 'odd' ? t('onlyOdd') : t('onlyEven')}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('price')}:</span>
                  <span className="font-medium">{formatMoney(group.price, locale)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t('teacherShare')}</span>
                  <span>
                    {group.teacherPayoutFixed
                      ? `${t('fixedPayment')}: ${formatMoney(group.teacherPayoutFixed, locale)}`
                      : `${group.teacherSharePercent ?? 30}%`}
                  </span>
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
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto pr-1">
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
            <label className="form-label">1-{t('teacherAccount')}</label>
            <select
              className="select"
              value={formData.teacherUserId}
              onChange={(e) => setFormData({ ...formData, teacherUserId: e.target.value })}
            >
              <option value="">— {t('noData')} —</option>
              {teachers.map((te) => (
                <option key={te.id} value={te.id}>
                  {te.displayName || te.username}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">2-{t('teacherAccount')} ({t('optional')})</label>
            <select
              className="select"
              value={formData.teacherUserId2}
              onChange={(e) => setFormData({ ...formData, teacherUserId2: e.target.value })}
            >
              <option value="">—</option>
              {teachers.map((te) => (
                <option key={te.id} value={te.id}>
                  {te.displayName || te.username}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('schedule')} ({t('text')})</label>
            <input
              type="text"
              className="input"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              placeholder="Dushanba-Juma, 10:00-12:00"
            />
          </div>

          <div className="form-group border border-white/10 rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label mb-0">{t('weekly')} {t('schedule')} + {t('time')}</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addWeeklySlot}>
                + {t('line')}
              </button>
            </div>
            {formData.weeklySchedule.map((slot, i) => (
              <div key={i} className="flex flex-wrap gap-3 items-end mb-4 border-b border-white/5 pb-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">{t('date')}</label>
                  <select
                    className="select"
                    value={slot.day}
                    onChange={(e) => updateSlot(i, { day: parseInt(e.target.value, 10) })}
                  >
                    {DAY_OPTS.map((d) => (
                      <option key={d.v} value={d.v}>
                        {d.l}
                      </option>
                    ))}
                  </select>
                </div>
                <RadialTimePicker
                  label={t('time')}
                  value={slot.time || '09:00'}
                  onChange={(time) => updateSlot(i, { time })}
                />
                <button type="button" className="btn btn-danger btn-sm mb-1" onClick={() => removeSlot(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">{t('monthlyPrice')} ({t('admin')} {t('viewStudents')})</label>
            <input
              type="number"
              className="input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('parity')}</label>
            <select
              className="select"
              value={formData.lessonCalendarWeekParity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lessonCalendarWeekParity: e.target.value as 'all' | 'odd' | 'even',
                })
              }
            >
              <option value="all">{t('allWeeks')}</option>
              <option value="odd">{t('onlyOdd')}</option>
              <option value="even">{t('onlyEven')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t('teacherShare')} (%)</label>
              <input
                type="number"
                className="input"
                min={0}
                max={100}
                value={formData.teacherSharePercent}
                onChange={(e) =>
                  setFormData({ ...formData, teacherSharePercent: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t('fixedPayment')} (soʻm){' '}
                {formData.teacherSharePercent !== 0 ? (
                  <span className="text-xs text-gray-500">({t('percentSelected')})</span>
                ) : null}
              </label>
              <input
                type="number"
                className="input"
                disabled={formData.teacherSharePercent !== 0}
                value={formData.teacherPayoutFixed}
                onChange={(e) =>
                  setFormData({ ...formData, teacherPayoutFixed: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
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
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}
