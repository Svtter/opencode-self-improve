import type { SkillStore } from '../skill-store';

export interface SkillUpdateParams {
  id: number;
  name?: string;
  description?: string;
  category?: string;
  triggers?: string[];
  content?: string;
}

export function skillUpdate(params: SkillUpdateParams, skillStore: SkillStore): { success: boolean; message: string } {
  const { id, ...updates } = params;
  const existing = skillStore.getSkill(id);
  if (!existing) throw new Error(`Skill ${id} not found`);

  skillStore.updateSkill(id, updates);
  return { success: true, message: `Skill ${id} updated` };
}
