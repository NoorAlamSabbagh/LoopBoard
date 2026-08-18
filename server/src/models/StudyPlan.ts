import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { STUDY_PLAN_SOURCES, STUDY_PLAN_STATUSES } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const studyPlanItemSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'PreparationTopic' },
    title: requiredString(200),
    priority: { type: Number, min: 1, max: 3, required: true, default: 2 },
    reason: optionalString(500),
    dueAt: { type: Date },
    done: { type: Boolean, default: false },
  },
  { _id: true },
);

const studyPlanSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    title: requiredString(200),
    status: { type: String, enum: STUDY_PLAN_STATUSES, required: true, default: 'active' },
    source: { type: String, enum: STUDY_PLAN_SOURCES, required: true, default: 'manual' },
    targetCompanyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    items: { type: [studyPlanItemSchema], default: [] },
  },
  { timestamps: true },
);

studyPlanSchema.index({ userId: 1, status: 1, createdAt: -1 });
applyJsonTransform(studyPlanSchema);

export type StudyPlanDoc = InferSchemaType<typeof studyPlanSchema> & { _id: Types.ObjectId };
export const StudyPlan = model('StudyPlan', studyPlanSchema);
