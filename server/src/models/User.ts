import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { applyJsonTransform, optionalString, requiredString } from './schemaHelpers.js';
import { WORK_MODES } from '../constants/enums.js';

const salarySchema = new Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 8, default: 'USD' },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: requiredString(120),
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
    },
    passwordHash: { type: String, required: true, select: false },
    phone: optionalString(40),
    location: optionalString(160),
    yearsOfExperience: { type: Number, min: 0, max: 60, default: 0 },
    currentRole: optionalString(160),
    targetRole: optionalString(160),
    expectedSalary: { type: salarySchema, default: () => ({}) },
    preferredLocations: { type: [String], default: [] },
    preferredWorkMode: { type: [String], enum: WORK_MODES, default: [] },
    github: optionalString(300),
    linkedin: optionalString(300),
    portfolio: optionalString(300),
    defaultResumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },
    timezone: { type: String, trim: true, default: 'UTC', maxlength: 64 },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true },
);

applyJsonTransform(userSchema);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = model('User', userSchema);
