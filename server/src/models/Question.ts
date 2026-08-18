import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { DIFFICULTIES, QUESTION_CATEGORIES, QUESTION_STATUSES } from '../constants/enums.js';
import { applyJsonTransform, confidenceField, objectId, optionalString, requiredString } from './schemaHelpers.js';

const questionSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    prompt: requiredString(4000),
    normalizedHash: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64,
      match: [/^[a-f0-9]{64}$/, 'normalizedHash must be sha256 hex'],
    },
    technology: { type: String, enum: QUESTION_CATEGORIES, required: true },
    category: { type: String, enum: QUESTION_CATEGORIES, required: true },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },
    answer: optionalString(20000),
    correctAnswer: optionalString(20000),
    confidence: { ...confidenceField, default: 1 },
    status: { type: String, enum: QUESTION_STATUSES, required: true, default: 'not_studied' },
    notes: optionalString(8000),
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

questionSchema.index(
  { userId: 1, normalizedHash: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
questionSchema.index({ userId: 1, technology: 1, status: 1 });
questionSchema.index({ userId: 1, category: 1 });
questionSchema.index({ userId: 1, confidence: 1 });
questionSchema.index({ prompt: 'text', notes: 'text' });
applyJsonTransform(questionSchema);

export type QuestionDoc = InferSchemaType<typeof questionSchema> & { _id: Types.ObjectId };
export const Question = model('Question', questionSchema);
