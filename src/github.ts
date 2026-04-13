import { Octokit } from '@octokit/rest';
import { execSync } from 'node:child_process';
import { getRemoteUrl, parseGitHubRemote } from './utils/git.js';

export const CC_LABELS: Record<string, { color: string; description: string }> = {
  'cc:draft': { color: 'e0e0e0', description: 'Rough idea, needs refinement' },
  'cc:refined': { color: 'c5def5', description: 'Has a spec, needs approval' },
  'cc:ready': { color: '0e8a16', description: 'Approved for implementation' },
  'cc:in-progress': { color: 'fbca04', description: 'Being implemented, branch exists' },
  'cc:in-review': { color: '1d76db', description: 'PR open, awaiting review' },
  'cc:done': { color: '0e8a16', description: 'Merged, complete' },
  'cc:blocked': { color: 'd93f0b', description: 'Needs human input' },
  'cc:p0-critical': { color: 'b60205', description: 'Do this first' },
  'cc:p1-high': { color: 'd93f0b', description: 'Important' },
  'cc:p2-medium': { color: 'fbca04', description: 'Normal (default)' },
  'cc:p3-low': { color: 'c2e0c6', description: 'Nice to have' },
};

let _octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (_octokit) return _octokit;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  _octokit = new Octokit({ auth: token });
  return _octokit;
}

export function getRepoContext(): { owner: string; repo: string } {
  const url = getRemoteUrl();
  if (!url) throw new Error('No git remote found. Are you in a git repository?');

  const parsed = parseGitHubRemote(url);
  if (!parsed) throw new Error(`Not a GitHub remote: ${url}`);

  return parsed;
}

export async function createIssue(title: string, body: string, labels: string[]) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });

  return { number: data.number, url: data.html_url };
}

export async function getIssue(issueNumber: number) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return {
    number: data.number,
    title: data.title,
    body: data.body ?? '',
    labels: data.labels.map((l) => (typeof l === 'string' ? l : (l.name ?? ''))),
    state: data.state,
  };
}

export async function listIssuesByLabel(labelPrefix = 'cc:') {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });

  return data
    .filter((issue) => {
      const labels = issue.labels.map((l) => (typeof l === 'string' ? l : (l.name ?? '')));
      return labels.some((l) => l.startsWith(labelPrefix));
    })
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      labels: issue.labels.map((l) => (typeof l === 'string' ? l : (l.name ?? ''))),
    }));
}

export async function updateLabels(issueNumber: number, add: string[], remove: string[]) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  for (const label of remove) {
    try {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch {
      // label may not exist on issue — ignore
    }
  }

  if (add.length > 0) {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: add,
    });
  }
}

export async function ensureLabels() {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data: existing } = await octokit.issues.listLabelsForRepo({
    owner,
    repo,
    per_page: 100,
  });
  const existingNames = new Set(existing.map((l) => l.name));

  let created = 0;
  for (const [name, config] of Object.entries(CC_LABELS)) {
    if (!existingNames.has(name)) {
      await octokit.issues.createLabel({
        owner,
        repo,
        name,
        color: config.color,
        description: config.description,
      });
      created++;
    }
  }

  return { created, existing: Object.keys(CC_LABELS).length - created };
}

export async function postComment(issueNumber: number, body: string) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });

  return { id: data.id, url: data.html_url };
}

export async function getCommentsSince(issueNumber: number, since: string) {
  const { owner, repo } = getRepoContext();
  const octokit = getOctokit();

  const { data } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    since,
  });

  return data
    .filter((c) => !c.user?.login.includes('[bot]'))
    .map((c) => ({
      id: c.id,
      body: c.body ?? '',
      user: c.user?.login ?? 'unknown',
      created: c.created_at,
    }));
}

export function createPR(branch: string, title: string, body: string) {
  const result = execSync(`gh pr create --head "${branch}" --title "${title}" --body "${body}"`, {
    encoding: 'utf-8',
  }).trim();

  const prUrlMatch = /\/pull\/(\d+)/.exec(result);
  const prNumber = prUrlMatch ? Number(prUrlMatch[1]) : null;
  return { url: result, number: prNumber };
}

export function reviewPR(prNumber: number, action: 'approve' | 'request-changes', body?: string) {
  const bodyFlag = body ? ` --body "${body}"` : '';
  execSync(`gh pr review ${String(prNumber)} --${action}${bodyFlag}`, { encoding: 'utf-8' });
}
