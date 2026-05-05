import DashboardLayout from '@/components/DashboardLayout';
import TelegramConnect from '@/components/TelegramConnect';

export default function TelegramPage() {
  return (
    <DashboardLayout title="Telegram">
      <div className="py-6">
        <TelegramConnect />
      </div>
    </DashboardLayout>
  );
}
