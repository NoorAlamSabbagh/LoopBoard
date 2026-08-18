import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { RELATIONSHIPS } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const recruiterSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    name: requiredString(160),
    designation: optionalString(160),
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: optionalString(40),
    linkedin: optionalString(500),
    relationship: { type: String, enum: RELATIONSHIPS, default: 'recruiter' },
    lastContactedAt: { type: Date },
    nextFollowUpAt: { type: Date },
    notes: optionalString(8000),
  },
  { timestamps: true },
);

recruiterSchema.index({ userId: 1, companyId: 1 });
recruiterSchema.index({ userId: 1, email: 1 });
recruiterSchema.index({ userId: 1, nextFollowUpAt: 1 });
applyJsonTransform(recruiterSchema);

export type RecruiterDoc = InferSchemaType<typeof recruiterSchema> & { _id: Types.ObjectId };
export const Recruiter = model('Recruiter', recruiterSchema);
