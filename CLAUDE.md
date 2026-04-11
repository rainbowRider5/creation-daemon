# creation-daemon

Orchestration layer on top of Claude Code that turns a single developer into a team.

## Stack

TypeScript ESM, Node.js 20+, Commander CLI, Vitest, ESLint 9, Prettier, Lefthook.

## Commands

```bash
npm run build        # tsc
npm run lint         # eslint .
npm run lint:fix     # eslint . --fix
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
npm run format       # prettier --write .
npm run format:check # prettier --check .
```

## TDD workflow

1. Write a failing test in `tests/` first — file mirrors `src/` structure (e.g. `src/utils/slug.ts` -> `tests/slug.test.ts`)
2. Run `npm run test` — confirm it fails
3. Implement the minimum code to pass
4. Run `npm run test` — confirm it passes
5. Refactor if needed, tests must stay green

## Code conventions

- ESM imports with `.js` extensions (TypeScript compiles to JS)
- Strict TypeScript — no `any`, no `as` type assertions unless unavoidable
- Use `import type` for type-only imports
- Single quotes, trailing commas, semicolons (enforced by Prettier)
- Functions and variables: camelCase. Types and interfaces: PascalCase

## Architecture

```
src/
  commands/   # CLI command handlers (commander)
  github/     # GitHub API via octokit
  claude/     # Claude Code process runner
  artifacts/  # Read/write docs/issues/ artifacts
  loop/       # Autonomous loop orchestration
  config/     # Config loading and defaults
  utils/      # Shared utilities
tests/        # Vitest test files
templates/    # Template files for /cd-init
bin/          # CLI entry point
```

## Guardrails

- Never use `--no-verify` or `--no-gpg-sign` when committing
- Never add new dependencies without asking the user first
- Run `npm run lint:fix` before finishing any task
- Run `npm run test` after every implementation change
- Do not modify `.github/` or CI config files without asking
