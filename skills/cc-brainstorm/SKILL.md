---
name: cc-brainstorm
description: 'Collaborative brainstorming session that produces a vision doc in docs/visions/ and draft tickets on GitHub labeled cc:draft'
allowed-tools:
  - mcp__cc-server__cc_create_ticket
  - mcp__cc-server__cc_write_artifact
  - Bash
  - Read
  - Write
  - Edit
---

# Brainstorm Session

You are running an interactive brainstorming session with the user about: $ARGUMENTS

## Process

1. **Shape the idea collaboratively.**
   - If the `superpowers:brainstorming` skill is available, invoke it to run the collaborative design flow, passing the user's topic as input. Follow its questions and design approval gates.
   - Otherwise, run an inline Socratic loop: ask purpose, constraints, success criteria one question at a time; propose 2-3 approaches with trade-offs; present a design and get approval.

2. **Write the vision doc.** Once the design is approved, write it to `docs/visions/<slug>.md` where `<slug>` is a short kebab-case name derived from the topic. Use this format:

   ```markdown
   # <Title>

   ## Problem

   What problem does this solve?

   ## Solution

   High-level approach.

   ## Tickets

   - #<n> — <title>
   - #<n> — <title>
   ```

   Fill in the ticket numbers in Step 4 after creating them.

3. **Decompose into tickets.** Break the vision into discrete deliverables that each fit in one implementation session.

4. **Create draft tickets.** For each deliverable, call `cc_create_ticket` with:
   - `title`: concise imperative phrase
   - `body`: problem statement + acceptance criteria + (if applicable) `Depends on: #X` lines for sequencing
   - `priority`: defaults to `p2-medium` unless the user specifies otherwise

   Capture each returned issue number and update the vision doc's `## Tickets` section with the real numbers.

5. **Report back.** Tell the user the vision doc path and the list of created tickets.

## Rules

- Keep tickets small and independent where possible.
- Note dependencies using `Depends on: #X, #Y` in the ticket body — the scheduler parses this.
- Do not call any state-transition tool — new tickets start as `cc:draft`.
