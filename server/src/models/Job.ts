import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { EMPLOYMENT_TYPES, WORK_MODES } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const requiredSkillSchema = new Schema(
  {
    name: requiredString(80),
    level: { type: Number, min: 0, max: 100, default: 70 },
    weight: { type: Number, min: 0, max: 1, default: 1 },
  },
  { _id: false },
);

const salaryRangeSchema = new Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 8, default: 'USD' },
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    companyId: { ...objectId, ref: 'Company', index: true },
    title: requiredString(200),
    jobIdExternal: optionalString(120),
    url: optionalString(1000),
    location: optionalString(160),
    workMode: { type: String, enum: WORK_MODES },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES },
    salaryRange: { type: salaryRangeSchema, default: () => ({}) },
    requiredExperienceYears: { type: Number, min: 0, max: 50 },
    requiredSkills: { type: [requiredSkillSchema], default: [] },
    description: optionalString(20000),
    source: optionalString(120),
    postedAt: { type: Date },
    deadlineAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

jobSchema.index({ userId: 1, companyId: 1, createdAt: -1 });
jobSchema.index({ userId: 1, title: 1 });
applyJsonTransform(jobSchema);

export type JobDoc = InferSchemaType<typeof jobSchema> & { _id: Types.ObjectId };
export const Job = model('Job', jobSchema);
