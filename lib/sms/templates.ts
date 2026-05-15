export const SMSTemplates = {
  PAYMENT_REMINDER: (name: string, amount: number, date: string) => 
    `Hurmatli ${name}, ${amount.toLocaleString()} so'm to'lov muddati ${date}. Hope Study`,
  
  TRIAL_EXPIRY: (days: number, phone: string) => 
    `Sinov muddatingiz ${days} kun ichida tugaydi. Bog'lanish: ${phone}`,
  
  WELCOME: (name: string) => 
    `Xush kelibsiz, ${name}! Hope Study CRM ga muvaffaqiyatli ro'yxatdan o'tdingiz.`,
  
  ATTENDANCE_ABSENT: (name: string, date: string) =>
    `Hurmatli ota-ona, ${name} bugun ${date} kuni darsda qatnashmadi. Hope Study`,
    
  DEBT_WARNING: (name: string, debt: number) =>
    `Hurmatli ${name}, sizning ${debt.toLocaleString()} so'm qarzingiz bor. Iltimos to'lovni amalga oshiring. Hope Study`,
};
