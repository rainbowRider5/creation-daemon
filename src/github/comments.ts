export interface IssueComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
}

export function postComment(_issueNumber: number, _body: string): Promise<void> {
  // TODO: Post a comment on an issue
  throw new Error('Not yet implemented');
}

export function getCommentsSince(_issueNumber: number, _since: string): Promise<IssueComment[]> {
  // TODO: Get comments on an issue since a given timestamp
  // Used by unblocker to detect human replies
  throw new Error('Not yet implemented');
}
