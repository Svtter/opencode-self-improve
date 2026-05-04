import type { SkillStore } from '../skill-store';
import type { RubricScorer } from '../rubric-scorer';

export interface SkillScoreParams {
  id: number;
}

export function skillScore(
  params: SkillScoreParams,
  skillStore: SkillStore,
  scorer: RubricScorer,
): { skillId: number; skillName: string; scores: ReturnType<RubricScorer['scoreSkill']>; previousScore: number } {
  const skill = skillStore.getSkill(params.id);
  if (!skill) throw new Error(`Skill ${params.id} not found`);

  const scores = scorer.scoreSkill(skill);
  return {
    skillId: skill.id,
    skillName: skill.name,
    scores,
    previousScore: skill.quality_score,
  };
}
