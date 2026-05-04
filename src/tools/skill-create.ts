import type { SkillStore } from '../skill-store';

export interface SkillCreateParams {
  name: string;
  description: string;
  category: string;
  triggers: string[];
  content: string;
}

export function skillCreate(params: SkillCreateParams, skillStore: SkillStore): { id: number; message: string } {
  if (!params.name || !params.description || !params.content) {
    throw new Error('name, description, and content are required');
  }

  const id = skillStore.scoreAndSaveSkill({
    name: params.name,
    description: params.description,
    category: params.category || 'other',
    triggers: params.triggers || [],
    content: params.content,
    version: 1,
    usage_count: 0,
    quality_score: 0.5,
    file_path: null,
  });

  return { id, message: `Skill "${params.name}" created with id ${id}` };
}
