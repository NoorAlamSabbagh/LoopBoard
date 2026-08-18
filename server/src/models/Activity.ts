import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { ACTIVITY_ENTITY_TYPES } from '../constants/enums.js';
import { applyJsonTransform, objectId, requiredString } from './schemaHelpers.js';

const activitySchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    verb: requiredString(80),
    entityType: { type: String, enum: ACTIVITY_ENTITY_TYPES, required: true },
    entityId: { ...objectId },
    summary: requiredString(400),
  },
  { timestamps: true },
);

activitySchema.index({ userId: 1, createdAt: -1 });
applyJsonTransform(activitySchema);

export type ActivityDoc = InferSchemaType<typeof activitySchema> & { _id: Types.ObjectId };
export const Activity = model('Activity', activitySchema);
