import { execSync } from 'node:child_process';

export function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf-8',
  }).trim();
}

export function createBranch(name: string): void {
  execSync(`git checkout -b ${name}`);
}

export function switchBranch(name: string): void {
  execSync(`git checkout ${name}`);
}

export function commitAll(message: string): void {
  execSync('git add -A');
  execSync(`git commit -m "${message}"`);
}

export function push(branch: string): void {
  execSync(`git push -u origin ${branch}`);
}

export function getRemoteUrl(): string | null {
  try {
    return execSync('git remote get-url origin', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    return null;
  }
}

export function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  // Handle both SSH and HTTPS remotes
  const match = /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
