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

describe('artifact-store', () => {
  beforeEach(() => {
    mkdirSync(DOCS_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('writeMeta', () => {
    it('creates directory and writes meta.json', () => {
      const meta: IssueMeta = {
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

      writeMeta(42, meta, TEST_DIR);

      const written = JSON.parse(
        readFileSync(join(DOCS_DIR, '42', 'meta.json'), 'utf-8'),
      ) as IssueMeta;
      expect(written.issue).toBe(42);
      expect(written.title).toBe('Test ticket');
    });
  });

  describe('readMeta', () => {
    it('returns null when meta.json does not exist', () => {
      expect(readMeta(999, TEST_DIR)).toBeNull();
    });

    it('reads existing meta.json', () => {
      const dir = join(DOCS_DIR, '42');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'meta.json'), JSON.stringify({ issue: 42, title: 'Test' }));

      const meta = readMeta(42, TEST_DIR);
      expect(meta).not.toBeNull();
      if (meta === null) throw new Error('meta should not be null');
      expect(meta.issue).toBe(42);
    });
  });

  describe('writeArtifact', () => {
    it('creates the first artifact as 001-<type>.md', () => {
      mkdirSync(join(DOCS_DIR, '42'), { recursive: true });
      writeFileSync(
        join(DOCS_DIR, '42', 'meta.json'),
        JSON.stringify({
          issue: 42,
          title: 'Test',
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
        }),
      );

      const path = writeArtifact(42, 'draft', '# Draft content', TEST_DIR);

      expect(path).toContain('001-draft.md');
      expect(existsSync(join(DOCS_DIR, '42', '001-draft.md'))).toBe(true);
      expect(readFileSync(join(DOCS_DIR, '42', '001-draft.md'), 'utf-8')).toBe('# Draft content');
    });

    it('increments sequence number for subsequent artifacts', () => {
      mkdirSync(join(DOCS_DIR, '42'), { recursive: true });
      writeFileSync(
        join(DOCS_DIR, '42', 'meta.json'),
        JSON.stringify({
          issue: 42,
          title: 'Test',
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
        }),
      );

      writeArtifact(42, 'draft', 'First', TEST_DIR);
      const path = writeArtifact(42, 'refinement', 'Second', TEST_DIR);

      expect(path).toContain('002-refinement.md');
    });

    it('updates meta.json artifacts array', () => {
      mkdirSync(join(DOCS_DIR, '42'), { recursive: true });
      writeFileSync(
        join(DOCS_DIR, '42', 'meta.json'),
        JSON.stringify({
          issue: 42,
          title: 'Test',
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
        }),
      );

      writeArtifact(42, 'draft', 'Content', TEST_DIR);

      const meta = readMeta(42, TEST_DIR);
      if (meta === null) throw new Error('meta should not be null');
      expect(meta.artifacts).toHaveLength(1);
      expect(meta.artifacts[0].file).toBe('001-draft.md');
      expect(meta.artifacts[0].type).toBe('draft');
    });
  });

  describe('readArtifacts', () => {
    it('returns empty array when no artifacts exist', () => {
      expect(readArtifacts(999, TEST_DIR)).toEqual([]);
    });

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
});
