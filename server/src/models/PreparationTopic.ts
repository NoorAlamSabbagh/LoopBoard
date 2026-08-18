import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { PREP_PROGRESS } from '../constants/enums.js';
import { applyJsonTransform, confidenceField, objectId, optionalString, requiredString } from './schemaHelpers.js';

const resourceSchema = new Schema(
  {
    title: requiredString(200),
    url: optionalString(1000),
    kind: { type: String, trim: true, maxlength: 40, default: 'link' },
  },
  { _id: true },
);

const preparationTopicSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: [/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'],
    },
    name: requiredString(120),
    parentId: { type: Schema.Types.ObjectId, ref: 'PreparationTopic', default: null },
    progress: { type: Number, enum: PREP_PROGRESS, required: true, default: 0 },
    confidence: { ...confidenceField, default: 1 },
    lastStudiedAt: { type: Date },
    nextReviewAt: { type: Date },
    resources: { type: [resourceSchema], default: [] },
    questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    notes: optionalString(8000),
  },
  { timestamps: true },
);

preparationTopicSchema.index({ userId: 1, slug: 1 }, { unique: true });
preparationTopicSchema.index({ userId: 1, parentId: 1 });
preparationTopicSchema.index({ userId: 1, nextReviewAt: 1 });
applyJsonTransform(preparationTopicSchema);

export type PreparationTopicDoc = InferSchemaType<typeof preparationTopicSchema> & {
  _id: Types.ObjectId;
};
export const PreparationTopic = model('PreparationTopic', preparationTopicSchema);
