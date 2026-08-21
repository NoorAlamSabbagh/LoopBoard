import { mkdir, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { STACK_PREP } from '../constants/stackPrep.js';
import { folderToStack, topicSlugFromTech } from '../utils/stackSlug.js';

export const EXT = /\.(md|markdown|txt|js|ts|jsx|tsx|py|java|cpp|c|cs|go|rs|sql|html|css|json|yaml|yml|sh)$/i;

export type ImportedFile = {
  rel: string;
  stack: string;
  folderPath: string;
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

export function folderPathFromRel(rel: string) {
  const parts = rel.split(/[/\\]/);
  if (parts.length > 2) {
    return parts.slice(1, -1).join('/');
  }
  return '';
}

export function titleFromFile(rel: string, content: string) {
  const heading = content.match(/^(?:#|\/{2,}|\/\*+|\*+|#+)\s*#*\s*([^\r\n*]+)/m);
  if (heading?.[1]) {
    const candidate = heading[1].trim();
    if (candidate.length > 2 && !candidate.toLowerCase().startsWith('q:') && !candidate.toLowerCase().startsWith('question:')) {
      return candidate.slice(0, 200);
    }
  }
  const base = path.basename(rel).replace(EXT, '');
  return base.replace(/[-_]+/g, ' ').trim().slice(0, 200) || path.basename(rel);
}

export function parseQaBlocks(content: string) {
  const cleanLines = content
    .split('\n')
    .map((line) => line.replace(/^[\s/*#\->]+(?=(?:Q|Question|A|Answer)\s*:)/i, ''))
    .join('\n');

  const chunks = cleanLines.split(/\n(?=(?:Q|Question)\s*:\s*)/i);
  const questions: { prompt: string; answer: string }[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^(?:Q|Question)\s*:\s*([\s\S]+?)(?:\n(?:A|Answer)\s*:\s*([\s\S]*))?$/i);
    if (!m?.[1]) continue;
    const prompt = m[1].split('\n')[0]!.trim().replace(/^[\s/*#\->]+/, '');
    const answer = (m[2] ?? '')
      .split('\n')
      .map((l) => l.replace(/^[\s/*#\->]+/, ''))
      .join('\n')
      .trim();
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

export async function readPrepNoteFiles(targetStack?: string): Promise<{ dir: string; files: ImportedFile[] }> {
  const dir = resolvePrepNotesDir();
  const files = existsSync(dir) ? await walk(dir) : [];
  const parsed: ImportedFile[] = [];
  for (const file of files) {
    const stack = stackFromRel(file.rel);
    if (targetStack && stack !== targetStack && targetStack !== 'all') {
      continue;
    }
    const raw = await readFile(file.abs, 'utf8');
    const content = raw.replace(/^\uFEFF/, '').trim();
    if (!content) continue;
    parsed.push({
      rel: file.rel,
      stack,
      folderPath: folderPathFromRel(file.rel),
      title: titleFromFile(file.rel, content),
      content: content.slice(0, 500000),
      questions: parseQaBlocks(content),
    });
  }
  return { dir, files: parsed };
}
