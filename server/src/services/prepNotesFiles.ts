import { mkdir, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { STACK_PREP } from '../constants/stackPrep.js';
import { folderToStack, topicSlugFromTech } from '../utils/stackSlug.js';

const EXT = /\.(md|markdown|txt)$/i;

export type ImportedFile = {
  rel: string;
  stack: string;
  title: string;
  content: string;
  questions: { prompt: string; answer: string }[];
};

export function resolvePrepNotesDir() {
  const candidates = [path.resolve(process.cwd(), 'prep-notes'), path.resolve(process.cwd(), '..', 'prep-notes')];
  return candidates.find((dir) => existsSync(dir)) ?? candidates[1] ?? candidates[0]!;
}

export async function ensurePrepNotesFolders() {
  const root = path.resolve(process.cwd(), '..', 'prep-notes');
  await mkdir(root, { recursive: true });
  const names = [...new Set(STACK_PREP.map((s) => (s.id === 'system_design' ? 'system-design' : s.id)))];
  await Promise.all(names.map((name) => mkdir(path.join(root, name), { recursive: true })));
  return root;
}

export async function ensureStackFolder(tech: string) {
  const root = resolvePrepNotesDir();
  await mkdir(root, { recursive: true });
  await mkdir(path.join(root, topicSlugFromTech(tech)), { recursive: true });
}

export function stackFromRel(rel: string) {
  const folder = rel.split(/[/\\]/)[0]?.toLowerCase() ?? 'other';
  return folderToStack(folder);
}

export function titleFromFile(rel: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim().slice(0, 200);
  const base = path.basename(rel).replace(EXT, '');
  return base.replace(/[-_]+/g, ' ').trim().slice(0, 200) || rel;
}

export function parseQaBlocks(content: string) {
  const chunks = content.split(/\n(?=Q:\s)/i);
  const questions: { prompt: string; answer: string }[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^Q:\s*(.+?)(?:\nA:\s*([\s\S]*))?$/i);
    if (!m?.[1]) continue;
    const prompt = m[1].split('\n')[0]!.trim();
    const answer = (m[2] ?? '').trim();
    if (prompt.length > 3) questions.push({ prompt, answer });
  }
  return questions;
}

async function walk(dir: string, rel = ''): Promise<{ rel: string; abs: string }[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: { rel: string; abs: string }[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name.toLowerCase() === 'readme.md') continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(abs, childRel)));
    else if (EXT.test(entry.name)) out.push({ rel: childRel.replaceAll('\\', '/'), abs });
  }
  return out;
}

export async function readPrepNoteFiles(): Promise<{ dir: string; files: ImportedFile[] }> {
  const dir = resolvePrepNotesDir();
  const files = existsSync(dir) ? await walk(dir) : [];
  const parsed: ImportedFile[] = [];
  for (const file of files) {
    const raw = await readFile(file.abs, 'utf8');
    const content = raw.replace(/^\uFEFF/, '').trim();
    if (!content) continue;
    parsed.push({
      rel: file.rel,
      stack: stackFromRel(file.rel),
      title: titleFromFile(file.rel, content),
      content: content.slice(0, 20000),
      questions: parseQaBlocks(content),
    });
  }
  return { dir, files: parsed };
}
