# V3 Restructure Phase 0: MCP Server Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure claude-create from a v2 monolithic CLI to a v3 MCP server that exposes ticket lifecycle tools (create, transition, schedule, block/unblock, artifacts, status).

**Architecture:** Flat repo — `src/` is the MCP server. Domain modules (`tickets/`, `artifacts/`, `github.ts`) contain business logic. A thin `tools.ts` dispatches MCP tool calls to domain functions. `server.ts` is the stdio entry point.

**Tech Stack:** TypeScript ESM, `@modelcontextprotocol/sdk`, `zod` (MCP peer dep), `@octokit/rest`, `gh` CLI, Vitest.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/server.ts` | MCP server entry point, stdio transport |
| `src/tools.ts` | Tool definitions (name, schema, description) + handler dispatch |
| `src/tickets/state-machine.ts` | TicketState/Priority types, transition validation, label mapping |
| `src/tickets/priority.ts` | Priority sorting, dependency filtering, actionable ticket selection |
| `src/artifacts/artifact-store.ts` | Read/write numbered artifacts + meta.json |
| `src/github.ts` | Octokit client, issue/label/comment CRUD, gh CLI for PRs, repo context |
| `src/utils/slug.ts` | slugify, branchName (ported from v2 as-is) |
| `src/utils/git.ts` | getRemoteUrl, parseGitHubRemote (trimmed from v2) |
| `tests/state-machine.test.ts` | State machine unit tests |
| `tests/priority.test.ts` | Priority sorting + filtering unit tests |
| `tests/artifact-store.test.ts` | Artifact store unit tests |
| `tests/slug.test.ts` | Slug tests (kept from v2) |
| `tests/github.test.ts` | GitHub integration tests (mocked Octokit) |

---

### Task 1: Clean Sweep — Delete v2 Files and Update Dependencies

**Files:**
- Delete: `src/commands/` (all 8 files), `src/claude/` (2 files), `src/config/` (2 files), `src/loop/` (4 files), `src/utils/logger.ts`, `src/github/client.ts`, `src/github/prs.ts`, `src/github/issues.ts`, `src/github/comments.ts`, `src/github/labels.ts`, `src/artifacts/meta.ts`, `src/artifacts/reader.ts`, `src/artifacts/writer.ts`, `bin/cc.ts`
- Delete: `tests/artifacts.test.ts`, `tests/blocker.test.ts`, `tests/scheduler.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Delete all v2 source files**

```bash
rm -rf src/commands src/claude src/config src/loop
rm -f src/utils/logger.ts
rm -rf src/github
rm -rf src/artifacts
rm -f bin/cc.ts
```

- [ ] **Step 2: Delete v2 test stubs**

```bash
rm -f tests/artifacts.test.ts tests/blocker.test.ts tests/scheduler.test.ts
```

- [ ] **Step 3: Create new directory structure**

```bash
mkdir -p src/tickets src/artifacts src/utils
```

- [ ] **Step 4: Update package.json**

Remove `commander`, `chalk`, `ora`, `yaml`. Add `@modelcontextprotocol/sdk` and `zod`. Update `bin` and `main`.

```json
{
  "name": "claude-create",
  "version": "0.1.0",
  "description": "Orchestration layer on top of Claude Code that turns a single developer into a team",
  "type": "module",
  "main": "dist/src/server.js",
  "bin": {
    "cc-server": "dist/src/server.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/src/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "keywords": [
    "claude",
    "ai",
    "orchestration",
    "github",
    "automation",
    "mcp"
  ],
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "@octokit/rest": "^21.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "eslint": "^10.2.0",
    "eslint-config-prettier": "^10.1.8",
    "jiti": "^2.6.1",
    "lefthook": "^2.1.5",
    "prettier": "^3.8.2",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.58.1",
    "vitest": "^3.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: Clean install, no errors. `node_modules/@modelcontextprotocol/sdk` and `node_modules/zod` exist.

- [ ] **Step 6: Verify clean state**

Run: `npm run typecheck`
Expected: May show errors for missing files referenced by tsconfig — that's fine, we'll add them in subsequent tasks.

Run: `npm run test`
Expected: slug.test.ts still passes (slug.ts wasn't deleted yet — it's being ported in Task 2).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: clean sweep of v2 files, update deps for v3 MCP server"
```

---

### Task 2: Port Utils — slug.ts and git.ts

**Files:**
- Create: `src/utils/slug.ts` (copy from v2 backup or re-create — identical content)
- Create: `src/utils/git.ts` (trimmed from v2)
- Keep: `tests/slug.test.ts`

Note: If slug.ts survived the clean sweep (it's in `src/utils/` which wasn't fully deleted), verify it's intact. If not, recreate it.

- [ ] **Step 1: Verify or recreate src/utils/slug.ts**

```typescript
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function branchName(pattern: string, issueNumber: number, title: string) {
  return pattern.replace('{issue}', String(issueNumber)).replace('{slug}', slugify(title));
}
```

- [ ] **Step 2: Create trimmed src/utils/git.ts**

Only keep `getRemoteUrl` and `parseGitHubRemote` — drop branch/commit/push ops that Claude Code handles natively.

```typescript
import { execSync } from 'node:child_process';

export function getRemoteUrl(): string | null {
  try {
    return execSync('git remote get-url origin', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    return null;
  }
}

export function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  const match = /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
```

- [ ] **Step 3: Run existing slug tests**

Run: `npm run test`
Expected: PASS — slug.test.ts passes, no other test files yet.

- [ ] **Step 4: Commit**

```bash
git add src/utils/slug.ts src/utils/git.ts tests/slug.test.ts
git commit -m "feat: port slug and git utils from v2"
```

---

### Task 3: State Machine

**Files:**
- Create: `src/tickets/state-machine.ts`
- Create: `tests/state-machine.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  getStateFromLabels,
  labelForState,
  VALID_TRANSITIONS,
} from '../src/tickets/state-machine.js';
import type { TicketState } from '../src/tickets/state-machine.js';

describe('validateTransition', () => {
  describe('when transition is valid', () => {
    it('allows draft to refined', () => {
      const result = validateTransition('draft', 'refined');
      expect(result).toEqual({ valid: true });
    });

    it('allows in-review back to in-progress', () => {
      const result = validateTransition('in-review', 'in-progress');
      expect(result).toEqual({ valid: true });
    });

    it('allows any state to done', () => {
      const states: TicketState[] = ['draft', 'refined', 'ready', 'in-progress', 'in-review'];
      for (const state of states) {
        expect(validateTransition(state, 'done')).toEqual({ valid: true });
      }
    });

    it('allows any state to blocked', () => {
      const states: TicketState[] = ['draft', 'refined', 'ready', 'in-progress', 'in-review'];
      for (const state of states) {
        expect(validateTransition(state, 'blocked')).toEqual({ valid: true });
      }
    });

    it('allows blocked to previous state when previousState is provided', () => {
      const result = validateTransition('blocked', 'in-progress', 'in-progress');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('when transition is invalid', () => {
    it('rejects draft to in-progress (must go through refined and ready)', () => {
      const result = validateTransition('draft', 'in-progress');
      expect(result).toEqual({
        valid: false,
        reason: expect.stringContaining('draft'),
      });
    });

    it('rejects done to any state', () => {
      const result = validateTransition('done', 'draft');
      expect(result).toEqual({
        valid: false,
        reason: expect.stringContaining('done'),
      });
    });

    it('rejects blocked without previousState', () => {
      const result = validateTransition('blocked', 'in-progress');
      expect(result).toEqual({
        valid: false,
        reason: expect.stringContaining('previousState'),
      });
    });

    it('rejects blocked to a state that is not the previousState', () => {
      const result = validateTransition('blocked', 'ready', 'in-progress');
      expect(result).toEqual({
        valid: false,
        reason: expect.stringContaining('previous'),
      });
    });
  });
});

describe('getStateFromLabels', () => {
  it('extracts state from cc: prefixed labels', () => {
    const labels = ['bug', 'cc:draft', 'cc:p2-medium'];
    expect(getStateFromLabels(labels)).toBe('draft');
  });

  it('returns null when no state label found', () => {
    const labels = ['bug', 'enhancement'];
    expect(getStateFromLabels(labels)).toBeNull();
  });

  it('ignores priority labels', () => {
    const labels = ['cc:p0-critical'];
    expect(getStateFromLabels(labels)).toBeNull();
  });

  it('throws when multiple state labels found', () => {
    const labels = ['cc:draft', 'cc:refined'];
    expect(() => getStateFromLabels(labels)).toThrow('multiple');
  });
});

describe('labelForState', () => {
  it('maps state to cc: label', () => {
    expect(labelForState('draft')).toBe('cc:draft');
    expect(labelForState('in-progress')).toBe('cc:in-progress');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/state-machine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement state-machine.ts**

```typescript
export type TicketState =
  | 'draft'
  | 'refined'
  | 'ready'
  | 'in-progress'
  | 'in-review'
  | 'done'
  | 'blocked';

export type Priority = 'p0-critical' | 'p1-high' | 'p2-medium' | 'p3-low';

const STATE_LABELS: TicketState[] = [
  'draft',
  'refined',
  'ready',
  'in-progress',
  'in-review',
  'done',
  'blocked',
];

export const VALID_TRANSITIONS: Record<TicketState, TicketState[]> = {
  draft: ['refined', 'done', 'blocked'],
  refined: ['ready', 'done', 'blocked'],
  ready: ['in-progress', 'done', 'blocked'],
  'in-progress': ['in-review', 'done', 'blocked'],
  'in-review': ['in-progress', 'done', 'blocked'],
  done: [],
  blocked: [], // handled specially — requires previousState
};

type TransitionResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateTransition(
  from: TicketState,
  to: TicketState,
  previousState?: TicketState,
): TransitionResult {
  if (from === 'blocked') {
    if (!previousState) {
      return { valid: false, reason: 'Transition from blocked requires previousState' };
    }
    if (to !== previousState) {
      return {
        valid: false,
        reason: `Can only transition from blocked back to previous state (${previousState}), not ${to}`,
      };
    }
    return { valid: true };
  }

  if (VALID_TRANSITIONS[from].includes(to)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Cannot transition from ${from} to ${to}. Allowed: ${VALID_TRANSITIONS[from].join(', ') || 'none'}`,
  };
}

export function getStateFromLabels(labels: string[]): TicketState | null {
  const stateLabels = labels
    .filter((l) => l.startsWith('cc:'))
    .map((l) => l.slice(3))
    .filter((s): s is TicketState => STATE_LABELS.includes(s as TicketState));

  if (stateLabels.length === 0) return null;
  if (stateLabels.length > 1) {
    throw new Error(`Issue has multiple state labels: ${stateLabels.join(', ')}`);
  }
  return stateLabels[0];
}

export function labelForState(state: TicketState) {
  return `cc:${state}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/state-machine.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/tickets/state-machine.ts tests/state-machine.test.ts
git commit -m "feat: add ticket state machine with transition validation"
```

---

### Task 4: Priority & Scheduling

**Files:**
- Create: `src/tickets/priority.ts`
- Create: `tests/priority.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { sortByPriority, filterActionable, parseDependencies } from '../src/tickets/priority.js';
import type { TicketState, Priority } from '../src/tickets/state-machine.js';

type TicketSummary = {
  number: number;
  state: TicketState;
  priority: Priority;
  body: string;
};

describe('sortByPriority', () => {
  it('sorts by state priority (closer to done first)', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'draft', priority: 'p2-medium', body: '' },
      { number: 2, state: 'in-review', priority: 'p2-medium', body: '' },
      { number: 3, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const sorted = sortByPriority(tickets);
    expect(sorted.map((t) => t.number)).toEqual([2, 3, 1]);
  });

  it('sorts by priority label within same state', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'ready', priority: 'p3-low', body: '' },
      { number: 2, state: 'ready', priority: 'p0-critical', body: '' },
      { number: 3, state: 'ready', priority: 'p1-high', body: '' },
    ];
    const sorted = sortByPriority(tickets);
    expect(sorted.map((t) => t.number)).toEqual([2, 3, 1]);
  });

  it('state priority takes precedence over priority label', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'draft', priority: 'p0-critical', body: '' },
      { number: 2, state: 'in-review', priority: 'p3-low', body: '' },
    ];
    const sorted = sortByPriority(tickets);
    expect(sorted.map((t) => t.number)).toEqual([2, 1]);
  });
});

describe('filterActionable', () => {
  it('removes blocked tickets', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'blocked', priority: 'p2-medium', body: '' },
      { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const result = filterActionable(tickets, new Set());
    expect(result.map((t) => t.number)).toEqual([2]);
  });

  it('removes done tickets', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'done', priority: 'p2-medium', body: '' },
      { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const result = filterActionable(tickets, new Set());
    expect(result.map((t) => t.number)).toEqual([2]);
  });

  it('removes tickets with unmet dependencies', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'ready', priority: 'p2-medium', body: 'Depends on: #99' },
      { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const doneIssues = new Set<number>();
    const result = filterActionable(tickets, doneIssues);
    expect(result.map((t) => t.number)).toEqual([2]);
  });

  it('keeps tickets whose dependencies are all done', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'ready', priority: 'p2-medium', body: 'Depends on: #10, #20' },
    ];
    const doneIssues = new Set([10, 20]);
    const result = filterActionable(tickets, doneIssues);
    expect(result.map((t) => t.number)).toEqual([1]);
  });
});

describe('parseDependencies', () => {
  it('parses "Depends on: #38, #41" from body', () => {
    expect(parseDependencies('Some text\nDepends on: #38, #41\nMore text')).toEqual([38, 41]);
  });

  it('returns empty array when no dependencies', () => {
    expect(parseDependencies('No deps here')).toEqual([]);
  });

  it('handles single dependency', () => {
    expect(parseDependencies('Depends on: #5')).toEqual([5]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/priority.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement priority.ts**

```typescript
import type { TicketState, Priority } from './state-machine.js';

type TicketSummary = {
  number: number;
  state: TicketState;
  priority: Priority;
  body: string;
};

const STATE_PRIORITY: Record<string, number> = {
  'in-review': 0,
  'in-progress': 1,
  ready: 2,
  refined: 3,
  draft: 4,
};

const PRIORITY_ORDER: Record<string, number> = {
  'p0-critical': 0,
  'p1-high': 1,
  'p2-medium': 2,
  'p3-low': 3,
};

export function sortByPriority<T extends TicketSummary>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    const stateA = STATE_PRIORITY[a.state] ?? 99;
    const stateB = STATE_PRIORITY[b.state] ?? 99;
    if (stateA !== stateB) return stateA - stateB;

    const prioA = PRIORITY_ORDER[a.priority] ?? 99;
    const prioB = PRIORITY_ORDER[b.priority] ?? 99;
    return prioA - prioB;
  });
}

export function parseDependencies(body: string): number[] {
  const match = /Depends on:\s*(#\d+(?:\s*,\s*#\d+)*)/.exec(body);
  if (!match) return [];
  return [...match[1].matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
}

export function filterActionable<T extends TicketSummary>(
  tickets: T[],
  doneIssues: Set<number>,
): T[] {
  return tickets.filter((ticket) => {
    if (ticket.state === 'blocked' || ticket.state === 'done') return false;

    const deps = parseDependencies(ticket.body);
    return deps.every((dep) => doneIssues.has(dep));
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/priority.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/tickets/priority.ts tests/priority.test.ts
git commit -m "feat: add priority sorting and dependency filtering"
```

---

### Task 5: Artifact Store

**Files:**
- Create: `src/artifacts/artifact-store.ts`
- Create: `tests/artifact-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { writeArtifact, readArtifacts, readMeta, writeMeta } from '../src/artifacts/artifact-store.js';
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
      );
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
      writeFileSync(
        join(dir, 'meta.json'),
        JSON.stringify({ issue: 42, title: 'Test' }),
      );

      const meta = readMeta(42, TEST_DIR);
      expect(meta).not.toBeNull();
      expect(meta!.issue).toBe(42);
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
      expect(readFileSync(join(DOCS_DIR, '42', '001-draft.md'), 'utf-8')).toBe(
        '# Draft content',
      );
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

      const meta = readMeta(42, TEST_DIR)!;
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/artifact-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement artifact-store.ts**

```typescript
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/artifact-store.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/artifacts/artifact-store.ts tests/artifact-store.test.ts
git commit -m "feat: add artifact store for versioned ticket documents"
```

---

### Task 6: GitHub Integration

**Files:**
- Create: `src/github.ts`
- Create: `tests/github.test.ts`

- [ ] **Step 1: Write the failing tests**

Test the pure functions and mock Octokit for API calls.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@octokit/rest', () => {
  const mockIssues = {
    create: vi.fn(),
    get: vi.fn(),
    listForRepo: vi.fn(),
    addLabels: vi.fn(),
    removeLabel: vi.fn(),
  };
  const mockIssueComments = {
    create: vi.fn(),
    listForRepo: vi.fn(),
  };
  const mockRepoLabels = {
    createForRepo: vi.fn(),
    listForRepo: vi.fn(),
  };
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      issues: mockIssues,
      rest: {
        issues: {
          ...mockIssues,
          ...mockIssueComments,
          listComments: mockIssueComments.listForRepo,
        },
      },
    })),
    _mockIssues: mockIssues,
    _mockIssueComments: mockIssueComments,
    _mockRepoLabels: mockRepoLabels,
  };
});

vi.mock('./utils/git.js', () => ({
  getRemoteUrl: vi.fn(() => 'git@github.com:testowner/testrepo.git'),
  parseGitHubRemote: vi.fn(() => ({ owner: 'testowner', repo: 'testrepo' })),
}));

import { getRepoContext, CC_LABELS } from '../src/github.js';

describe('getRepoContext', () => {
  it('returns owner and repo from git remote', () => {
    const ctx = getRepoContext();
    expect(ctx).toEqual({ owner: 'testowner', repo: 'testrepo' });
  });
});

describe('CC_LABELS', () => {
  it('defines all status labels', () => {
    const labelNames = Object.keys(CC_LABELS);
    expect(labelNames).toContain('cc:draft');
    expect(labelNames).toContain('cc:refined');
    expect(labelNames).toContain('cc:ready');
    expect(labelNames).toContain('cc:in-progress');
    expect(labelNames).toContain('cc:in-review');
    expect(labelNames).toContain('cc:done');
    expect(labelNames).toContain('cc:blocked');
  });

  it('defines all priority labels', () => {
    const labelNames = Object.keys(CC_LABELS);
    expect(labelNames).toContain('cc:p0-critical');
    expect(labelNames).toContain('cc:p1-high');
    expect(labelNames).toContain('cc:p2-medium');
    expect(labelNames).toContain('cc:p3-low');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/github.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement github.ts**

```typescript
import { Octokit } from '@octokit/rest';
import { execSync } from 'node:child_process';
import { getRemoteUrl, parseGitHubRemote } from './utils/git.js';

export const CC_LABELS: Record<string, { color: string; description: string }> = {
  'cc:draft': { color: 'e0e0e0', description: 'Rough idea, needs refinement' },
  'cc:refined': { color: 'c5def5', description: 'Has a spec, needs approval' },
  'cc:ready': { color: '0e8a16', description: 'Approved for implementation' },
  'cc:in-progress': { color: 'fbca04', description: 'Being implemented, branch exists' },
  'cc:in-review': { color: '1d76db', description: 'PR open, awaiting review' },
  'cc:done': { color: '0e8a16', description: 'Merged, complete' },
  'cc:blocked': { color: 'd93f0b', description: 'Needs human input' },
  'cc:p0-critical': { color: 'b60205', description: 'Do this first' },
  'cc:p1-high': { color: 'd93f0b', description: 'Important' },
  'cc:p2-medium': { color: 'fbca04', description: 'Normal (default)' },
  'cc:p3-low': { color: 'c2e0c6', description: 'Nice to have' },
};

let _octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (_octokit) return _octokit;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  _octokit = new Octokit({ auth: token });
  return _octokit;
}

export function getRepoContext(): { owner: string; repo: string } {
  const url = getRemoteUrl();
  if (!url) throw new Error('No git remote found. Are you in a git repository?');

  const parsed = parseGitHubRemote(url);
  if (!parsed) throw new Error(`Not a GitHub remote: ${url}`);

  return parsed;
}

export async function createIssue(
  title: string,
  body: string,
  labels: string[],
) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });

  return { number: data.number, url: data.html_url };
}

export async function getIssue(issueNumber: number) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return {
    number: data.number,
    title: data.title,
    body: data.body ?? '',
    labels: data.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
    state: data.state,
  };
}

export async function listIssuesByLabel(labelPrefix = 'cc:') {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });

  return data
    .filter((issue) => {
      const labels = issue.labels.map((l) =>
        typeof l === 'string' ? l : l.name ?? '',
      );
      return labels.some((l) => l.startsWith(labelPrefix));
    })
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
    }));
}

export async function updateLabels(
  issueNumber: number,
  add: string[],
  remove: string[],
) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  for (const label of remove) {
    try {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch {
      // label may not exist on issue — ignore
    }
  }

  if (add.length > 0) {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: add,
    });
  }
}

export async function ensureLabels() {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data: existing } = await octokit.issues.listLabelsForRepo({
    owner,
    repo,
    per_page: 100,
  });
  const existingNames = new Set(existing.map((l) => l.name));

  let created = 0;
  for (const [name, config] of Object.entries(CC_LABELS)) {
    if (!existingNames.has(name)) {
      await octokit.issues.createLabel({
        owner,
        repo,
        name,
        color: config.color,
        description: config.description,
      });
      created++;
    }
  }

  return { created, existing: Object.keys(CC_LABELS).length - created };
}

export async function postComment(issueNumber: number, body: string) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });

  return { id: data.id, url: data.html_url };
}

export async function getCommentsSince(issueNumber: number, since: string) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    since,
  });

  return data
    .filter((c) => !c.user?.login?.includes('[bot]'))
    .map((c) => ({
      id: c.id,
      body: c.body ?? '',
      user: c.user?.login ?? 'unknown',
      created: c.created_at,
    }));
}

export function createPR(branch: string, title: string, body: string) {
  const result = execSync(
    `gh pr create --head "${branch}" --title "${title}" --body "${body}"`,
    { encoding: 'utf-8' },
  ).trim();

  const prUrlMatch = /\/pull\/(\d+)/.exec(result);
  const prNumber = prUrlMatch ? Number(prUrlMatch[1]) : null;
  return { url: result, number: prNumber };
}

export function reviewPR(
  prNumber: number,
  action: 'approve' | 'request-changes',
  body?: string,
) {
  const bodyFlag = body ? ` --body "${body}"` : '';
  execSync(
    `gh pr review ${prNumber} --${action}${bodyFlag}`,
    { encoding: 'utf-8' },
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/github.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/github.ts tests/github.test.ts
git commit -m "feat: add GitHub integration with Octokit and gh CLI"
```

---

### Task 7: MCP Tools Dispatch Layer

**Files:**
- Create: `src/tools.ts`

- [ ] **Step 1: Implement tools.ts**

This is a thin dispatch layer — all logic lives in domain modules. Testing happens at the domain level (Tasks 3-6) and via integration (Task 9).

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  validateTransition,
  getStateFromLabels,
  labelForState,
} from './tickets/state-machine.js';
import type { TicketState, Priority } from './tickets/state-machine.js';
import { sortByPriority, filterActionable, parseDependencies } from './tickets/priority.js';
import {
  writeArtifact,
  readArtifacts,
  readMeta,
  writeMeta,
} from './artifacts/artifact-store.js';
import type { IssueMeta, ArtifactType } from './artifacts/artifact-store.js';
import {
  createIssue,
  getIssue,
  listIssuesByLabel,
  updateLabels,
  ensureLabels,
  postComment,
  getCommentsSince,
  CC_LABELS,
} from './github.js';
import { slugify } from './utils/slug.js';

export function registerTools(server: McpServer) {
  server.tool(
    'cc_create_ticket',
    'Create a GitHub issue with cc:draft label',
    {
      title: z.string().describe('Issue title'),
      body: z.string().describe('Issue body (markdown)'),
      priority: z
        .enum(['p0-critical', 'p1-high', 'p2-medium', 'p3-low'])
        .default('p2-medium')
        .describe('Priority level'),
    },
    async ({ title, body, priority }) => {
      const labels = ['cc:draft', `cc:${priority}`];
      const result = await createIssue(title, body, labels);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Created ticket #${result.number}: ${result.url}`,
          },
        ],
      };
    },
  );

  server.tool(
    'cc_list_tickets',
    'List all cc:* issues with their state and priority',
    {
      state: z
        .enum(['draft', 'refined', 'ready', 'in-progress', 'in-review', 'done', 'blocked'])
        .optional()
        .describe('Filter by state'),
    },
    async ({ state }) => {
      const issues = await listIssuesByLabel('cc:');
      const tickets = issues
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          state: getStateFromLabels(issue.labels),
          labels: issue.labels,
        }))
        .filter((t) => t.state !== null)
        .filter((t) => !state || t.state === state);

      const text = tickets
        .map((t) => `#${t.number} [${t.state}] ${t.title}`)
        .join('\n');

      return {
        content: [{ type: 'text' as const, text: text || 'No tickets found.' }],
      };
    },
  );

  server.tool(
    'cc_get_ticket',
    'Get full ticket context: issue details, artifacts, and meta',
    {
      issue_number: z.number().describe('GitHub issue number'),
    },
    async ({ issue_number }) => {
      const issue = await getIssue(issue_number);
      const meta = readMeta(issue_number);
      const artifacts = readArtifacts(issue_number);

      const parts = [
        `# Ticket #${issue_number}: ${issue.title}`,
        '',
        `**State:** ${getStateFromLabels(issue.labels) ?? 'unknown'}`,
        `**Labels:** ${issue.labels.join(', ')}`,
        '',
        '## Description',
        issue.body,
      ];

      if (meta) {
        parts.push('', '## Meta', JSON.stringify(meta, null, 2));
      }

      if (artifacts.length > 0) {
        parts.push('', '## Artifacts');
        for (const a of artifacts) {
          parts.push('', `### ${a.file}`, a.content);
        }
      }

      return {
        content: [{ type: 'text' as const, text: parts.join('\n') }],
      };
    },
  );

  server.tool(
    'cc_transition_state',
    'Move a ticket to a new state (validates allowed transitions)',
    {
      issue_number: z.number().describe('GitHub issue number'),
      new_state: z
        .enum(['draft', 'refined', 'ready', 'in-progress', 'in-review', 'done', 'blocked'])
        .describe('Target state'),
    },
    async ({ issue_number, new_state }) => {
      const issue = await getIssue(issue_number);
      const currentState = getStateFromLabels(issue.labels);

      if (!currentState) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Issue #${issue_number} has no cc:* state label.`,
            },
          ],
          isError: true,
        };
      }

      const meta = readMeta(issue_number);
      const previousState = meta?.previousState ?? undefined;
      const result = validateTransition(currentState, new_state as TicketState, previousState);

      if (!result.valid) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.reason}` }],
          isError: true,
        };
      }

      await updateLabels(
        issue_number,
        [labelForState(new_state as TicketState)],
        [labelForState(currentState)],
      );

      if (meta) {
        meta.state = new_state as TicketState;
        meta.updated = new Date().toISOString();
        writeMeta(issue_number, meta);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Transitioned #${issue_number} from ${currentState} to ${new_state}`,
          },
        ],
      };
    },
  );

  server.tool(
    'cc_pick_next_ticket',
    'Returns the highest-priority actionable ticket',
    {},
    async () => {
      const issues = await listIssuesByLabel('cc:');
      const allTickets = issues.map((issue) => {
        const state = getStateFromLabels(issue.labels);
        const priorityLabel = issue.labels.find((l) => l.startsWith('cc:p'));
        const priority = priorityLabel
          ? (priorityLabel.slice(3) as Priority)
          : ('p2-medium' as Priority);

        return {
          number: issue.number,
          title: issue.title,
          state: state!,
          priority,
          body: issue.body,
          labels: issue.labels,
        };
      }).filter((t) => t.state !== null);

      const doneIssues = new Set(
        allTickets.filter((t) => t.state === 'done').map((t) => t.number),
      );

      const actionable = filterActionable(allTickets, doneIssues);
      const sorted = sortByPriority(actionable);

      if (sorted.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No actionable tickets found.' }],
        };
      }

      const next = sorted[0];
      return {
        content: [
          {
            type: 'text' as const,
            text: [
              `Next ticket: #${next.number} — ${next.title}`,
              `State: ${next.state}`,
              `Priority: ${next.priority}`,
              `Body: ${next.body}`,
            ].join('\n'),
          },
        ],
      };
    },
  );

  server.tool(
    'cc_write_artifact',
    'Write a numbered artifact to docs/issues/<n>/',
    {
      issue_number: z.number().describe('GitHub issue number'),
      type: z
        .enum(['draft', 'refinement', 'design', 'implementation', 'review', 'adjustment'])
        .describe('Artifact type'),
      content: z.string().describe('Artifact content (markdown)'),
    },
    async ({ issue_number, type, content }) => {
      let meta = readMeta(issue_number);
      if (!meta) {
        const issue = await getIssue(issue_number);
        const state = getStateFromLabels(issue.labels) ?? 'draft';
        const priorityLabel = issue.labels.find((l) => l.startsWith('cc:p'));
        const priority = priorityLabel
          ? (priorityLabel.slice(3) as Priority)
          : ('p2-medium' as Priority);

        meta = {
          issue: issue_number,
          title: issue.title,
          state: state as TicketState,
          priority,
          branch: null,
          pr: null,
          dependencies: parseDependencies(issue.body),
          artifacts: [],
          blocked: false,
          blockedQuestion: null,
          previousState: null,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
        writeMeta(issue_number, meta);
      }

      const path = writeArtifact(issue_number, type as ArtifactType, content);
      return {
        content: [
          { type: 'text' as const, text: `Artifact written: ${path}` },
        ],
      };
    },
  );

  server.tool(
    'cc_read_artifacts',
    'Read all artifacts for a ticket',
    {
      issue_number: z.number().describe('GitHub issue number'),
    },
    async ({ issue_number }) => {
      const artifacts = readArtifacts(issue_number);

      if (artifacts.length === 0) {
        return {
          content: [
            { type: 'text' as const, text: `No artifacts found for #${issue_number}.` },
          ],
        };
      }

      const text = artifacts
        .map((a) => `## ${a.file}\n\n${a.content}`)
        .join('\n\n---\n\n');

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  server.tool(
    'cc_block_ticket',
    'Mark a ticket as blocked and post a question to GitHub',
    {
      issue_number: z.number().describe('GitHub issue number'),
      question: z.string().describe('Question for the human'),
    },
    async ({ issue_number, question }) => {
      const issue = await getIssue(issue_number);
      const currentState = getStateFromLabels(issue.labels);

      if (!currentState || currentState === 'done') {
        return {
          content: [
            { type: 'text' as const, text: `Error: Cannot block ticket in state: ${currentState}` },
          ],
          isError: true,
        };
      }

      await updateLabels(
        issue_number,
        [labelForState('blocked')],
        [labelForState(currentState)],
      );

      const comment = [
        '**I need your input to continue.**',
        '',
        question,
        '',
        '*Reply here and I\'ll pick this back up automatically on my next loop.*',
      ].join('\n');

      await postComment(issue_number, comment);

      let meta = readMeta(issue_number);
      if (meta) {
        meta.blocked = true;
        meta.blockedQuestion = question;
        meta.previousState = currentState;
        meta.state = 'blocked';
        writeMeta(issue_number, meta);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Blocked #${issue_number}. Question posted to GitHub. Previous state: ${currentState}`,
          },
        ],
      };
    },
  );

  server.tool(
    'cc_unblock_check',
    'Scan blocked tickets for human replies and unblock them',
    {},
    async () => {
      const issues = await listIssuesByLabel('cc:');
      const blockedTickets = issues.filter((issue) =>
        issue.labels.includes('cc:blocked'),
      );

      if (blockedTickets.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No blocked tickets.' }],
        };
      }

      const unblocked: string[] = [];

      for (const issue of blockedTickets) {
        const meta = readMeta(issue.number);
        if (!meta || !meta.previousState) continue;

        const since = meta.updated;
        const comments = await getCommentsSince(issue.number, since);

        if (comments.length > 0) {
          await updateLabels(
            issue.number,
            [labelForState(meta.previousState)],
            [labelForState('blocked')],
          );

          meta.blocked = false;
          meta.blockedQuestion = null;
          meta.state = meta.previousState;
          meta.previousState = null;
          writeMeta(issue.number, meta);

          unblocked.push(
            `#${issue.number} → ${meta.state} (reply from ${comments[0].user})`,
          );
        }
      }

      const text =
        unblocked.length > 0
          ? `Unblocked ${unblocked.length} ticket(s):\n${unblocked.join('\n')}`
          : 'No blocked tickets have new replies.';

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  server.tool(
    'cc_get_status',
    'Show the current ticket board',
    {},
    async () => {
      const issues = await listIssuesByLabel('cc:');

      const groups: Record<string, string[]> = {};
      for (const issue of issues) {
        const state = getStateFromLabels(issue.labels) ?? 'unknown';
        if (!groups[state]) groups[state] = [];
        groups[state].push(`  #${issue.number} ${issue.title}`);
      }

      const order = [
        'blocked',
        'in-review',
        'in-progress',
        'ready',
        'refined',
        'draft',
        'done',
      ];

      const sections = order
        .filter((s) => groups[s]?.length)
        .map((s) => `**${s.toUpperCase()}**\n${groups[s].join('\n')}`)
        .join('\n\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: sections || 'No tickets found.',
          },
        ],
      };
    },
  );

  server.tool(
    'cc_ensure_labels',
    'Create cc:* labels on the repo if missing',
    {},
    async () => {
      const result = await ensureLabels();
      return {
        content: [
          {
            type: 'text' as const,
            text: `Labels: ${result.created} created, ${result.existing} already existed.`,
          },
        ],
      };
    },
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools.ts
git commit -m "feat: add MCP tool definitions and dispatch layer"
```

---

### Task 8: MCP Server Entry Point

**Files:**
- Create: `src/server.ts`

- [ ] **Step 1: Implement server.ts**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';

const server = new McpServer({
  name: 'cc-server',
  version: '0.1.0',
});

registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Verify full build**

Run: `npm run build`
Expected: Compiles with no errors. `dist/src/server.js` exists.

- [ ] **Step 3: Verify server starts and responds**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | node dist/src/server.js`
Expected: JSON response containing `"name":"cc-server"`.

- [ ] **Step 4: Commit**

```bash
git add src/server.ts
git commit -m "feat: add MCP server entry point with stdio transport"
```

---

### Task 9: Integration Verification

**Files:**
- No new files — verification of the full system.

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass (state-machine, priority, artifact-store, slug, github).

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Run lint and fix**

Run: `npm run lint:fix`
Expected: Clean or auto-fixed.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 5: Test server startup**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | node dist/src/server.js`
Expected: Valid MCP initialize response.

- [ ] **Step 6: Verify tool listing**

After initialization, send a tools/list request:
Run: `printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node dist/src/server.js`
Expected: Response listing all 11 tools (cc_create_ticket, cc_list_tickets, cc_get_ticket, cc_transition_state, cc_pick_next_ticket, cc_write_artifact, cc_read_artifacts, cc_block_ticket, cc_unblock_check, cc_get_status, cc_ensure_labels).

- [ ] **Step 7: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: lint fixes and integration verification"
```
