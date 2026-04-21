import { execSync } from 'node:child_process';

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
  const match = /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
