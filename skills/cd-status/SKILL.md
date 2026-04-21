---
name: cd-status
description: 'Show the current cd:* ticket board, grouped by state in priority order'
allowed-tools:
  - mcp__cd-server__cd_get_status
---

# Status Board

Show the current state of all cd:\* tickets.

## Process

1. Call `cd_get_status` with no arguments.
2. Return the tool's formatted output as-is. The server already groups and orders tickets.

## Rules

- Do not call any other tool.
- Do not re-format the server output beyond trivial presentation.
