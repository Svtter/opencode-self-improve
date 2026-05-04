export interface PluginConfig {
  skillForge: {
    enabled: boolean;
    model: 'haiku' | 'sonnet' | 'opus';
    autoCreate: boolean;
    autoUpdate: boolean;
    maxSkillsPerTurn: number;
    minTurnsBeforeReview: number;
  };
  curator: {
    enabled: boolean;
    intervalDays: number;
    model: 'haiku' | 'sonnet' | 'opus';
    minQualityScore: number;
    mergeThreshold: number;
  };
  rubric: {
    accuracy: { weight: number };
    completeness: { weight: number };
    actionability: { weight: number };
    uniqueness: { weight: number };
  };
  storage: {
    dbPath: string;
    skillDir: string;
  };
}
