import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { PluginConfig } from './schema';

export function loadConfig(): PluginConfig {
  const configPath = join(process.cwd(), 'magic-context.jsonc');
  try {
    if (!existsSync(configPath)) return getDefaultConfig();
    const rawConfig = readFileSync(configPath, 'utf-8');
    // Strip JSONC comments
    const stripped = rawConfig.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const parsed = JSON.parse(stripped);
    return { ...getDefaultConfig(), ...parsed };
  } catch {
    return getDefaultConfig();
  }
}

export function getDefaultConfig(): PluginConfig {
  return {
    logLevel: 'info',
    skillForge: {
      enabled: true,
      model: 'haiku',
      autoCreate: true,
      autoUpdate: true,
      maxSkillsPerTurn: 1,
      minTurnsBeforeReview: 5,
    },
    curator: {
      enabled: true,
      intervalDays: 7,
      model: 'sonnet',
      minQualityScore: 0.5,
      mergeThreshold: 0.85,
    },
    rubric: {
      accuracy: { weight: 0.3 },
      completeness: { weight: 0.25 },
      actionability: { weight: 0.25 },
      uniqueness: { weight: 0.2 },
    },
    storage: {
      dbPath: '~/.local/share/opencode-self-improve/skills.db',
      skillDir: '~/.opencode/skills/',
    },
  };
}
