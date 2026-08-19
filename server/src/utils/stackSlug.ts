export const BUILTIN_STACK_TECH = new Set([
  'javascript',
  'typescript',
  'react',
  'nodejs',
  'express',
  'mongodb',
  'system_design',
  'dsa',
  'other',
]);

/** First path segment → built-in stack id */
export const FOLDER_TO_STACK: Record<string, string> = {
  react: 'react',
  reactjs: 'react',
  node: 'nodejs',
  nodejs: 'nodejs',
  'node.js': 'nodejs',
  express: 'express',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  mongodb: 'mongodb',
  mongo: 'mongodb',
  'system-design': 'system_design',
  system_design: 'system_design',
  systemdesign: 'system_design',
  lld: 'system_design',
  hld: 'system_design',
  dsa: 'dsa',
  algorithms: 'dsa',
  leetcode: 'dsa',
  other: 'other',
};

export function slugifyStackName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function stackTechId(slug: string) {
  return slug.replaceAll('-', '_');
}

export function topicSlugFromTech(tech: string) {
  if (tech === 'system_design') return 'system-design';
  return tech.replaceAll('_', '-');
}

export function folderToStack(folder: string) {
  const key = folder.trim().toLowerCase();
  if (FOLDER_TO_STACK[key]) return FOLDER_TO_STACK[key];
  const slug = slugifyStackName(key);
  return slug ? stackTechId(slug) : 'other';
}

export function stackIdFromName(name: string) {
  const key = name.trim().toLowerCase();
  if (FOLDER_TO_STACK[key]) return FOLDER_TO_STACK[key];
  const slug = slugifyStackName(name);
  if (!slug) return '';
  if (FOLDER_TO_STACK[slug]) return FOLDER_TO_STACK[slug];
  return stackTechId(slug);
}
