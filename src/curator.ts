import type { SkillStore, Skill } from './skill-store';
import type { PluginConfig } from './config/schema';
import type { RubricScorer } from './rubric-scorer';

export class Curator {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private config: PluginConfig,
    private skillStore: SkillStore,
    private scorer: RubricScorer,
  ) {}

  start(): void {
    if (!this.config.curator.enabled) return;
    const intervalMs = this.config.curator.intervalDays * 24 * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runCleanup().catch(err => {
        console.error('[Curator] cleanup failed:', err);
      });
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runManualCleanup(): Promise<{ removed: number; merged: number; rescored: number }> {
    return this.runCleanup();
  }

  private async runCleanup(): Promise<{ removed: number; merged: number; rescored: number }> {
    const skills = this.skillStore.findSkills({ minQuality: 0 });
    if (skills.length === 0) return { removed: 0, merged: 0, rescored: 0 };

    let removed = 0;
    let merged = 0;
    let rescored = 0;

    for (const skill of skills) {
      const newScore = this.scorer.scoreSkill(skill);
      this.skillStore.updateSkill(skill.id, { quality_score: newScore.overall });
      rescored++;

      if (newScore.overall < this.config.curator.minQualityScore) {
        this.skillStore.deleteSkill(skill.id);
        removed++;
        continue;
      }

      const mergeResult = this.mergeDuplicates(skill);
      merged += mergeResult;
    }

    console.log(`[Curator] cleanup complete: rescored=${rescored}, removed=${removed}, merged=${merged}`);
    return { removed, merged, rescored };
  }

  private mergeDuplicates(skill: Skill): number {
    const similar = this.skillStore.findSimilarSkills(skill.name, skill.triggers);
    let merged = 0;

    for (const other of similar) {
      if (other.id === skill.id) continue;

      const similarity = this.calculateSimilarity(skill, other);
      if (similarity >= this.config.curator.mergeThreshold) {
        this.mergeSkills(skill, other);
        merged++;
      }
    }
    return merged;
  }

  private calculateSimilarity(a: Skill, b: Skill): number {
    const nameSim = this.stringSimilarity(a.name, b.name);
    const descSim = this.stringSimilarity(a.description, b.description);
    const triggerSim = this.arrayJaccard(a.triggers, b.triggers);
    return nameSim * 0.3 + descSim * 0.3 + triggerSim * 0.4;
  }

  private stringSimilarity(s1: string, s2: string): number {
    const longer = s1.length >= s2.length ? s1 : s2;
    const shorter = s1.length >= s2.length ? s2 : s1;
    if (longer.length === 0) return 1;
    return (longer.length - this.editDistance(longer, shorter)) / longer.length;
  }

  private editDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[b.length][a.length];
  }

  private arrayJaccard(a: string[], b: string[]): number {
    const setA = new Set(a.map(s => s.toLowerCase()));
    const setB = new Set(b.map(s => s.toLowerCase()));
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 1 : intersection / union;
  }

  private mergeSkills(keep: Skill, remove: Skill): void {
    const mergedContent = `${keep.content}\n\n## Alternative Approach\n\n${remove.content}`;
    this.skillStore.updateSkill(keep.id, {
      content: mergedContent,
      usage_count: keep.usage_count + remove.usage_count,
    });
    this.skillStore.deleteSkill(remove.id);
  }
}
