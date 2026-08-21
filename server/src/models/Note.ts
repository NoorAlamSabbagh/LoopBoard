import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { NOTE_ENTITY_TYPES } from '../constants/enums.js';
import { applyJsonTransform, objectId, optionalString, requiredString } from './schemaHelpers.js';

const noteSchema = new Schema(
  {
    userId: { ...objectId, ref: 'User', index: true },
    title: requiredString(300),
    content: requiredString(500000),
    tags: { type: [String], default: [] },
    folderPath: { type: String, default: '', trim: true },
    entityType: { type: String, enum: NOTE_ENTITY_TYPES, required: true },
    entityId: { ...objectId, index: true },
  },
  { timestamps: true },
);

noteSchema.index({ userId: 1, entityType: 1, entityId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ userId: 1, entityType: 1, entityId: 1, folderPath: 1 });
noteSchema.index({ title: 'text', content: 'text' });
applyJsonTransform(noteSchema);

export type NoteDoc = InferSchemaType<typeof noteSchema> & { _id: Types.ObjectId };
export const Note = model('Note', noteSchema);
