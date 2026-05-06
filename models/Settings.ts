import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  smsEnabled: boolean;
  smsTemplates: {
    payment: string;
    absent: string;
    reminder: string;
  };
  smsPrices: {
    single: number;
  };
  telegramEnabled: boolean;
  centerCapacity: number; // Jami markaz sig'imi (barcha xonalar jami)
  utilizationTarget: number; // Masalan 80%
}

const SettingsSchema = new Schema<ISettings>(
  {
    smsEnabled: { type: Boolean, default: false },
    smsTemplates: {
      payment: { type: String, default: "Hurmatli ota-ona, {student} uchun {amount} so'm to'lov qabul qilindi. Rahmat!" },
      absent: { type: String, default: "{student} bugun darsga kelmadi. Sababini ma'lum qilishingizni so'raymiz." },
      reminder: { type: String, default: "Eslatma: {student} uchun to'lov muddati yaqinlashmoqda." },
    },
    smsPrices: {
      single: { type: Number, default: 200 }, // 1 ta SMS narxi
    },
    telegramEnabled: { type: Boolean, default: true },
    centerCapacity: { type: Number, default: 100 },
    utilizationTarget: { type: Number, default: 80 },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
