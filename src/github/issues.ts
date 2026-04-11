export interface CcIssue {
  number: number;
  title: string;
  body: string | null;
  labels: string[];
  state: string;
}

export function listCcIssues(): Promise<CcIssue[]> {
  // TODO: Fetch all open issues with cd:* labels
  throw new Error('Not yet implemented');
}

export function getIssue(_issueNumber: number): Promise<CcIssue> {
  // TODO: Fetch a single issue by number
  throw new Error('Not yet implemented');
}

export function createIssue(_title: string, _body: string, _labels: string[]): Promise<CcIssue> {
  // TODO: Create a new issue with cd:* labels
  throw new Error('Not yet implemented');
}

export function updateIssueLabels(
  _issueNumber: number,
  _addLabels: string[],
  _removeLabels: string[],
): Promise<void> {
  // TODO: Add/remove labels on an issue
  throw new Error('Not yet implemented');
}
