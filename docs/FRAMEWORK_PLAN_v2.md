# claude-create — Framework Plan v2

> **Superseded by [FRAMEWORK_PLAN_v3_HYBRID.md](./FRAMEWORK_PLAN_v3_HYBRID.md)** — v3 replaces the monolithic CLI approach with a hybrid architecture: MCP Server (orchestration brain) + Claude Code Skills (user-facing commands) + GitHub Actions (persistent loop). ~60% of v2's custom code is eliminated by leveraging Claude Code's native features (worktrees, skills, `-p` mode, `/loop`).

## Vision

An open-source orchestration layer on top of Claude Code that turns a single developer into a team. You talk to Claude, tickets get created, agents pick them up autonomously, artifacts accumulate in git, and you only intervene when you want to — or when Claude genuinely needs your input.

---

## Core Workflow

```
You: "cc brainstorm — I want user authentication"
  → Collaborative session, you shape the idea together
  → Claude creates draft tickets on GitHub

Loop picks up tickets autonomously:
  DRAFT → refine into spec → REFINED → approve own spec → READY
  READY → implement on branch → IN_PROGRESS → open PR → IN_REVIEW
  IN_REVIEW → review PR → approve or request changes → DONE or back to IN_PROGRESS

At ANY stage, if Claude needs your input:
  → Labels cc:blocked, comments with specific question, moves on
  → You reply on the issue whenever you want
  → Next loop iteration picks it back up
```

### Priority Model (loop always pushes work toward completion)

```
Priority 1: UNBLOCKED  — human replied on a blocked ticket → resume immediately
Priority 2: IN_REVIEW  — finish reviews before starting new work
Priority 3: IN_PROGRESS — continue work already started
Priority 4: READY       — implement next ready ticket
Priority 5: REFINED     — tickets with specs but not yet approved
Priority 6: DRAFT       — refine rough ideas last
```

### Manual Overrides (you jump in when you want)

```bash
cc brainstorm "auth system"       # Start a collaborative session → draft tickets
cc refine 42                      # Jump into refining a specific ticket with Claude
cc implement 42                   # Tell Claude to implement right now
cc review 42                      # Trigger review of a specific ticket
cc adjust 42 "use JWT instead"    # Give direct feedback
cc improve                        # Ask Claude to scan for tech debt
cc status                         # See the board
cc loop                           # Start autonomous processing
cc loop --once                    # Process one ticket, then stop
cc loop --dry-run                 # Show what it would pick up
```

These aren't separate "modes" — they're just shortcuts to tell Claude "work on this now" instead of waiting for the loop to get to it.

---

## Ticket Lifecycle

### States (GitHub Issue Labels)

| Label            | Meaning                                                 |
| ---------------- | ------------------------------------------------------- |
| `cc:draft`       | Rough idea, needs refinement                            |
| `cc:refined`     | Has a spec in docs/, needs approval or can self-approve |
| `cc:ready`       | Approved for implementation                             |
| `cc:in-progress` | Being implemented, branch exists                        |
| `cc:in-review`   | PR open, awaiting review                                |
| `cc:done`        | Merged, complete                                        |
| `cc:blocked`     | Needs human input — question posted as comment          |

### Priority Labels

| Label            | Meaning          |
| ---------------- | ---------------- |
| `cc:p0-critical` | Do this first    |
| `cc:p1-high`     | Important        |
| `cc:p2-medium`   | Normal (default) |
| `cc:p3-low`      | Nice to have     |

### Dependency Labels

Issues can reference dependencies in their body:

```
Depends on: #38, #41
```

The loop won't pick up a ticket if its dependencies aren't `cc:done`.

---

## Artifact System

Every action Claude takes on a ticket produces a versioned document in git:

```
docs/issues/42/
├── meta.json
├── 001-draft.md              # Original idea
├── 002-refinement.md         # Expanded spec, acceptance criteria
├── 003-design.md             # Technical decisions, approach
├── 004-implementation.md     # What was built, key decisions during coding
├── 005-review.md             # Review findings, issues found
├── 006-adjustment.md         # Changes after feedback
└── ...                       # More iterations as needed
```

### meta.json

```json
{
  "issue": 42,
  "title": "Add user authentication",
  "status": "in-review",
  "priority": "p1-high",
  "branch": "cc/42-add-user-auth",
  "pr": 87,
  "dependencies": [38, 41],
  "artifacts": [
    { "file": "001-draft.md", "type": "draft", "created": "2026-04-11T10:00:00Z" },
    { "file": "002-refinement.md", "type": "refinement", "created": "2026-04-11T10:30:00Z" }
  ],
  "blocked": false,
  "blocked_question": null,
  "created": "2026-04-11T10:00:00Z",
  "updated": "2026-04-11T14:30:00Z"
}
```

### Vision Docs (from brainstorms)

```
docs/visions/
├── user-auth-system.md       # Vision doc from brainstorm
├── payment-integration.md
└── ...
```

Each vision doc links to the tickets it spawned.

---

## Blocking & Notification System

When Claude can't proceed, it does three things:

1. **Labels the issue** `cc:blocked`
2. **Comments with a structured question**:

   ```markdown
   🤖 **I need your input to continue.**

   **Context**: While refining the authentication ticket, I identified
   two viable approaches with different tradeoffs.

   **Question(s)**:

   - Should we support OAuth providers (Google, GitHub) or just
     email/password? OAuth adds ~2 tickets of work but better UX.
   - What session duration? 24h is standard, 7d is more convenient.

   **What happens next**: Reply here and I'll pick this back up
   automatically on my next loop.
   ```

3. **Updates meta.json** with `blocked: true` and the question
4. **Moves on** to the next ticket

### Unblocking

Each loop iteration checks blocked tickets for new comments from the human. If found:

- Reads the human's reply
- Removes `cc:blocked` label
- Adds the reply to context
- Ticket re-enters the priority queue at Priority 1 (highest)

---

## Repository Structure

```
claude-create/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE (MIT)
│
├── bin/
│   └── cc.ts                      # CLI entry point
│
├── src/
│   ├── commands/
│   │   ├── init.ts                # Scaffold into target project
│   │   ├── brainstorm.ts          # Interactive session → vision + tickets
│   │   ├── refine.ts              # Refine a specific ticket
│   │   ├── implement.ts           # Implement a specific ticket
│   │   ├── review.ts              # Review a specific ticket
│   │   ├── adjust.ts              # Apply feedback to a ticket
│   │   ├── improve.ts             # Scan for tech debt
│   │   ├── loop.ts                # Autonomous processing loop
│   │   └── status.ts              # Print ticket board
│   │
│   ├── github/
│   │   ├── client.ts              # Octokit wrapper
│   │   ├── issues.ts              # CRUD issues, labels
│   │   ├── prs.ts                 # Create/manage PRs
│   │   ├── comments.ts            # Post/read comments
│   │   └── labels.ts              # Ensure cc:* labels exist
│   │
│   ├── claude/
│   │   ├── runner.ts              # Spawn claude CLI with prompt + context
│   │   ├── prompts/
│   │   │   ├── refiner.md         # System prompt for refinement
│   │   │   ├── implementer.md     # System prompt for implementation
│   │   │   ├── reviewer.md        # System prompt for review
│   │   │   ├── adjuster.md        # System prompt for adjustments
│   │   │   └── improver.md        # System prompt for improvement scan
│   │   └── context.ts             # Gather docs + code for agent context
│   │
│   ├── artifacts/
│   │   ├── writer.ts              # Create numbered docs in docs/issues/<n>/
│   │   ├── reader.ts              # Read + summarize existing artifacts
│   │   └── meta.ts                # Read/write meta.json
│   │
│   ├── loop/
│   │   ├── scheduler.ts           # Priority-based ticket picker
│   │   ├── blocker.ts             # Detect blocks, post questions
│   │   ├── unblocker.ts           # Check for human replies
│   │   └── orchestrator.ts        # Main loop: pick → run → commit → repeat
│   │
│   ├── config/
│   │   ├── loader.ts              # Load .claude-create/config.yml
│   │   └── defaults.ts            # Default config values
│   │
│   └── utils/
│       ├── git.ts                 # Branch management, commits, push
│       ├── logger.ts              # Structured logging
│       └── slug.ts                # Issue title → branch name
│
├── templates/                     # Copied into target project by `cc init`
│   ├── .claude-create/
│   │   ├── config.yml
│   │   └── CLAUDE.md              # Instructions for Claude Code
│   └── docs/
│       ├── issues/.gitkeep
│       └── visions/.gitkeep
│
└── tests/
    ├── scheduler.test.ts
    ├── blocker.test.ts
    ├── artifacts.test.ts
    └── ...
```

---

## Integration With Any GitHub Project

```bash
# Install globally
npm install -g claude-create

# In any project
cd my-project
cc init
```

`cc init` does:

1. Creates `.claude-create/config.yml` (prompts for GitHub owner/repo or detects from git remote)
2. Creates `docs/issues/` and `docs/visions/` directories
3. Appends claude-create instructions to project's `CLAUDE.md` (or creates one)
4. Ensures `cc:*` labels exist on the GitHub repo
5. Adds `docs/` to `.gitignore` exclusions if needed

### config.yml

```yaml
github:
  owner: auto-detected
  repo: auto-detected
  token_env: GITHUB_TOKEN # env var name

branches:
  pattern: 'cc/{issue}-{slug}'
  base: main

loop:
  poll_interval: 300 # seconds between loop iterations
  max_concurrent: 1 # start conservative
  auto_approve_refinements: false # if true, skip REFINED → READY approval

notifications:
  on_blocked: github_comment
  # Future: slack_webhook, email

priorities:
  order:
    - unblocked
    - in-review
    - in-progress
    - ready
    - refined
    - draft
```

---

## Agent Prompt Design

Each agent prompt follows a consistent structure:

```markdown
# Role: [Refiner/Implementer/Reviewer/...]

## Your Task

[What you're doing]

## Context

[Injected: meta.json, all existing artifacts, relevant code files]

## Rules

- Always write your output as an artifact to docs/issues/<n>/
- If you need human input, output a BLOCKED marker with your questions
- Never modify files outside the ticket's scope
- Commit frequently with descriptive messages prefixed: [cc#<issue>]

## Output Format

[What the artifact doc should contain]

## Blocked Protocol

If you cannot proceed without human input, output:
BLOCKED: <your question(s)>
The orchestrator will detect this, post it to GitHub, and move on.
```

---

## The Loop in Detail

```
┌─────────────────────────────────────────┐
│              cc loop starts             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  1. Fetch all open issues with cc:*     │
│     labels from GitHub                  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  2. Check cc:blocked issues for new     │
│     human comments → unblock them       │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  3. Filter out:                         │
│     - cc:blocked (still waiting)        │
│     - cc:done                           │
│     - tickets with unmet dependencies   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  4. Sort by priority:                   │
│     unblocked > review > in-progress    │
│     > ready > refined > draft           │
│     Within same status: p0 > p1 > p2    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  5. Pick top ticket                     │
│     Determine action from status:       │
│     draft → refine                      │
│     refined → approve or implement      │
│     ready → implement                   │
│     in-progress → continue implementing │
│     in-review → review                  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  6. Gather context:                     │
│     - Read docs/issues/<n>/*            │
│     - Read meta.json                    │
│     - If unblocked: include human reply │
│     - Include relevant source files     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  7. Spawn claude CLI with:              │
│     - Agent role prompt                 │
│     - Gathered context                  │
│     - Working on correct git branch     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  8. Parse output:                       │
│     - BLOCKED? → label, comment, skip   │
│     - Success? → write artifact, update │
│       meta.json, advance status label,  │
│       commit + push                     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  9. Wait poll_interval, goto 1          │
│     (or exit if --once)                 │
└─────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 0 — Skeleton & GitHub Integration (3-4 days)

- [ ] Project scaffolding: package.json, tsconfig, bin/cc.ts
- [ ] `cc init` — detect git remote, create config + dirs
- [ ] GitHub client: issues CRUD, label management, comments
- [ ] Artifact writer: create `docs/issues/<n>/` + meta.json
- [ ] `cc status` — fetch issues, print board to terminal

### Phase 1 — Agent Runner & Manual Commands (4-5 days)

- [ ] Claude CLI runner: spawn `claude` with prompt + piped context
- [ ] Context gatherer: read artifacts, meta, relevant code
- [ ] BLOCKED detection: parse Claude output for block markers
- [ ] Write agent prompts: refiner, implementer, reviewer, adjuster, improver
- [ ] Git helpers: branch create/switch, commit, push
- [ ] `cc refine`, `cc implement`, `cc review`, `cc adjust` commands
- [ ] `cc brainstorm` — interactive, creates vision doc + draft tickets

### Phase 2 — Autonomous Loop (3-4 days)

- [ ] Scheduler: priority-based ticket picker with dependency checking
- [ ] Unblocker: scan blocked tickets for human replies
- [ ] Orchestrator: the main loop (pick → run → commit → repeat)
- [ ] `cc loop`, `--once`, `--dry-run` flags
- [ ] Proper logging and error recovery (agent crashes, git conflicts)

### Phase 3 — Polish for Open Source (3-4 days)

- [ ] Tests for scheduler, blocker, artifact system
- [ ] README with GIFs/screenshots
- [ ] `cc improve` command
- [ ] Edge cases: merge conflicts, stale branches, concurrent tickets
- [ ] config validation, helpful error messages
- [ ] npm publish setup

### Future

- [ ] Slack notifications
- [ ] Web dashboard
- [ ] Migrate to Agent SDK
- [ ] Multi-agent concurrency (parallel branches)
- [ ] Plugin system for custom agent roles
- [ ] GitHub Actions integration (run loop in CI)

> **Note on existing plugins:** [superpowers](https://github.com/obra/superpowers) and [impeccable](https://github.com/pbakaus/impeccable) are complementary plugins that enhance dev workflow quality and frontend design quality respectively. Decision: **compose at runtime** — no dependencies or code sharing. claude-create handles orchestration (what/when), they handle quality (how). See v3 plan for full details.
