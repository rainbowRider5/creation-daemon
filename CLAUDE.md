# creation-daemon

Orchestration layer on top of Claude Code that turns a single developer into a team.

## Stack

TypeScript ESM, Node.js 20+, Commander CLI, Vitest, ESLint 9, Prettier, Lefthook.

## TDD workflow

1. Write a failing test in `tests/` first — file mirrors `src/` structure (e.g. `src/utils/slug.ts` -> `tests/slug.test.ts`)
2. Run `npm run test` — confirm it fails
3. Implement the minimum code to pass
4. Run `npm run test` — confirm it passes
5. Refactor if needed, tests must stay green

### Test conventions

- Write tests from the user's perspective, not implementation details
- Structure: `describe('functionName', () => { describe('when X', () => { it('does Y') }) })`
- Use `vi.mock()` for mocking dependencies — no dependency injection wiring
- Arrange-Act-Assert pattern within each `it()` block

## Code conventions

### TypeScript

- Strict TypeScript — no `any`, no `as` type assertions unless unavoidable
- Use `type` for all type definitions (not `interface`)
- Use string unions for named constants (`type Status = 'active' | 'inactive'`), not enums
- Let TypeScript infer return types — do not annotate explicitly
- Use `import type` for type-only imports
- Use `null` for intentional absence, `undefined` for unset/optional
- Mark properties `readonly` only when mutation would be a bug — not by default

### Naming

- Files: `kebab-case.ts` (e.g. `config-loader.ts`)
- Functions and variables: `camelCase`
- Types: `PascalCase`
- Module-level constants: `UPPER_SNAKE_CASE`
- Booleans: prefix with `is`/`has`/`should`/`can` when the name would be ambiguous

### Functions and style

- Use `function` declarations at module level (hoisted, named stack traces). Arrow functions for callbacks only.
- Use guard clauses and early returns aggressively — validate preconditions at the top, keep the happy path unindented
- Named exports only — never use default exports
- No barrel files (index.ts re-exports) — import directly from the source file
- Group related functions and types in one file — don't split into one-export-per-file unnecessarily
- Single quotes, trailing commas, semicolons (enforced by Prettier)

### Error handling

- Use try/catch and throw for all error paths
- Custom error classes extending `Error` for domain-specific errors

### Comments

- Comment the "why", never the "what" — if code needs a "what" comment, refactor it instead
- No JSDoc unless the function signature is genuinely non-obvious

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
templates/    # Template files for cd init
bin/          # CLI entry point
```

## Guardrails

- Never add new dependencies without asking the user first
- Run `npm run lint:fix` before finishing any task
- Run `npm run test` after every implementation change
- Do not modify `.github/` or CI config files without asking
