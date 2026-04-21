---
name: cc-status
description: 'Show the current cc:* ticket board, grouped by state in priority order'
allowed-tools:
  - mcp__cc-server__cc_get_status
---

# Status Board

Show the current state of all cc:\* tickets.

## Process

1. Call `cc_get_status` with no arguments.
2. Return the tool's formatted output as-is. The server already groups and orders tickets.

## Rules

- Do not call any other tool.
- Do not re-format the server output beyond trivial presentation.
