import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { applyJsonTransform, objectId, requiredString, scoreField } from './schemaHelpers.js';

const skillSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    name: requiredString(80),
    selfScore: { ...scoreField, required: true },
    derivedScore: scoreField,
    blendedScore: scoreField,
    lastDerivedAt: { type: Date },
  },
  { timestamps: true },
);

skillSchema.index({ userId: 1, name: 1 }, { unique: true });
skillSchema.index({ userId: 1, blendedScore: 1 });
applyJsonTransform(skillSchema);

export type SkillDoc = InferSchemaType<typeof skillSchema> & { _id: Types.ObjectId };
export const Skill = model('Skill', skillSchema);
