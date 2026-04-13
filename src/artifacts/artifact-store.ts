import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TicketState, Priority } from '../tickets/state-machine.js';

export type ArtifactType =
  | 'draft'
  | 'refinement'
  | 'design'
  | 'implementation'
  | 'review'
  | 'adjustment';

export type IssueMeta = {
  issue: number;
  title: string;
  state: TicketState;
  priority: Priority;
  branch: string | null;
  pr: number | null;
  dependencies: number[];
  artifacts: { file: string; type: string; created: string }[];
  blocked: boolean;
  blockedQuestion: string | null;
  previousState: TicketState | null;
  created: string;
  updated: string;
};

function issueDir(issueNumber: number, baseDir: string) {
  return join(baseDir, 'docs', 'issues', String(issueNumber));
}

function metaPath(issueNumber: number, baseDir: string) {
  return join(issueDir(issueNumber, baseDir), 'meta.json');
}

export function readMeta(issueNumber: number, baseDir = '.'): IssueMeta | null {
  const path = metaPath(issueNumber, baseDir);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as IssueMeta;
}

export function writeMeta(issueNumber: number, meta: IssueMeta, baseDir = '.'): void {
  const dir = issueDir(issueNumber, baseDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  meta.updated = new Date().toISOString();
  writeFileSync(metaPath(issueNumber, baseDir), JSON.stringify(meta, null, 2) + '\n');
}

export function writeArtifact(
  issueNumber: number,
  type: ArtifactType,
  content: string,
  baseDir = '.',
) {
  const dir = issueDir(issueNumber, baseDir);
  const existing = readdirSync(dir).filter((f) => /^\d{3}-/.test(f) && f.endsWith('.md'));
  const nextSeq = existing.length + 1;
  const filename = `${String(nextSeq).padStart(3, '0')}-${type}.md`;
  const filePath = join(dir, filename);

  writeFileSync(filePath, content);

  const meta = readMeta(issueNumber, baseDir);
  if (meta) {
    meta.artifacts.push({
      file: filename,
      type,
      created: new Date().toISOString(),
    });
    writeMeta(issueNumber, meta, baseDir);
  }

  return filePath;
}

export function readArtifacts(issueNumber: number, baseDir = '.') {
  const dir = issueDir(issueNumber, baseDir);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => /^\d{3}-/.test(f) && f.endsWith('.md'))
    .sort();

  return files.map((file) => ({
    file,
    type: file.replace(/^\d{3}-/, '').replace(/\.md$/, ''),
    content: readFileSync(join(dir, file), 'utf-8'),
  }));
}
