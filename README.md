# claude-create

Orchestration layer on top of Claude Code that turns a single developer into a team.

Tickets live on GitHub. Artifacts live in `docs/issues/<n>/`. Nine `/cc-*` slash commands drive the lifecycle. The autonomous loop pattern lets you fire-and-forget once tickets are refined.

## Prerequisites

- Claude Code with plugin-install-from-git support
- Node.js 20+
- `gh` CLI authenticated
- `GITHUB_TOKEN` in the shell environment (scope: `repo`)

## Install

```bash
# From inside any project with a GitHub remote, launch Claude Code:
claude
```

Then inside the session:

```
/plugin install github:rainbowRider5/claude-create@v0.1.0
# restart or reload Claude Code
/cc-init
```

`/cc-init` creates the `cc:*` labels on your repo, sets up `docs/issues/` and `docs/visions/`, and appends a short section to your project's `CLAUDE.md`.

## Commands

| Command                 | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `/cc-init`              | One-shot setup: labels, dirs, CLAUDE.md           |
| `/cc-brainstorm <idea>` | Vision doc + draft tickets from a fuzzy idea      |
| `/cc-refine <n>`        | Draft → refined spec                              |
| `/cc-implement <n>`     | Ready → branch, code, PR, in-review               |
| `/cc-review <n>`        | Review the PR → approve or request changes        |
| `/cc-adjust <n> "note"` | Apply a delta to an in-progress branch            |
| `/cc-improve`           | Scan codebase → tech-debt draft tickets           |
| `/cc-status`            | Board view                                        |
| `/cc-loop`              | One autonomous iteration: unblock, pick, dispatch |

## Works well with

- [superpowers](https://github.com/obra/superpowers) — TDD, debugging, code review rigor. `cc-*` skills delegate process work to `superpowers:*` when installed.
- [impeccable](https://github.com/pbakaus/impeccable) — frontend design quality for UI tickets.

## Uninstall

```bash
/plugin uninstall claude-create
```

Your `docs/issues/` content and GitHub labels stay — remove them manually if you want a clean sweep.

## Development

This repo IS the plugin. `src/` is the MCP server source; `dist/` ships committed only on release tags. See `docs/superpowers/specs/` for design specs and `docs/superpowers/plans/` for implementation plans.
