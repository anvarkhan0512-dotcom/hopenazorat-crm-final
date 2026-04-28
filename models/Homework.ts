import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHomework extends Document {
  groupId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  imageUrl: string;
  createdBy: mongoose.Types.ObjectId;
  dueDate?: Date;
  createdAt: Date;
}

const HomeworkSchema = new Schema<IHomework>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dueDate: { type: Date, index: true },
  },
  { timestamps: true }
);

HomeworkSchema.index({ groupId: 1, createdAt: -1 });
HomeworkSchema.index({ createdBy: 1, createdAt: -1 });

export const Homework: Model<IHomework> =
  mongoose.models.Homework || mongoose.model<IHomework>('Homework', HomeworkSchema);
