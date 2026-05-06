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

  const [formData, setFormData] = useState({
    name: '',
    teacherName: '',
    teacherUserId: '',
    teacherUserId2: '',
    schedule: '',
    lessonDays: [] as string[],
    startTime: '09:00',
    endTime: '10:30',
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
          lessonDays: formData.lessonDays,
          startTime: formData.startTime,
          endTime: formData.endTime,
          price: formData.price,
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
        lessonDays: (group as any).lessonDays || [],
        startTime: (group as any).startTime || '09:00',
        endTime: (group as any).endTime || '10:30',
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
        lessonDays: [],
        startTime: '09:00',
        endTime: '10:30',
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
                    {group.teacherPayoutFixed === 0 && group.teacherSharePercent === 0 ? (
                      <span className="flex items-center gap-1 text-purple-600 font-bold">
                        🤖 Avtomatik
                      </span>
                    ) : group.teacherPayoutFixed
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

          <div className="form-group border border-white/10 rounded-xl p-4 mb-4 bg-white/5">
            <label className="form-label font-bold mb-3 block text-purple-400">Haftalik jadval</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((day) => (
                <label key={day} className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg border hover:border-purple-500 transition-all min-w-[45px]">
                  <span className="text-[10px] font-bold text-gray-400">{day}</span>
                  <input
                    type="checkbox"
                    checked={formData.lessonDays.includes(day)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...formData.lessonDays, day]
                        : formData.lessonDays.filter((d) => d !== day);
                      setFormData({ ...formData, lessonDays: next });
                    }}
                    className="w-4 h-4 accent-purple-600"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="text-xs text-gray-400 mb-1 block">Boshlanish</label>
                <input
                  type="time"
                  className="input text-sm"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="form-group mb-0">
                <label className="text-xs text-gray-400 mb-1 block">Tugash</label>
                <input
                  type="time"
                  className="input text-sm"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            {formData.lessonDays.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                  {formData.lessonDays.every(d => ['Du', 'Ch', 'Ju'].includes(d)) ? 'Toq kunlar' : 
                   formData.lessonDays.every(d => ['Se', 'Pa', 'Sh'].includes(d)) ? 'Juft kunlar' : 'Aralash'}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('monthlyPrice')}</label>
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

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount) + " so'm";
}
