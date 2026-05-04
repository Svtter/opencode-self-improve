import type { SkillStore, Skill } from './skill-store';
import type { PluginConfig } from './config/schema';
import { createLogger } from './logger';

const log = createLogger('SkillInjector');

export class SkillInjector {
  constructor(
    private config: PluginConfig,
    private skillStore: SkillStore,
  ) {}

  injectSkills(systemPrompt: string): string {
    if (!this.config.skillForge.enabled) return systemPrompt;

    const relevantSkills = this.findRelevantSkills(systemPrompt);
    if (relevantSkills.length === 0) return systemPrompt;

    log.info('injecting skills into prompt', { count: relevantSkills.length, skills: relevantSkills.map(s => s.name) });
    const skillsBlock = relevantSkills
      .map(s => {
        const qualityPct = Math.round(s.quality_score * 100);
        return `### ${s.name} (v${s.version}, quality: ${qualityPct}%)\n${s.content}`;
      })
      .join('\n\n---\n\n');

    return `${systemPrompt}\n\n## Learned Skills\n\n${skillsBlock}\n\nApply the most relevant learned skills when they match the current task.`;
  }

  private findRelevantSkills(context: string): Skill[] {
    const keywords = this.extractKeywords(context);
    const allSkills = this.skillStore.findSkills({ minQuality: 0.3 });

    const scored = allSkills.map(skill => ({
      skill,
      relevance: this.calculateRelevance(skill, keywords, context),
    }));

    return scored
      .filter(s => s.relevance > 0.3)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3)
      .map(s => s.skill);
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'said',
      'the', 'and', 'for', 'not', 'you', 'all', 'can', 'had', 'her', 'was',
      'one', 'our', 'out', 'are', 'but', 'what', 'some', 'into', 'its',
    ]);
    return [
      ...new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 3 && !stopWords.has(w)),
      ),
    ];
  }

  private calculateRelevance(skill: Skill, keywords: string[], _context: string): number {
    let score = 0;

    const triggerMatches = skill.triggers.filter(trigger =>
      keywords.some(kw => trigger.toLowerCase().includes(kw)),
    ).length;
    score += triggerMatches * 0.4;

    const contentMatches = keywords.filter(kw =>
      skill.content.toLowerCase().includes(kw),
    ).length;
    score += contentMatches * 0.3;

    score += skill.quality_score * 0.2;
    score += Math.min(skill.usage_count / 10, 0.1);

    return Math.min(score, 1.0);
  }
}
