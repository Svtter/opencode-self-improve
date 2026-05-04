import type { SkillStore } from '../skill-store';

export function skillDiff(skillStore: SkillStore, limit = 10): string {
  const skills = skillStore.findSkills({});
  skills.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const recent = skills.slice(0, limit);
  if (recent.length === 0) return 'No skills found.';

  const lines = ['Recent skill changes:', ''];
  for (const s of recent) {
    const quality = Math.round(s.quality_score * 100);
    lines.push(`  ${s.name} (v${s.version}) — quality: ${quality}%, used: ${s.usage_count}x, updated: ${s.updated_at}`);
  }

  return lines.join('\n');
}
