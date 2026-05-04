import type { SkillStore, Skill } from '../skill-store';

export interface SkillSearchParams {
  query?: string;
  category?: string;
  limit?: number;
}

interface SkillPreview {
  id: number;
  name: string;
  description: string;
  category: string;
  triggers: string[];
  quality_score: number;
  usage_count: number;
  version: number;
  preview: string;
}

export function skillSearch(params: SkillSearchParams, skillStore: SkillStore): { skills: SkillPreview[]; count: number } {
  const { query, category, limit = 10 } = params;

  let skills: Skill[] = skillStore.findSkills({ category });

  if (query) {
    const lower = query.toLowerCase();
    skills = skills.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower) ||
      s.content.toLowerCase().includes(lower),
    );
  }

  skills.sort((a, b) => b.quality_score - a.quality_score);
  skills = skills.slice(0, limit);

  return {
    skills: skills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      triggers: s.triggers,
      quality_score: s.quality_score,
      usage_count: s.usage_count,
      version: s.version,
      preview: s.content.slice(0, 200) + (s.content.length > 200 ? '...' : ''),
    })),
    count: skills.length,
  };
}
