import { generateMonthlyInvoices, getDebtorsReport } from '@/lib/billing';
import { sendTelegramMessage } from '@/lib/telegram';
import { runParentPaymentReminders, runDebtorTelegramReminders } from '@/lib/parentReminders';
import { sendSMS } from '@/lib/sms';
import { SMSTemplates } from '@/lib/sms/templates';
import { checkDiscountExpirations } from '@/lib/discount';
import { Center } from '@/models/Center';

export interface CronJob {
  name: string;
  schedule: string;
  lastRun?: Date;
  enabled: boolean;
}

const cronJobs: Map<string, CronJob> = new Map();

export function initCronJobs(): void {
  cronJobs.set('monthly-invoice', {
    name: 'Monthly Invoice Generation',
    schedule: '0 1 1 * *',
    enabled: true,
  });

  cronJobs.set('daily-debtor-check', {
    name: 'Daily Debtor Check',
    schedule: '0 8 * * *',
    enabled: true,
  });

  cronJobs.set('parent-payment-reminder', {
    name: 'Parent payment Telegram reminders',
    schedule: '0 10 * * *',
    enabled: true,
  });

  cronJobs.set('debtor-telegram-daily', {
    name: 'Daily debtor Telegram to parents',
    schedule: '0 9 * * *',
    enabled: true,
  });

  cronJobs.set('center-trial-check', {
    name: 'Daily Center Trial Expiration Check',
    schedule: '0 0 * * *',
    enabled: true,
  });

  console.log('Cron jobs initialized:', Array.from(cronJobs.keys()));
}

export async function runCenterTrialCheckJob(): Promise<{ success: boolean; blocked: number }> {
  const job = cronJobs.get('center-trial-check');
  if (!job) return { success: false, blocked: 0 };

  try {
    const now = new Date();
    
    // Centers with trial ending in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const expiringSoon = await Center.find({
      trialEndsAt: { 
        $gte: new Date(threeDaysFromNow.setHours(0,0,0,0)), 
        $lte: new Date(threeDaysFromNow.setHours(23,59,59,999)) 
      },
      isBlocked: false
    });

    for (const center of expiringSoon) {
      if (center.adminPhone) {
        sendSMS(
          center.adminPhone, 
          SMSTemplates.TRIAL_EXPIRY(3, '+998901234567'), 
          center._id
        );
      }
    }

    const result = await Center.updateMany(
      { trialEndsAt: { $lt: now }, isBlocked: false },
      { $set: { isBlocked: true } }
    );
    
    job.lastRun = new Date();
    if (result.modifiedCount > 0) {
      await sendTelegramMessage(
        `🛑 <b>Markazlar bloklandi</b>\n\n` +
        `Trial muddati tugagan markazlar soni: ${result.modifiedCount}`
      );
    }
    return { success: true, blocked: result.modifiedCount };
  } catch (error) {
    console.error('Center trial check failed:', error);
    return { success: false, blocked: 0 };
  }
}

export async function runMonthlyInvoiceJob(): Promise<{
  success: boolean;
  generated: number;
  errors: string[];
}> {
  const job = cronJobs.get('monthly-invoice');
  if (!job) {
    return { success: false, generated: 0, errors: ['Job not found'] };
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  console.log(`Running monthly invoice job for ${month}/${year}...`);

  try {
    const result = await generateMonthlyInvoices(month, year);
    
    job.lastRun = new Date();
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Generated ${result.generated} invoices`);
    }

    if (result.generated > 0) {
      const report = await getDebtorsReport(month, year);
      await sendTelegramMessage(
        `📄 <b>Yangi hisob-fakturalar</b>\n\n` +
        `Yaratildi: ${result.generated} ta\n` +
        `Jami qarzdorlar: ${report.summary.pending + report.summary.partial}\n` +
        `Jami qarz: ${report.totalDebt.toLocaleString('uz-UZ')} soʻm`
      );
    }

    return { success: true, ...result };
  } catch (error: any) {
    console.error('Monthly invoice job failed:', error);
    return { success: false, generated: 0, errors: [error.message] };
  }
}

export async function runDailyDebtorCheck(): Promise<{
  success: boolean;
  debtorCount: number;
  totalDebt: number;
}> {
  const job = cronJobs.get('daily-debtor-check');
  if (!job) {
    return { success: false, debtorCount: 0, totalDebt: 0 };
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    const report = await getDebtorsReport(month, year);
    await checkDiscountExpirations();
    
    job.lastRun = new Date();

    if (report.summary.partial > 0 || report.summary.pending > 0) {
      await sendTelegramMessage(
        `⚠️ <b>Kunlik qarzdorlik hisoboti</b>\n\n` +
        `Toʻlanmagan: ${report.summary.pending} ta\n` +
        `Qisman toʻlagan: ${report.summary.partial} ta\n` +
        `Jami qarz: ${report.totalDebt.toLocaleString('uz-UZ')} soʻm`
      );

      // Auto SMS for debtors (> 3 days overdue logic would usually be in the report)
      // For now, let's notify those in the report
      for (const debtor of report.debtors) {
        if (debtor.phone && debtor.debt > 0) {
          sendSMS(
            debtor.phone,
            SMSTemplates.DEBT_WARNING(debtor.studentName, debtor.debt),
            debtor.centerId || null
          );
        }
      }
    }

    return {
      success: true,
      debtorCount: report.summary.partial + report.summary.pending,
      totalDebt: report.totalDebt,
    };
  } catch (error: any) {
    console.error('Daily debtor check failed:', error);
    return { success: false, debtorCount: 0, totalDebt: 0 };
  }
}

let cronInterval: NodeJS.Timeout | null = null;

export function startCronScheduler(): void {
  if (cronInterval) {
    console.log('Cron scheduler already running');
    return;
  }

  initCronJobs();

  const now = new Date();
  const nextMinute = new Date(now.getTime() + 60000);

  console.log(`Starting cron scheduler at ${nextMinute.toISOString()}`);
  
  cronInterval = setInterval(async () => {
    const now = new Date();
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const monthlyJob = cronJobs.get('monthly-invoice');
    if (monthlyJob?.enabled && day === 1 && hour === 0 && minute === 0) {
      await runMonthlyInvoiceJob();
    }

    const dailyDebtorJob = cronJobs.get('daily-debtor-check');
    if (dailyDebtorJob?.enabled && hour === 8 && minute === 0) {
      await runDailyDebtorCheck();
    }

    const parentJob = cronJobs.get('parent-payment-reminder');
    if (parentJob?.enabled && hour === 10 && minute === 0) {
      await runParentPaymentReminders(3);
    }

    const debtorTeleJob = cronJobs.get('debtor-telegram-daily');
    if (debtorTeleJob?.enabled && hour === 9 && minute === 0) {
      await runDebtorTelegramReminders();
    }

    const centerTrialJob = cronJobs.get('center-trial-check');
    if (centerTrialJob?.enabled && hour === 0 && minute === 0) {
      await runCenterTrialCheckJob();
    }
  }, 60000);

  console.log('Cron scheduler started');
}

export function stopCronScheduler(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('Cron scheduler stopped');
  }
}

export async function runParentPaymentRemindersJob() {
  return runParentPaymentReminders(3);
}

export function getCronJobsStatus(): any[] {
  return Array.from(cronJobs.values()).map((job) => ({
    name: job.name,
    schedule: job.schedule,
    lastRun: job.lastRun?.toISOString(),
    enabled: job.enabled,
  }));
}