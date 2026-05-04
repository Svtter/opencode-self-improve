import type { SkillStore } from './skill-store';
import type { SubagentRunner } from './subagent-runner';
import type { PluginConfig } from './config/schema';

export class SkillForge {
  private turnCount = 0;

  constructor(
    private config: PluginConfig,
    private skillStore: SkillStore,
    private subagentRunner: SubagentRunner,
  ) {}

  onAgentEnd(messages: Array<{ role: string; content: string }>): void {
    if (!this.config.skillForge.enabled) return;

    this.turnCount++;
    if (this.turnCount < this.config.skillForge.minTurnsBeforeReview) return;

    // Fire-and-forget
    this.runBackgroundReview(messages).catch(err => {
      console.error('[SkillForge] background review failed:', err);
    });
  }

  private async runBackgroundReview(messages: Array<{ role: string; content: string }>): Promise<void> {
    const review = this.subagentRunner.reviewConversation(messages);
    if (review.patterns.length === 0) return;

    const maxSkills = this.config.skillForge.maxSkillsPerTurn;
    for (const pattern of review.patterns.slice(0, maxSkills)) {
      if (!this.config.skillForge.autoCreate) continue;

      this.skillStore.scoreAndSaveSkill({
        name: pattern.name,
        description: pattern.description,
        category: pattern.category,
        triggers: pattern.triggers,
        content: pattern.content,
        version: 1,
        usage_count: 0,
        quality_score: 0.5,
        file_path: null,
      });
    }
  }
}
