import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import {
  DIFFICULTIES,
  INTERVIEW_RESULTS,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
} from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const interviewSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    applicationId: { ...objectId, ref: 'Application', index: true },
    companyId: { ...objectId, ref: 'Company', index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
    scheduledAt: { type: Date, required: true },
    timezone: { type: String, trim: true, maxlength: 64, default: 'UTC' },
    type: { type: String, enum: INTERVIEW_TYPES, required: true },
    roundNumber: { type: Number, min: 1, max: 20, default: 1 },
    roundName: requiredString(120),
    interviewerName: optionalString(160),
    interviewerId: { type: Schema.Types.ObjectId, ref: 'Recruiter' },
    meetingLink: optionalString(1000),
    status: { type: String, enum: INTERVIEW_STATUSES, required: true, default: 'scheduled' },
    difficulty: { type: String, enum: DIFFICULTIES },
    result: { type: String, enum: INTERVIEW_RESULTS, required: true, default: 'pending' },
    feedback: optionalString(8000),
    notes: optionalString(8000),
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

interviewSchema.index({ userId: 1, scheduledAt: 1 });
interviewSchema.index({ userId: 1, companyId: 1, scheduledAt: -1 });
interviewSchema.index({ userId: 1, result: 1 });
interviewSchema.index({ userId: 1, status: 1, scheduledAt: 1 });
applyJsonTransform(interviewSchema);

export type InterviewDoc = InferSchemaType<typeof interviewSchema> & { _id: Types.ObjectId };
export const Interview = model('Interview', interviewSchema);
