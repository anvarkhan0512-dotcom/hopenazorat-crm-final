'use client';

import { useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageProvider';
import useSWR from 'swr';
import { HomeworkThumb } from '@/components/HomeworkThumb';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const HomeworkListRow = memo(function HomeworkListRow({
  h,
  onOpen,
}: {
  h: { _id: string; title: string; createdAt?: string };
  onOpen: (id: string) => void;
}) {
  return (
    <tr>
      <td>{h.title}</td>
      <td>{h.createdAt ? new Date(h.createdAt).toLocaleString('uz-UZ') : ''}</td>
      <td>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(h._id)}>
          Topshiruqlar
        </button>
      </td>
    </tr>
  );
});

export default function TeacherHomeworkPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const canSee =
    user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'manager';
  const { data: list, mutate } = useSWR(canSee ? '/api/homework' : null, fetcher);
  const { data: groups } = useSWR(canSee ? '/api/groups' : null, fetcher);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!loading && user && !canSee) router.replace('/dashboard');
  }, [loading, user, router, canSee]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !title) return;
    setSaving(true);
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          title,
          description,
          imageUrl,
          attachmentUrl,
          dueDate: dueDate || undefined,
        }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setImageUrl('');
        setAttachmentUrl('');
        setDueDate('');
        mutate();
      }
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: string) => {
    const res = await fetch(`/api/homework/${id}`);
    const json = await res.json();
    setDetail(json);
  };

  if (loading || !user || !canSee) {
    return (
      <DashboardLayout title={t('homeworkMenu')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('homeworkMenu')}>
      <div className="card mb-6">
        <h3 className="card-title mb-4">Yangi vazifa</h3>
        <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
          <div className="form-group md:col-span-2">
            <label className="form-label">Guruh</label>
            <select className="select w-full" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
              <option value="">Tanlang</option>
              {(groups || []).map((g: any) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group md:col-span-2">
            <label className="form-label">Sarlavha</label>
            <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group md:col-span-2">
            <label className="form-label">Tavsif</label>
            <textarea className="input w-full min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Rasm URL</label>
            <input className="input w-full" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
          </div>
          <div className="form-group md:col-span-2">
            <label className="form-label">Fayl yuklash (PDF, rasm)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="input w-full min-h-[48px] text-base file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-violet-100 file:text-violet-800"
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try {
                  const fd = new FormData();
                  fd.append('file', f);
                  const r = await fetch('/api/teacher/upload', { method: 'POST', body: fd });
                  const j = await r.json();
                  if (r.ok) setAttachmentUrl(j.url);
                } finally {
                  setUploading(false);
                }
              }}
            />
            {attachmentUrl ? (
              <p className="text-xs text-green-700 mt-1 break-all">
                Yuklandi: {attachmentUrl}
              </p>
            ) : null}
          </div>
          <div className="form-group">
            <label className="form-label">Muddat</label>
            <input type="datetime-local" className="input w-full" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>

      <div className="card mb-6">
        <h3 className="card-title mb-4">Mening vazifalarim</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Sarlavha</th>
              <th>Sana</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(list || []).length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-6">
                  Hali vazifa yo&apos;q
                </td>
              </tr>
            ) : (
              list.map((h: any) => <HomeworkListRow key={h._id} h={h} onOpen={openDetail} />)
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{detail.homework?.title}</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetail(null)}>
              Yopish
            </button>
          </div>
          {detail.homework?.imageUrl ? (
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-600 mb-1">Vazifa rasmi</p>
              <HomeworkThumb src={detail.homework.imageUrl} alt={detail.homework.title} />
            </div>
          ) : null}
          {detail.homework?.attachmentUrl ? (
            <div className="px-4 pb-4">
              <a
                href={detail.homework.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-violet-700 underline text-sm"
              >
                Yuklangan faylni ochish
              </a>
            </div>
          ) : null}
          <table className="table text-sm">
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Holat</th>
                <th>Topshiriq rasmi</th>
              </tr>
            </thead>
            <tbody>
              {(detail.submissions || []).map((s: any) => (
                <tr key={s._id}>
                  <td>{s.studentId?.name || s.studentId}</td>
                  <td>{s.status === 'submitted' ? 'Topshirdi' : 'Topshirmadi'}</td>
                  <td>
                    {s.submissionImageUrl ? (
                      <HomeworkThumb src={s.submissionImageUrl} alt="Topshiriq" />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
