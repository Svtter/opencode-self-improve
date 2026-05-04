import type { SkillStore } from '../skill-store';

export function skillStatus(skillStore: SkillStore): string {
  const allSkills = skillStore.findSkills({});
  const categories = [...new Set(allSkills.map(s => s.category))];

  const byCategory: Record<string, number> = {};
  for (const cat of categories) {
    byCategory[cat] = allSkills.filter(s => s.category === cat).length;
  }

  const avgQuality = allSkills.length > 0
    ? allSkills.reduce((sum, s) => sum + s.quality_score, 0) / allSkills.length
    : 0;
  const totalUsage = allSkills.reduce((sum, s) => sum + s.usage_count, 0);

  const lines = [
    `Total skills: ${allSkills.length}`,
    `Categories: ${categories.join(', ') || '(none)'}`,
    `Average quality: ${(avgQuality * 100).toFixed(1)}%`,
    `Total usage: ${totalUsage}`,
  ];

  if (Object.keys(byCategory).length > 0) {
    lines.push('', 'By category:');
    for (const [cat, count] of Object.entries(byCategory)) {
      lines.push(`  ${cat}: ${count}`);
    }
  }

  return lines.join('\n');
}
