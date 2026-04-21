## Working with creation-daemon

This project uses creation-daemon for ticket-driven development.

- Tickets are GitHub issues labeled `cd:*` (state + priority)
- Artifacts live in `docs/issues/<n>/` (drafts, refinements, reviews)
- Visions live in `docs/visions/<slug>.md`

### Commands

- `/cd-brainstorm <idea>` — shape an idea into a vision + draft tickets
- `/cd-refine <n>` — turn a draft into an approved spec
- `/cd-implement <n>` — implement a ready ticket on a branch
- `/cd-review <n>` — review the PR for a ticket
- `/cd-adjust <n> "feedback"` — apply a change to an in-progress branch
- `/cd-improve` — scan the codebase and create tech-debt tickets
- `/cd-status` — show the current board
- `/cd-loop` — process the next actionable ticket

### Conventions

- Commits on ticket branches are prefixed `[cc#<n>]`
- Branch names follow `cc/<n>-<slug>`
- Priority defaults to `cd:p2-medium`
- The idempotency marker for `/cd-init` is the `## Working with creation-daemon` heading — do not rename it.
