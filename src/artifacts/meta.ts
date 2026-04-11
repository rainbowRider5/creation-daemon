import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface IssueMeta {
  issue: number;
  title: string;
  status: string;
  priority: string;
  branch: string | null;
  pr: number | null;
  dependencies: number[];
  artifacts: { file: string; type: string; created: string }[];
  blocked: boolean;
  blocked_question: string | null;
  created: string;
  updated: string;
}

export function metaPath(issueNumber: number): string {
  return join('docs', 'issues', String(issueNumber), 'meta.json');
}

export function readMeta(issueNumber: number): IssueMeta | null {
  const path = metaPath(issueNumber);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as IssueMeta;
}

export function writeMeta(issueNumber: number, meta: IssueMeta): void {
  const dir = join('docs', 'issues', String(issueNumber));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  meta.updated = new Date().toISOString();
  writeFileSync(metaPath(issueNumber), JSON.stringify(meta, null, 2) + '\n');
}
