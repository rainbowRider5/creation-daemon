import chalk from 'chalk';

export const log = {
  info(msg: string): void {
    console.log(chalk.blue('ℹ'), msg);
  },
  success(msg: string): void {
    console.log(chalk.green('✓'), msg);
  },
  warn(msg: string): void {
    console.log(chalk.yellow('⚠'), msg);
  },
  error(msg: string): void {
    console.error(chalk.red('✗'), msg);
  },
  step(msg: string): void {
    console.log(chalk.dim('→'), msg);
  },
};
