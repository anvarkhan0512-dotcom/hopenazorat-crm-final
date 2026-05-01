'use client';

import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/DashboardLayout';

const FaceIDAttendanceClient = dynamic(
  () => import('@/components/FaceIDAttendance'),
  { ssr: false }
);

export default function FaceIDAttendancePage() {
  return <FaceIDAttendanceClient />;
}
