'use client';

import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageProvider';
import { HomeworkThumb } from '@/components/HomeworkThumb';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Overview = {
  student: {
    name: string;
    group: unknown;
    scoreRecords: { title: string; value: number; maxValue: number; recordedAt: string }[];
  };
  attendance: { date: string; status: string; lessonNumber: number }[];
  homework: {
    homework: { _id: string; title: string; description?: string; imageUrl?: string };
    status: string;
    submissionImageUrl?: string;
  }[];
};

const AttendanceRow = memo(function AttendanceRow({
  row,
}: {
  row: { date: string; status: string; lessonNumber: number };
}) {
  const d = new Date(row.date).toLocaleDateString('uz-UZ');
  return (
    <tr>
      <td>{d}</td>
      <td>{row.lessonNumber}</td>
      <td>{row.status === 'present' ? 'Keldi' : row.status === 'absent' ? 'Kelmadi' : 'Ko‘chirildi'}</td>
    </tr>
  );
});

export default function StudentHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { data, mutate } = useSWR<Overview>(user?.role === 'student' ? '/api/student/overview' : null, fetcher);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && user.role !== 'student') router.replace('/dashboard');
  }, [loading, user, router]);

  const studentId = user?.linkedStudentIds?.[0];

  const sortedAttendance = useMemo(() => {
    const list = data?.attendance || [];
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data?.attendance]);

  const submitWithImage = useCallback(
    async (homeworkId: string, file: File) => {
      if (!studentId) return;
      setUploadingId(homeworkId);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/student/upload', { method: 'POST', body: fd });
        const ju = await up.json();
        if (!up.ok) throw new Error(ju.error || 'upload');
        await fetch('/api/homework/submission', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeworkId,
            studentId,
            status: 'submitted',
            submissionImageUrl: ju.url,
          }),
        });
        await mutate();
      } catch (e) {
        console.error(e);
        alert('Yuklash yoki topshirishda xato');
      } finally {
        setUploadingId(null);
      }
    },
    [studentId, mutate]
  );

  if (loading || !user || user.role !== 'student') {
    return (
      <DashboardLayout title={t('studentHome')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  const scores = data?.student?.scoreRecords || [];

  return (
    <DashboardLayout title={t('studentHome')} subtitle={data?.student?.name}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="card-title mb-3">Davomat (so‘nggi)</h3>
          <div className="max-h-80 overflow-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Dars</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {sortedAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-4">
                      Ma&apos;lumot yo&apos;q
                    </td>
                  </tr>
                ) : (
                  sortedAttendance.map((row) => <AttendanceRow key={`${row.date}-${row.lessonNumber}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title mb-3">Ballar</h3>
          {scores.length === 0 ? (
            <p className="text-gray-500 text-sm">Hozircha ball yozuvlari yo&apos;q</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {scores.map((s, i) => (
                <li key={i} className="flex justify-between border-b border-gray-100 pb-2">
                  <span>{s.title}</span>
                  <span className="font-semibold">
                    {s.value} / {s.maxValue ?? 100}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="card-title mb-4">Uy vazifalari</h3>
        {(data?.homework || []).length === 0 ? (
          <p className="text-gray-500">Guruhga biriktirilmagansiz yoki vazifa yo&apos;q</p>
        ) : (
          <div className="space-y-6">
            {(data?.homework || []).map((row) => (
              <div key={row.homework._id} className="border border-gray-100 rounded-lg p-4 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">{row.homework.title}</div>
                  {row.homework.description ? (
                    <p className="text-sm text-gray-600 mt-1">{row.homework.description}</p>
                  ) : null}
                  {row.homework.imageUrl ? (
                    <HomeworkThumb src={row.homework.imageUrl} alt={row.homework.title} className="mt-2" />
                  ) : null}
                  <p className="text-xs mt-2">
                    Holat:{' '}
                    <strong>{row.status === 'submitted' ? 'Topshirilgan' : 'Topshirilmagan'}</strong>
                  </p>
                  {row.submissionImageUrl ? (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Sizning javobingiz (rasm)</p>
                      <HomeworkThumb src={row.submissionImageUrl} alt="Topshirilgan" />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 items-start">
                  <label className="btn btn-primary btn-sm cursor-pointer">
                    {uploadingId === row.homework._id ? '...' : 'Rasm yuklash'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingId === row.homework._id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) void submitWithImage(row.homework._id, f);
                      }}
                    />
                  </label>
                  <p className="text-xs text-gray-500 max-w-[200px]">JPEG, PNG yoki WebP, 5MB gacha</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
