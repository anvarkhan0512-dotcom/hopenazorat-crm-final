import mongoose, { Schema, Document, Model } from 'mongoose';

export type HomeworkSubmitStatus = 'not_submitted' | 'submitted';

export interface IHomeworkSubmission extends Document {
  homeworkId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: HomeworkSubmitStatus;
  /** Student-uploaded homework photo (path under /public or absolute URL) */
  submissionImageUrl?: string;
  updatedAt: Date;
  createdAt: Date;
}

const HomeworkSubmissionSchema = new Schema<IHomeworkSubmission>(
  {
    homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    status: {
      type: String,
      enum: ['not_submitted', 'submitted'],
      default: 'not_submitted',
      index: true,
    },
    submissionImageUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

HomeworkSubmissionSchema.index(
  { homeworkId: 1, studentId: 1 },
  { unique: true }
);
HomeworkSubmissionSchema.index({ studentId: 1, status: 1 });

export const HomeworkSubmission: Model<IHomeworkSubmission> =
  mongoose.models.HomeworkSubmission ||
  mongoose.model<IHomeworkSubmission>('HomeworkSubmission', HomeworkSubmissionSchema);
