# Phase 1 End-to-End Testing Instructions

A procedural walkthrough for running the Phase 1 E2E verification against a disposable GitHub repo. The checklist to tick off as you go lives at `docs/superpowers/checklists/phase1-e2e.md`.

## Step 1 — Cut a release tag on main

The plugin install needs a tag whose tree contains compiled `dist/`. Run locally on `main`:

```bash
git checkout main
git pull
npm ci                       # clean install to match what users see
npm run release              # npm version patch → version hook (build + stage dist) → tag → push --follow-tags
```

Verify the tag contains `dist/`:

```bash
git ls-tree -r v0.1.1 --name-only | grep dist/src/server.js
# expected: dist/src/server.js
```

If that line is missing, the release workflow is broken — do not proceed.

### Known issue with the release flow

The `npm run release` script force-stages `dist/` inside npm's `version` lifecycle hook. The repo's `lefthook.yml` has `lint` and `format` commands that run `git add {staged_files}` after linting/formatting, which fails on `dist/*` files (they're gitignored; `git add` without `-f` refuses them). An `exclude: 'dist/'` filter was added to both commands, but locally-installed `lefthook` v2.1.4 (from the asdf Ruby gem) doesn't appear to honor it. Workarounds tried so far:

- Updating the `exclude` key to list and single-string form — both silently accepted but not applied.
- Using a custom `staged_files_command` — not a real lefthook key; silently dropped.

If you hit the failure, options to unblock the release:

1. Install lefthook v2.1.5+ globally (`brew install lefthook`) so the git hook uses a version that honors `exclude`.
2. Temporarily bypass hooks for the release commit: export `LEFTHOOK=0` before running `npm run release`.
3. Split the release into two commits: the version bump (hooks pass), then a second commit that force-adds `dist/` with `git commit --no-verify` (note: this diverges from the version tag).

Revisit this once the lefthook filtering issue is resolved upstream or in-repo.

## Step 2 — Prepare a scratch test repo

```bash
gh repo create <your-username>/creation-daemon-phase1-e2e --public --clone --add-readme
cd creation-daemon-phase1-e2e
```

Export your token **in the shell that will launch Claude Code** (the MCP server reads it from env):

```bash
export GITHUB_TOKEN="$(gh auth token)"   # or paste a PAT with `repo` scope
```

## Step 3 — Install the plugin inside Claude Code

```bash
claude                       # launch Claude Code in the scratch repo
```

Inside the Claude Code session:

```
/plugin install github:rainbowRider5/creation-daemon@v0.1.1
```

Restart Claude Code when prompted. Confirm:

```
/mcp
```

Expected: `cd-server` listed as connected with **11 tools**. If not connected:

- Check `GITHUB_TOKEN` is exported in the shell you launched `claude` from.
- Check `dist/src/server.js` exists in the tag (Step 1 check).

## Step 4 — Walk the lifecycle checklist

Work through `docs/superpowers/checklists/phase1-e2e.md` in order.

| # | Command in Claude Code | What to verify |
|---|---|---|
| 1 | `/cd-init` | 11 `cd:*` labels on GitHub, `docs/issues/` + `docs/visions/` exist, `CLAUDE.md` has the "Working with creation-daemon" section |
| 2 | `/cd-init` (again) | Reports "already configured"; `CLAUDE.md` not duplicated; no extra labels |
| 3 | `/cd-brainstorm "a simple CLI tool"` | `docs/visions/<slug>.md` created; ≥2 draft issues on GitHub |
| 4 | `/cd-refine <n>` | `docs/issues/<n>/002-refinement.md` appears; label flips `draft → refined` |
| 5 | `/cd-loop` | Picks a refined ticket with no Open Questions and advances it to `ready` (or blocks if there are open questions) |
| 6 | `/cd-implement <n>` | Branch `cd/<n>-<slug>` created; commits prefixed `[cd#<n>]`; PR opened; label → `in-review` |
| 7a | `/cd-review <n>` (approve path) | Review artifact written; `gh pr review --approve` posted; skill instructs re-run after merge |
| 7b | Merge the PR manually (`gh pr merge`), then `/cd-review <n>` again | Skill detects `MERGED` state and transitions ticket to `cd:done` |
| 8 | `/cd-review <n>` (request-changes path — fresh ticket) | Ticket transitions back to `cd:in-progress` |
| 9 | `/cd-adjust <n> "tighten the error message"` | Skill discovers the branch via `git branch --list`, commits `[cd#<n>] adjust:`, pushes, writes adjustment artifact |
| 10 | `/cd-improve` | Scans scratch repo, creates ≥1 draft ticket |
| 11 | `/cd-status` | Renders tickets grouped by state in priority order |
| 12 | Block + reply path: from a ticket's issue, run `cd_block_ticket` via `/cd-refine` on a vague ticket, then reply to the resulting GitHub comment as a human, then `/cd-loop` | `cd_unblock_check` picks up the reply and restores the ticket to its previous state |

## Step 5 — Capture evidence

For each of the 14 lines in `docs/superpowers/checklists/phase1-e2e.md`, save either a screenshot or the relevant command output (issue page, `gh pr view`, `git log --oneline`). The checklist itself requires: *"Capture a screenshot or command output for each line before declaring Phase 1 done."*

## Things to watch for

- **Token scope.** If the MCP server returns 403s, your `GITHUB_TOKEN` likely doesn't have `repo` scope — not `public_repo`.
- **`CLAUDE_PLUGIN_ROOT` expansion in `/cd-init` step 3.** The skill resolves it via `echo "$CLAUDE_PLUGIN_ROOT"` first. If Read ever gets a literal `${CLAUDE_PLUGIN_ROOT}/…` path in the logs, the skill drifted — file an issue.
- **cd-review finalization.** Intentionally two-step: approve → (you merge) → re-run `/cd-review <n>` to transition to `done`. If you auto-merge via `gh pr merge --auto`, the second `/cd-review` will still work because step 3 of the skill checks merge state upfront.
- **Release script failure modes.** `npm version patch` refuses to run with a dirty working tree — clean up before releasing. See "Known issue with the release flow" above for the lefthook interaction.

## When to declare Phase 1 done

All 14 checklist items passing with captured evidence, including both cd-review paths (approve + request-changes) and the block/reply round trip. If any item fails, open a ticket with `/cd-improve` or file it manually on creation-daemon itself.
