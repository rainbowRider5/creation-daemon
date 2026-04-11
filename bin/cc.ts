#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { brainstormCommand } from '../src/commands/brainstorm.js';
import { refineCommand } from '../src/commands/refine.js';
import { implementCommand } from '../src/commands/implement.js';
import { reviewCommand } from '../src/commands/review.js';
import { adjustCommand } from '../src/commands/adjust.js';
import { improveCommand } from '../src/commands/improve.js';
import { loopCommand } from '../src/commands/loop.js';
import { statusCommand } from '../src/commands/status.js';

const program = new Command();

program
  .name('cc')
  .description('claude-create — orchestration layer that turns a single developer into a team')
  .version('0.1.0');

program
  .command('init')
  .description('Scaffold claude-create into the current project')
  .action(initCommand);

program
  .command('brainstorm [topic]')
  .description('Start a collaborative session → vision doc + draft tickets')
  .action(brainstormCommand);

program
  .command('refine <issue>')
  .description('Refine a specific ticket with Claude')
  .action(refineCommand);

program
  .command('implement <issue>')
  .description('Implement a specific ticket')
  .action(implementCommand);

program
  .command('review <issue>')
  .description("Review a specific ticket's PR")
  .action(reviewCommand);

program
  .command('adjust <issue>')
  .description('Apply feedback to a ticket')
  .argument('[feedback]', 'feedback to apply')
  .action(adjustCommand);

program
  .command('improve')
  .description('Scan for tech debt and improvement opportunities')
  .action(improveCommand);

program
  .command('loop')
  .description('Start autonomous processing loop')
  .option('--once', 'Process one ticket, then stop')
  .option('--dry-run', 'Show what would be picked up without acting')
  .action(loopCommand);

program.command('status').description('Print the ticket board').action(statusCommand);

program.parse();
