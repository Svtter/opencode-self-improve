import type { PluginConfig } from './config/schema';

export interface SkillScore {
  accuracy: number;
  completeness: number;
  actionability: number;
  uniqueness: number;
  overall: number;
}

export interface ScoreableSkill {
  name: string;
  description: string;
  content: string;
  triggers: string[];
  usage_count: number;
}

export class RubricScorer {
  private weights: [number, number, number, number];

  constructor(rubricConfig: PluginConfig['rubric']) {
    this.weights = [
      rubricConfig.accuracy.weight,
      rubricConfig.completeness.weight,
      rubricConfig.actionability.weight,
      rubricConfig.uniqueness.weight,
    ];
  }

  scoreSkill(skill: ScoreableSkill): SkillScore {
    const scores: [number, number, number, number] = [
      this.scoreAccuracy(skill),
      this.scoreCompleteness(skill),
      this.scoreActionability(skill),
      this.scoreUniqueness(skill),
    ];

    const overall = scores.reduce((sum, score, i) => sum + score * this.weights[i], 0);

    return {
      accuracy: scores[0],
      completeness: scores[1],
      actionability: scores[2],
      uniqueness: scores[3],
      overall,
    };
  }

  private scoreAccuracy(skill: ScoreableSkill): number {
    const lower = skill.content.toLowerCase();
    const hasSolution = lower.includes('solution') || lower.includes('fix') || lower.includes('resolve');
    const matchesDescription = skill.description.split(/\s+/).some(word =>
      word.length > 4 && skill.content.toLowerCase().includes(word.toLowerCase())
    );
    let score = 0.4;
    if (hasSolution) score += 0.3;
    if (matchesDescription) score += 0.3;
    return Math.min(score, 1.0);
  }

  private scoreCompleteness(skill: ScoreableSkill): number {
    const content = skill.content;
    const hasSteps = /\n\d+\.\s/.test(content) || content.includes('- step') || content.includes('1.');
    const hasCodeBlocks = content.includes('```');
    const hasEdgeCases = content.toLowerCase().includes('edge case') || content.toLowerCase().includes('pitfall');
    const hasMultipleSections = (content.match(/^##\s/gm) || []).length >= 2;

    let score = 0.2;
    if (hasSteps) score += 0.25;
    if (hasCodeBlocks) score += 0.2;
    if (hasEdgeCases) score += 0.15;
    if (hasMultipleSections) score += 0.2;
    return Math.min(score, 1.0);
  }

  private scoreActionability(skill: ScoreableSkill): number {
    const imperativeMatch = skill.content.match(
      /(^|\n)\s*(do|implement|create|add|fix|update|remove|delete|use|run|execute|install|configure)\s/gi
    );
    const hasCodeBlocks = skill.content.includes('```');
    const hasFileRefs = skill.content.includes('src/') || skill.content.includes('./') || skill.content.includes('path');

    let score = 0.3;
    if (imperativeMatch && imperativeMatch.length > 2) score += 0.3;
    if (hasCodeBlocks) score += 0.25;
    if (hasFileRefs) score += 0.15;
    return Math.min(score, 1.0);
  }

  private scoreUniqueness(skill: ScoreableSkill): number {
    const lower = skill.name.toLowerCase();
    if (lower.includes('generic') || lower.includes('general')) return 0.3;
    if (skill.triggers.length >= 3) return 0.85;
    if (skill.triggers.length >= 1) return 0.7;
    return 0.5;
  }
}
