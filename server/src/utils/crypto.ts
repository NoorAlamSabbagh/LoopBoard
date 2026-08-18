import { createHash, randomBytes } from 'node:crypto';

export function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hashQuestion(prompt: string): string {
  return createHash('sha256').update(normalizePrompt(prompt)).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

export function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}
