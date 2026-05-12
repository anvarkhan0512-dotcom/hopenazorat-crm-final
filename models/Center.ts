import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICenter extends Document {
  name: string;
  adminUsername: string;
  adminPassword?: string; // Only used for initial creation, then stored in User model
  domain?: string;
  isBlocked: boolean;
  trialEndsAt: Date;
  createdAt: Date;
  settings: {
    logoText: string;
    primaryColor: string;
  };
}

const CenterSchema = new Schema<ICenter>(
  {
    name: { type: String, required: true },
    adminUsername: { type: String, required: true, unique: true },
    domain: { type: String, sparse: true, index: true },
    isBlocked: { type: Boolean, default: false },
    trialEndsAt: { type: Date, required: true },
    settings: {
      logoText: { type: String, default: '' },
      primaryColor: { type: String, default: '#7c3aed' }, // Default purple
    },
  },
  { timestamps: true }
);

export const Center: Model<ICenter> =
  mongoose.models.Center || mongoose.model<ICenter>('Center', CenterSchema);
