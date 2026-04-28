import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyInvoiceJob, runDailyDebtorCheck, runParentPaymentRemindersJob } from '@/lib/cron';
import { getCached, setCache } from '@/lib/cache';

const CRON_SECRET = process.env.CRON_SECRET || 'edu-crm-cron-secret';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const job = searchParams.get('job');

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let result;
    
    switch (job) {
      case 'monthly-invoice':
        result = await runMonthlyInvoiceJob();
        break;
      case 'daily-debtor':
        result = await runDailyDebtorCheck();
        break;
      case 'parent-reminders':
        result = await runParentPaymentRemindersJob();
        break;
      case 'all': {
        const invoiceResult = await runMonthlyInvoiceJob();
        const debtorResult = await runDailyDebtorCheck();
        const parentResult = await runParentPaymentRemindersJob();
        result = { monthlyInvoice: invoiceResult, dailyDebtor: debtorResult, parentReminders: parentResult };
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      job,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}