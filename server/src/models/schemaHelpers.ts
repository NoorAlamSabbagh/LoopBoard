import { Schema } from 'mongoose';
import { CONFIDENCE_MAX, CONFIDENCE_MIN, SCORE_MAX, SCORE_MIN } from '../constants/scores.js';

export const objectId = { type: Schema.Types.ObjectId, required: true } as const;

export const requiredString = (max = 300) =>
  ({ type: String, required: true, trim: true, maxlength: max }) as const;

export const optionalString = (max = 2000) =>
  ({ type: String, trim: true, maxlength: max, default: '' }) as const;

export const scoreField = {
  type: Number,
  min: SCORE_MIN,
  max: SCORE_MAX,
  default: 0,
} as const;

export const confidenceField = {
  type: Number,
  min: CONFIDENCE_MIN,
  max: CONFIDENCE_MAX,
} as const;

export function applyJsonTransform(schema: Schema): void {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  });
}
