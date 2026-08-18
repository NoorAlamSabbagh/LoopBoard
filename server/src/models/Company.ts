import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import {
  COMPANY_SIZES,
  COMPANY_TIERS,
  COMPANY_TYPES,
  TARGET_STATUSES,
} from '../constants/enums.js';
import { SCORE_MAX, SCORE_MIN } from '../constants/scores.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const salaryNotesSchema = new Schema(
  {
    band: optionalString(120),
    currency: { type: String, trim: true, maxlength: 8, default: 'USD' },
    source: optionalString(120),
  },
  { _id: false },
);

const researchSchema = new Schema(
  {
    culture: optionalString(4000),
    products: optionalString(4000),
    recentNews: optionalString(4000),
  },
  { _id: false },
);

const companySchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    name: requiredString(160),
    slug: { type: String, trim: true, lowercase: true, maxlength: 180 },
    logoUrl: optionalString(500),
    website: optionalString(500),
    location: optionalString(160),
    industry: optionalString(120),
    size: { type: String, enum: COMPANY_SIZES },
    type: { type: String, enum: COMPANY_TYPES },
    description: optionalString(8000),
    careerPage: optionalString(500),
    linkedin: optionalString(500),
    glassdoor: optionalString(500),
    priority: { type: Number, min: 1, max: 5, default: 3 },
    targetStatus: { type: String, enum: TARGET_STATUSES, required: true, default: 'target' },
    tier: { type: Number, enum: COMPANY_TIERS },
    interestScore: { type: Number, min: 1, max: 5, default: 3 },
    notes: optionalString(8000),
    salaryNotes: { type: salaryNotesSchema, default: () => ({}) },
    research: { type: researchSchema, default: () => ({}) },
    targetScore: { type: Number, min: SCORE_MIN, max: SCORE_MAX },
    skillMatch: { type: Number, min: SCORE_MIN, max: SCORE_MAX },
    experienceMatch: { type: Number, min: SCORE_MIN, max: SCORE_MAX },
    interviewReadiness: { type: Number, min: SCORE_MIN, max: SCORE_MAX },
    targetScoreComputedAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

companySchema.index({ userId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
companySchema.index({ userId: 1, targetStatus: 1 });
companySchema.index({ userId: 1, tier: 1 });
companySchema.index({ userId: 1, priority: -1 });
companySchema.index({ userId: 1, createdAt: -1 });
applyJsonTransform(companySchema);

export type CompanyDoc = InferSchemaType<typeof companySchema> & { _id: Types.ObjectId };
export const Company = model('Company', companySchema);
