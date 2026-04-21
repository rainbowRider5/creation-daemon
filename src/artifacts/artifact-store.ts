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

const ARTIFACT_TYPES: ArtifactType[] = [
  'draft',
  'refinement',
  'design',
  'implementation',
  'review',
  'adjustment',
];

const ARTIFACT_FILE_PATTERN = /^(\d{3})-(.+)\.md$/;

function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as string[]).includes(value);
}

export type IssueMeta = {
  issue: number;
  title: string;
  state: TicketState;
  priority: Priority;
  branch: string | null;
  pr: number | null;
  dependencies: number[];
  artifacts: { file: string; type: ArtifactType; created: string }[];
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
  const existingSeqs = readdirSync(dir)
    .map((f) => ARTIFACT_FILE_PATTERN.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]));
  const nextSeq = Math.max(0, ...existingSeqs) + 1;
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

  return readdirSync(dir)
    .map((file) => ({ file, match: ARTIFACT_FILE_PATTERN.exec(file) }))
    .filter((e): e is { file: string; match: RegExpExecArray } => e.match !== null)
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(({ file, match }) => {
      const type = match[2];
      if (!isArtifactType(type)) {
        throw new Error(`Unknown artifact type in file ${file}: ${type}`);
      }
      return {
        file,
        type,
        content: readFileSync(join(dir, file), 'utf-8'),
      };
    });
}
