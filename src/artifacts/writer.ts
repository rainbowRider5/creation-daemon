export type ArtifactType =
  | 'draft'
  | 'refinement'
  | 'design'
  | 'implementation'
  | 'review'
  | 'adjustment';

export function writeArtifact(
  _issueNumber: number,
  _type: ArtifactType,
  _content: string,
): Promise<string> {
  // TODO Phase 0:
  // 1. Ensure docs/issues/<n>/ directory exists
  // 2. Determine next sequence number from existing files
  // 3. Write <seq>-<type>.md
  // 4. Update meta.json artifacts array
  // 5. Return the file path
  throw new Error('Not yet implemented');
}
