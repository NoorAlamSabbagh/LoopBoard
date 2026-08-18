import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { DIFFICULTIES } from '../constants/enums.js';
import { applyJsonTransform, confidenceField, objectId, optionalString } from './schemaHelpers.js';

const interviewPerformanceSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    interviewId: { ...objectId, ref: 'Interview', unique: true },
    overall: { ...confidenceField, required: true },
    technical: { ...confidenceField, required: true },
    communication: { ...confidenceField, required: true },
    confidence: { ...confidenceField, required: true },
    questionsAnswered: { type: Number, min: 0, default: 0 },
    questionsMissed: { type: Number, min: 0, default: 0 },
    difficulty: { type: String, enum: DIFFICULTIES },
    whatWentWell: optionalString(4000),
    whatWentWrong: optionalString(4000),
    whatToImprove: optionalString(4000),
    weakTopics: { type: [String], default: [] },
    strongTopics: { type: [String], default: [] },
  },
  { timestamps: true },
);

interviewPerformanceSchema.index({ userId: 1, createdAt: -1 });
applyJsonTransform(interviewPerformanceSchema);

export type InterviewPerformanceDoc = InferSchemaType<typeof interviewPerformanceSchema> & {
  _id: Types.ObjectId;
};
export const InterviewPerformance = model('InterviewPerformance', interviewPerformanceSchema);
