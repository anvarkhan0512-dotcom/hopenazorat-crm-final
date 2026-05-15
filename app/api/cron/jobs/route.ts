import { NextRequest, NextResponse } from 'next/server';
import {
  runMonthlyInvoiceJob,
  runDailyDebtorCheck,
  getCronJobsStatus,
} from '@/lib/cron';
import { runDebtorTelegramReminders } from '@/lib/parentReminders';

export async function POST(request: NextRequest) {
  try {
    const { job } = await request.json();
    
    if (!job) {
      return NextResponse.json({ error: 'Job name required' }, { status: 400 });
    }

    let result;
    
    switch (job) {
      case 'monthly-invoice':
        result = await runMonthlyInvoiceJob();
        break;
      case 'daily-debtor':
        result = await runDailyDebtorCheck();
        break;
      case 'debtor-telegram':
        result = await runDebtorTelegramReminders();
        break;
      default:
        return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const jobs = getCronJobsStatus();
    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Get cron jobs status error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}