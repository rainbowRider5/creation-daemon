## Working with claude-create

This project uses claude-create for ticket-driven development.

- Tickets are GitHub issues labeled `cc:*` (state + priority)
- Artifacts live in `docs/issues/<n>/` (drafts, refinements, reviews)
- Visions live in `docs/visions/<slug>.md`

### Commands

- `/cc-brainstorm <idea>` — shape an idea into a vision + draft tickets
- `/cc-refine <n>` — turn a draft into an approved spec
- `/cc-implement <n>` — implement a ready ticket on a branch
- `/cc-review <n>` — review the PR for a ticket
- `/cc-adjust <n> "feedback"` — apply a change to an in-progress branch
- `/cc-improve` — scan the codebase and create tech-debt tickets
- `/cc-status` — show the current board
- `/cc-loop` — process the next actionable ticket

### Conventions

- Commits on ticket branches are prefixed `[cc#<n>]`
- Branch names follow `cc/<n>-<slug>`
- Priority defaults to `cc:p2-medium`
- The idempotency marker for `/cc-init` is the `## Working with claude-create` heading — do not rename it.
