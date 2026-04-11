export interface CcPullRequest {
  number: number;
  title: string;
  head: string;
  base: string;
  url: string;
}

export function createPR(
  _title: string,
  _head: string,
  _base: string,
  _body: string,
): Promise<CcPullRequest> {
  // TODO: Create a pull request
  throw new Error('Not yet implemented');
}

export function getPRForIssue(_issueNumber: number): Promise<CcPullRequest | null> {
  // TODO: Find the PR associated with an issue (by branch naming convention)
  throw new Error('Not yet implemented');
}
