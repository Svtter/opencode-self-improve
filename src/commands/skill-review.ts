import type { Curator } from '../curator';

export async function skillReview(curator: Curator): Promise<string> {
  const result = await curator.runManualCleanup();
  return [
    'Curator review completed.',
    `  Rescored: ${result.rescored}`,
    `  Removed (low quality): ${result.removed}`,
    `  Merged (duplicates): ${result.merged}`,
  ].join('\n');
}
