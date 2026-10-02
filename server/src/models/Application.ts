import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { APPLICATION_STATUSES } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const applicationSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    companyId: { ...objectId, ref: 'Company', index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: false, default: null, index: true },
    title: requiredString(200),
    status: { type: String, enum: APPLICATION_STATUSES, required: true, default: 'saved' },
    appliedAt: { type: Date },
    recruiterCalledAt: { type: Date },
    interviewScheduledAt: { type: Date },
    selectedAt: { type: Date },
    rejectedAt: { type: Date },
    ignoredAt: { type: Date },
    timeline: [
      {
        stage: { type: String, required: true },
        date: { type: Date, required: true, default: Date.now },
        title: { type: String, required: true },
        notes: { type: String, default: '' },
      },
    ],
    location: optionalString(160),
    workMode: optionalString(40),
    salary: optionalString(100),
    source: optionalString(120),
    recruiterId: { type: Schema.Types.ObjectId, ref: 'Recruiter' },
    recruiterEmail: optionalString(254),
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },
    coverLetter: optionalString(20000),
    nextAction: optionalString(400),
    nextActionAt: { type: Date },
    notes: optionalString(8000),
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, companyId: 1 });
applicationSchema.index({ userId: 1, appliedAt: -1 });
applicationSchema.index({ userId: 1, nextActionAt: 1 });
applyJsonTransform(applicationSchema);

export type ApplicationDoc = InferSchemaType<typeof applicationSchema> & { _id: Types.ObjectId };
export const Application = model('Application', applicationSchema);
