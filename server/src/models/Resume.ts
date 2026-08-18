import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const resumeSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    name: requiredString(160),
    version: { type: String, trim: true, maxlength: 40, default: '1.0' },
    targetRole: optionalString(160),
    skills: { type: [String], default: [] },
    projects: optionalString(8000),
    experienceSummary: optionalString(8000),
    fileKey: optionalString(500),
    mimeType: optionalString(120),
    sizeBytes: { type: Number, min: 0 },
  },
  { timestamps: true },
);

resumeSchema.index({ userId: 1, updatedAt: -1 });
applyJsonTransform(resumeSchema);

export type ResumeDoc = InferSchemaType<typeof resumeSchema> & { _id: Types.ObjectId };
export const Resume = model('Resume', resumeSchema);
