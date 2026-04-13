import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateTransition, getStateFromLabels, labelForState } from './tickets/state-machine.js';
import type { Priority } from './tickets/state-machine.js';
import { sortByPriority, filterActionable, parseDependencies } from './tickets/priority.js';
import { writeArtifact, readArtifacts, readMeta, writeMeta } from './artifacts/artifact-store.js';
import type { ArtifactType } from './artifacts/artifact-store.js';
import {
  createIssue,
  getIssue,
  listIssuesByLabel,
  updateLabels,
  ensureLabels,
  postComment,
  getCommentsSince,
} from './github.js';

export function registerTools(server: McpServer) {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_create_ticket',
    'Create a GitHub issue with cd:draft label',
    {
      title: z.string().describe('Issue title'),
      body: z.string().describe('Issue body (markdown)'),
      priority: z
        .enum(['p0-critical', 'p1-high', 'p2-medium', 'p3-low'])
        .default('p2-medium')
        .describe('Priority level'),
    },
    async ({ title, body, priority }) => {
      const labels = ['cd:draft', `cd:${priority}`];
      const result = await createIssue(title, body, labels);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Created ticket #${String(result.number)}: ${result.url}`,
          },
        ],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_list_tickets',
    'List all cd:* issues with their state and priority',
    {
      state: z
        .enum(['draft', 'refined', 'ready', 'in-progress', 'in-review', 'done', 'blocked'])
        .optional()
        .describe('Filter by state'),
    },
    async ({ state }) => {
      const issues = await listIssuesByLabel('cd:');
      const tickets = issues
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          state: getStateFromLabels(issue.labels),
          labels: issue.labels,
        }))
        .filter((t) => t.state !== null)
        .filter((t) => !state || t.state === state);

      const text = tickets
        .map((t) => `#${String(t.number)} [${String(t.state)}] ${t.title}`)
        .join('\n');

      return {
        content: [{ type: 'text' as const, text: text || 'No tickets found.' }],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_get_ticket',
    'Get full ticket context: issue details, artifacts, and meta',
    {
      issue_number: z.number().describe('GitHub issue number'),
    },
    async ({ issue_number }) => {
      const issue = await getIssue(issue_number);
      const meta = readMeta(issue_number);
      const artifacts = readArtifacts(issue_number);

      const parts = [
        `# Ticket #${String(issue_number)}: ${issue.title}`,
        '',
        `**State:** ${getStateFromLabels(issue.labels) ?? 'unknown'}`,
        `**Labels:** ${issue.labels.join(', ')}`,
        '',
        '## Description',
        issue.body,
      ];

      if (meta) {
        parts.push('', '## Meta', JSON.stringify(meta, null, 2));
      }

      if (artifacts.length > 0) {
        parts.push('', '## Artifacts');
        for (const a of artifacts) {
          parts.push('', `### ${a.file}`, a.content);
        }
      }

      return {
        content: [{ type: 'text' as const, text: parts.join('\n') }],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_transition_state',
    'Move a ticket to a new state (validates allowed transitions)',
    {
      issue_number: z.number().describe('GitHub issue number'),
      new_state: z
        .enum(['draft', 'refined', 'ready', 'in-progress', 'in-review', 'done', 'blocked'])
        .describe('Target state'),
    },
    async ({ issue_number, new_state }) => {
      const issue = await getIssue(issue_number);
      const currentState = getStateFromLabels(issue.labels);

      if (!currentState) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Issue #${String(issue_number)} has no cd:* state label.`,
            },
          ],
          isError: true,
        };
      }

      const meta = readMeta(issue_number);
      const previousState = meta?.previousState ?? undefined;
      const result = validateTransition(currentState, new_state, previousState);

      if (!result.valid) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.reason}` }],
          isError: true,
        };
      }

      await updateLabels(issue_number, [labelForState(new_state)], [labelForState(currentState)]);

      if (meta) {
        meta.state = new_state;
        meta.updated = new Date().toISOString();
        writeMeta(issue_number, meta);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Transitioned #${String(issue_number)} from ${currentState} to ${new_state}`,
          },
        ],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_pick_next_ticket',
    'Returns the highest-priority actionable ticket',
    {},
    async () => {
      const issues = await listIssuesByLabel('cd:');
      const allTickets = issues
        .map((issue) => {
          const state = getStateFromLabels(issue.labels);
          if (!state) return null;

          const priorityLabel = issue.labels.find((l) => l.startsWith('cd:p'));
          const priority = priorityLabel
            ? (priorityLabel.slice(3) as Priority)
            : ('p2-medium' as Priority);

          return {
            number: issue.number,
            title: issue.title,
            state,
            priority,
            body: issue.body,
            labels: issue.labels,
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

      const doneIssues = new Set(allTickets.filter((t) => t.state === 'done').map((t) => t.number));

      const actionable = filterActionable(allTickets, doneIssues);
      const sorted = sortByPriority(actionable);

      if (sorted.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No actionable tickets found.' }],
        };
      }

      const next = sorted[0];
      return {
        content: [
          {
            type: 'text' as const,
            text: [
              `Next ticket: #${String(next.number)} — ${next.title}`,
              `State: ${next.state}`,
              `Priority: ${next.priority}`,
              `Body: ${next.body}`,
            ].join('\n'),
          },
        ],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_write_artifact',
    'Write a numbered artifact to docs/issues/<n>/',
    {
      issue_number: z.number().describe('GitHub issue number'),
      type: z
        .enum(['draft', 'refinement', 'design', 'implementation', 'review', 'adjustment'])
        .describe('Artifact type'),
      content: z.string().describe('Artifact content (markdown)'),
    },
    async ({ issue_number, type, content }) => {
      let meta = readMeta(issue_number);
      if (!meta) {
        const issue = await getIssue(issue_number);
        const state = getStateFromLabels(issue.labels) ?? 'draft';
        const priorityLabel = issue.labels.find((l) => l.startsWith('cd:p'));
        const priority = priorityLabel
          ? (priorityLabel.slice(3) as Priority)
          : ('p2-medium' as Priority);

        meta = {
          issue: issue_number,
          title: issue.title,
          state: state,
          priority,
          branch: null,
          pr: null,
          dependencies: parseDependencies(issue.body),
          artifacts: [],
          blocked: false,
          blockedQuestion: null,
          previousState: null,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
        writeMeta(issue_number, meta);
      }

      const path = writeArtifact(issue_number, type as ArtifactType, content);
      return {
        content: [{ type: 'text' as const, text: `Artifact written: ${path}` }],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_read_artifacts',
    'Read all artifacts for a ticket',
    {
      issue_number: z.number().describe('GitHub issue number'),
    },
    ({ issue_number }) => {
      const artifacts = readArtifacts(issue_number);

      if (artifacts.length === 0) {
        return Promise.resolve({
          content: [
            { type: 'text' as const, text: `No artifacts found for #${String(issue_number)}.` },
          ],
        });
      }

      const text = artifacts.map((a) => `## ${a.file}\n\n${a.content}`).join('\n\n---\n\n');

      return Promise.resolve({
        content: [{ type: 'text' as const, text }],
      });
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_block_ticket',
    'Mark a ticket as blocked and post a question to GitHub',
    {
      issue_number: z.number().describe('GitHub issue number'),
      question: z.string().describe('Question for the human'),
    },
    async ({ issue_number, question }) => {
      const issue = await getIssue(issue_number);
      const currentState = getStateFromLabels(issue.labels);

      if (!currentState || currentState === 'done') {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Cannot block ticket in state: ${String(currentState)}`,
            },
          ],
          isError: true,
        };
      }

      await updateLabels(issue_number, [labelForState('blocked')], [labelForState(currentState)]);

      const comment = [
        '**I need your input to continue.**',
        '',
        question,
        '',
        "*Reply here and I'll pick this back up automatically on my next loop.*",
      ].join('\n');

      await postComment(issue_number, comment);

      let meta = readMeta(issue_number);
      if (!meta) {
        const priorityLabel = issue.labels.find((l) => l.startsWith('cd:p'));
        const priority = priorityLabel
          ? (priorityLabel.slice(3) as Priority)
          : ('p2-medium' as Priority);

        meta = {
          issue: issue_number,
          title: issue.title,
          state: 'blocked',
          priority,
          branch: null,
          pr: null,
          dependencies: parseDependencies(issue.body),
          artifacts: [],
          blocked: true,
          blockedQuestion: question,
          previousState: currentState,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
      } else {
        meta.blocked = true;
        meta.blockedQuestion = question;
        meta.previousState = currentState;
        meta.state = 'blocked';
      }
      writeMeta(issue_number, meta);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Blocked #${String(issue_number)}. Question posted to GitHub. Previous state: ${currentState}`,
          },
        ],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool(
    'cd_unblock_check',
    'Scan blocked tickets for human replies and unblock them',
    {},
    async () => {
      const issues = await listIssuesByLabel('cd:');
      const blockedTickets = issues.filter((issue) => issue.labels.includes('cd:blocked'));

      if (blockedTickets.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No blocked tickets.' }],
        };
      }

      const unblocked: string[] = [];

      for (const issue of blockedTickets) {
        const meta = readMeta(issue.number);
        if (!meta?.previousState) continue;

        const since = meta.updated;
        const comments = await getCommentsSince(issue.number, since);

        if (comments.length > 0) {
          await updateLabels(
            issue.number,
            [labelForState(meta.previousState)],
            [labelForState('blocked')],
          );

          const restoredState = meta.previousState;
          meta.blocked = false;
          meta.blockedQuestion = null;
          meta.state = restoredState;
          meta.previousState = null;
          writeMeta(issue.number, meta);

          unblocked.push(
            `#${String(issue.number)} → ${restoredState} (reply from ${comments[0].user})`,
          );
        }
      }

      const text =
        unblocked.length > 0
          ? `Unblocked ${String(unblocked.length)} ticket(s):\n${unblocked.join('\n')}`
          : 'No blocked tickets have new replies.';

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool('cd_get_status', 'Show the current ticket board', {}, async () => {
    const issues = await listIssuesByLabel('cd:');

    const groups = new Map<string, string[]>();
    for (const issue of issues) {
      const state = getStateFromLabels(issue.labels) ?? 'unknown';
      const existing = groups.get(state) ?? [];
      existing.push(`  #${String(issue.number)} ${issue.title}`);
      groups.set(state, existing);
    }

    const order = ['blocked', 'in-review', 'in-progress', 'ready', 'refined', 'draft', 'done'];

    const sections = order
      .filter((s) => (groups.get(s)?.length ?? 0) > 0)
      .map((s) => `**${s.toUpperCase()}**\n${(groups.get(s) ?? []).join('\n')}`)
      .join('\n\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: sections || 'No tickets found.',
        },
      ],
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server.tool('cd_ensure_labels', 'Create cd:* labels on the repo if missing', {}, async () => {
    const result = await ensureLabels();
    return {
      content: [
        {
          type: 'text' as const,
          text: `Labels: ${String(result.created)} created, ${String(result.existing)} already existed.`,
        },
      ],
    };
  });
}
