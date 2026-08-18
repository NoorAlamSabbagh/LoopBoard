import { Activity } from '../models/Activity.js';
import type { ActivityEntityType } from '../constants/enums.js';

export async function logActivity(
  userId: string,
  verb: string,
  entityType: ActivityEntityType,
  entityId: string,
  summary: string,
): Promise<void> {
  await Activity.create({ userId, verb, entityType, entityId, summary });
}
