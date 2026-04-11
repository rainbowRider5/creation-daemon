# creation-daemon instructions

This project uses creation-daemon for automated ticket management and implementation.

## Conventions

- Commit messages for automated work are prefixed with `[cc#<issue>]`
- Branches follow the pattern `cc/<issue>-<slug>`
- Artifacts are stored in `docs/issues/<issue>/`
- Vision documents are stored in `docs/visions/`

## Workflow

- Tickets are managed via GitHub Issues with `cd:*` labels
- Claude agents handle refinement, implementation, review, and adjustments
- If blocked, the agent posts a question on the issue — reply there to unblock
