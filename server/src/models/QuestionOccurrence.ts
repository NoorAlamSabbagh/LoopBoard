import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { QUESTION_OUTCOMES } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString } from './schemaHelpers.js';

const questionOccurrenceSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    questionId: { ...objectId, ref: 'Question', index: true },
    companyId: { ...objectId, ref: 'Company', index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
    interviewId: { type: Schema.Types.ObjectId, ref: 'Interview' },
    roundName: optionalString(120),
    askedAt: { type: Date, required: true },
    myAnswer: optionalString(20000),
    outcome: { type: String, enum: QUESTION_OUTCOMES, required: true, default: 'unknown' },
  },
  { timestamps: true },
);

questionOccurrenceSchema.index({ userId: 1, questionId: 1, companyId: 1 });
questionOccurrenceSchema.index({ userId: 1, companyId: 1, askedAt: -1 });
questionOccurrenceSchema.index({ userId: 1, interviewId: 1 });
questionOccurrenceSchema.index({ userId: 1, askedAt: -1 });
applyJsonTransform(questionOccurrenceSchema);

export type QuestionOccurrenceDoc = InferSchemaType<typeof questionOccurrenceSchema> & {
  _id: Types.ObjectId;
};
export const QuestionOccurrence = model('QuestionOccurrence', questionOccurrenceSchema);
