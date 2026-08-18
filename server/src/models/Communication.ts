import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { COMMUNICATION_CHANNELS } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const communicationSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    recruiterId: { ...objectId, ref: 'Recruiter', index: true },
    channel: { type: String, enum: COMMUNICATION_CHANNELS, required: true },
    happenedAt: { type: Date, required: true },
    summary: requiredString(4000),
  },
  { timestamps: true },
);

communicationSchema.index({ userId: 1, recruiterId: 1, happenedAt: -1 });
applyJsonTransform(communicationSchema);

export type CommunicationDoc = InferSchemaType<typeof communicationSchema> & { _id: Types.ObjectId };
export const Communication = model('Communication', communicationSchema);
