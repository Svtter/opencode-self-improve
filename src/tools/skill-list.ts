import type { SkillStore, Skill } from '../skill-store';

export interface SkillListParams {
  category?: string;
  sortBy?: 'quality' | 'usage' | 'updated';
  limit?: number;
}

export function skillList(params: SkillListParams, skillStore: SkillStore): { skills: Skill[]; total: number } {
  const { category, sortBy = 'quality', limit = 20 } = params;

  let skills = skillStore.findSkills({ category });

  switch (sortBy) {
    case 'usage':
      skills.sort((a, b) => b.usage_count - a.usage_count);
      break;
    case 'updated':
      skills.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      break;
    default:
      skills.sort((a, b) => b.quality_score - a.quality_score);
  }

  skills = skills.slice(0, limit);
  return { skills, total: skills.length };
}
