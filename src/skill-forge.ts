import type { SkillStore } from './skill-store';
import type { SubagentRunner } from './subagent-runner';
import type { PluginConfig } from './config/schema';
import { createLogger } from './logger';

const log = createLogger('SkillForge');

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

    log.info('triggering background review', { turnCount: this.turnCount, messageCount: messages.length });
    // Fire-and-forget
    this.runBackgroundReview(messages).catch(err => {
      log.error('background review failed', err instanceof Error ? err.message : err);
    });
  }

  private async runBackgroundReview(messages: Array<{ role: string; content: string }>): Promise<void> {
    const review = this.subagentRunner.reviewConversation(messages);
    if (review.patterns.length === 0) {
      log.debug('no patterns found in conversation');
      return;
    }

    log.info('patterns extracted', { count: review.patterns.length, names: review.patterns.map(p => p.name) });
    const maxSkills = this.config.skillForge.maxSkillsPerTurn;
    let created = 0;
    for (const pattern of review.patterns.slice(0, maxSkills)) {
      if (!this.config.skillForge.autoCreate) continue;

      const id = this.skillStore.scoreAndSaveSkill({
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
      log.info('skill saved', { id, name: pattern.name, category: pattern.category });
      created++;
    }
    if (created > 0) {
      log.info('skill creation summary', { created });
    }
  }
}
