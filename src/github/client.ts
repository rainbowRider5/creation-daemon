import { Octokit } from '@octokit/rest';
import { loadConfig } from '../config/loader.js';

let _octokit: Octokit | null = null;

export function getOctokit(): Octokit {
  if (_octokit) return _octokit;

  const config = loadConfig();
  const token = process.env[config.github.token_env];
  if (!token) {
    throw new Error(
      `GitHub token not found. Set the ${config.github.token_env} environment variable.`,
    );
  }

  _octokit = new Octokit({ auth: token });
  return _octokit;
}

export function getRepoParams(): { owner: string; repo: string } {
  const config = loadConfig();
  return { owner: config.github.owner, repo: config.github.repo };
}
