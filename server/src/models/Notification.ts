import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const notificationSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: requiredString(200),
    body: optionalString(2000),
    entityType: optionalString(40),
    entityId: { type: Schema.Types.ObjectId },
    dueAt: { type: Date, required: true },
    readAt: { type: Date, default: null },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true, default: 'in_app' },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, readAt: 1, dueAt: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
applyJsonTransform(notificationSchema);

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & { _id: Types.ObjectId };
export const Notification = model('Notification', notificationSchema);
