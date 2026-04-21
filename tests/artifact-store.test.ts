import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  writeArtifact,
  readArtifacts,
  readMeta,
  writeMeta,
} from '../src/artifacts/artifact-store.js';
import type { IssueMeta } from '../src/artifacts/artifact-store.js';

const TEST_DIR = join('tmp-test-artifacts');
const DOCS_DIR = join(TEST_DIR, 'docs', 'issues');

function makeMeta(): IssueMeta {
  return {
    issue: 42,
    title: 'Test ticket',
    state: 'draft',
    priority: 'p2-medium',
    branch: null,
    pr: null,
    dependencies: [],
    artifacts: [],
    blocked: false,
    blockedQuestion: null,
    previousState: null,
    created: '2026-04-12T10:00:00Z',
    updated: '2026-04-12T10:00:00Z',
  };
}

function seedMeta(issueNumber: number) {
  mkdirSync(join(DOCS_DIR, String(issueNumber)), { recursive: true });
  writeFileSync(
    join(DOCS_DIR, String(issueNumber), 'meta.json'),
    JSON.stringify({ ...makeMeta(), issue: issueNumber }),
  );
}

describe('artifact-store', () => {
  beforeEach(() => {
    mkdirSync(DOCS_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('writeMeta', () => {
    it('creates the directory if missing and writes meta.json', () => {
      writeMeta(42, makeMeta(), TEST_DIR);

      const written = JSON.parse(
        readFileSync(join(DOCS_DIR, '42', 'meta.json'), 'utf-8'),
      ) as IssueMeta;
      expect(written.issue).toBe(42);
      expect(written.title).toBe('Test ticket');
    });
  });

  describe('readMeta', () => {
    describe('when meta.json does not exist', () => {
      it('returns null', () => {
        expect(readMeta(999, TEST_DIR)).toBeNull();
      });
    });

    describe('when meta.json exists', () => {
      it('returns the parsed meta', () => {
        seedMeta(42);
        const meta = readMeta(42, TEST_DIR);
        if (meta === null) throw new Error('meta should not be null');
        expect(meta.issue).toBe(42);
      });
    });
  });

  describe('writeArtifact', () => {
    describe('when no artifacts exist yet', () => {
      it('creates the first artifact as 001-<type>.md', () => {
        seedMeta(42);

        const path = writeArtifact(42, 'draft', '# Draft content', TEST_DIR);

        expect(path).toContain('001-draft.md');
        expect(existsSync(join(DOCS_DIR, '42', '001-draft.md'))).toBe(true);
        expect(readFileSync(join(DOCS_DIR, '42', '001-draft.md'), 'utf-8')).toBe('# Draft content');
      });
    });

    describe('when prior artifacts exist', () => {
      it('increments the sequence number', () => {
        seedMeta(42);

        writeArtifact(42, 'draft', 'First', TEST_DIR);
        const path = writeArtifact(42, 'refinement', 'Second', TEST_DIR);

        expect(path).toContain('002-refinement.md');
      });

      it('picks the next seq above the max even if earlier files were deleted', () => {
        const dir = join(DOCS_DIR, '42');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, '005-design.md'), 'Fifth');
        writeFileSync(join(dir, 'meta.json'), JSON.stringify(makeMeta()));

        const path = writeArtifact(42, 'implementation', 'Next', TEST_DIR);

        expect(path).toContain('006-implementation.md');
      });
    });

    describe('when meta.json is present', () => {
      it('appends the artifact to meta.artifacts', () => {
        seedMeta(42);

        writeArtifact(42, 'draft', 'Content', TEST_DIR);

        const meta = readMeta(42, TEST_DIR);
        if (meta === null) throw new Error('meta should not be null');
        expect(meta.artifacts).toHaveLength(1);
        expect(meta.artifacts[0].file).toBe('001-draft.md');
        expect(meta.artifacts[0].type).toBe('draft');
      });
    });
  });

  describe('readArtifacts', () => {
    describe('when the issue directory does not exist', () => {
      it('returns an empty array', () => {
        expect(readArtifacts(999, TEST_DIR)).toEqual([]);
      });
    });

    describe('when artifacts exist', () => {
      it('reads all markdown artifacts sorted by sequence', () => {
        const dir = join(DOCS_DIR, '42');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, '002-refinement.md'), 'Second');
        writeFileSync(join(dir, '001-draft.md'), 'First');
        writeFileSync(join(dir, 'meta.json'), '{}');

        const artifacts = readArtifacts(42, TEST_DIR);

        expect(artifacts).toHaveLength(2);
        expect(artifacts[0].file).toBe('001-draft.md');
        expect(artifacts[0].content).toBe('First');
        expect(artifacts[1].file).toBe('002-refinement.md');
        expect(artifacts[1].content).toBe('Second');
      });
    });

    describe('when a file has an unknown artifact type', () => {
      it('throws', () => {
        const dir = join(DOCS_DIR, '42');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, '001-madeup.md'), 'oops');

        expect(() => readArtifacts(42, TEST_DIR)).toThrow('Unknown artifact type');
      });
    });
  });
});
