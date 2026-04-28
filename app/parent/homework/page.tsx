'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageProvider';
import { HomeworkThumb } from '@/components/HomeworkThumb';

const HomeworkRow = memo(function HomeworkRow({
  row,
  studentId,
  onSetStatus,
}: {
  row: any;
  studentId: string;
  onSetStatus: (homeworkId: string, studentId: string, status: 'submitted' | 'not_submitted') => void;
}) {
  return (
    <tr>
      <td>
        <div className="font-medium">{row.homework.title}</div>
        <div className="text-xs text-gray-600">{row.homework.description}</div>
        {row.homework.imageUrl ? (
          <HomeworkThumb src={row.homework.imageUrl} alt={row.homework.title} className="mt-2" />
        ) : null}
        {row.submissionImageUrl ? (
          <div className="mt-2">
            <p className="text-xs text-gray-600">Farzand topshirig&apos;i</p>
            <HomeworkThumb src={row.submissionImageUrl} alt="Topshirilgan" />
          </div>
        ) : null}
      </td>
      <td>{row.status === 'submitted' ? 'Topshirdi' : 'Topshirmadi'}</td>
      <td>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={() => onSetStatus(row.homework._id, studentId, 'submitted')}
          >
            Topshirdi
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onSetStatus(row.homework._id, studentId, 'not_submitted')}
          >
            Topshirmadi
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function ParentHomeworkPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!loading && user && user.role !== 'parent') router.replace('/dashboard');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'parent') return;
    fetch('/api/homework/parent')
      .then((r) => r.json())
      .then(setData);
  }, [user]);

  const setStatus = async (homeworkId: string, studentId: string, status: 'submitted' | 'not_submitted') => {
    await fetch('/api/homework/submission', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeworkId, studentId, status }),
    });
    const res = await fetch('/api/homework/parent').then((r) => r.json());
    setData(res);
  };

  if (loading || !user || user.role !== 'parent') {
    return (
      <DashboardLayout title={t('homeworkParent')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  const items = useMemo(() => data?.items || [], [data?.items]);

  return (
    <DashboardLayout title={t('homeworkParent')}>
      {items.map((block: any) => (
        <div key={block.studentId} className="card mb-6">
          <h3 className="card-title mb-4">{block.name}</h3>
          {(block.homework || []).length === 0 ? (
            <p className="text-gray-500">Vazifa yo&apos;q</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vazifa</th>
                  <th>Holat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {block.homework.map((row: any, i: number) => (
                  <HomeworkRow
                    key={`${block.studentId}-${row.homework._id}-${i}`}
                    row={row}
                    studentId={block.studentId}
                    onSetStatus={setStatus}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </DashboardLayout>
  );
}
