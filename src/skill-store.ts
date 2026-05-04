import type Database from 'better-sqlite3';
import type { PluginConfig } from './config/schema';
import { RubricScorer } from './rubric-scorer';

export interface Skill {
  id: number;
  name: string;
  description: string;
  category: string;
  triggers: string[];
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
  usage_count: number;
  quality_score: number;
  file_path: string | null;
}

export type NewSkill = Omit<Skill, 'id' | 'created_at' | 'updated_at'>;

export class SkillStore {
  constructor(
    private db: Database.Database,
    private config: PluginConfig,
    private scorer: RubricScorer,
  ) {}

  createSkill(skill: NewSkill): number {
    const stmt = this.db.prepare(`
      INSERT INTO skills (name, description, category, triggers, content, version, usage_count, quality_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      skill.name,
      skill.description,
      skill.category,
      JSON.stringify(skill.triggers),
      skill.content,
      skill.version,
      skill.usage_count,
      skill.quality_score,
    );
    return result.lastInsertRowid as number;
  }

  getSkill(id: number): Skill | null {
    const row = this.db.prepare('SELECT * FROM skills WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToSkill(row) : null;
  }

  findSkills(query: { category?: string; minQuality?: number }): Skill[] {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (query.category) {
      clauses.push('category = ?');
      params.push(query.category);
    }
    if (query.minQuality !== undefined) {
      clauses.push('quality_score >= ?');
      params.push(query.minQuality);
    }

    const where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
    const rows = this.db.prepare(`SELECT * FROM skills ${where} ORDER BY quality_score DESC`).all(...params) as Record<string, unknown>[];
    return rows.map(r => this.rowToSkill(r));
  }

  updateSkill(id: number, updates: Partial<Omit<Skill, 'id' | 'created_at'>>): void {
    const entries = Object.entries(updates).filter(([k]) => k !== 'id' && k !== 'created_at');
    if (entries.length === 0) return;

    const setClauses = entries.map(([key]) => `${key} = ?`);
    const values = entries.map(([key, val]) => key === 'triggers' ? JSON.stringify(val) : val);

    this.db.prepare(
      `UPDATE skills SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(...values, id);
  }

  deleteSkill(id: number): void {
    this.db.prepare('DELETE FROM skills WHERE id = ?').run(id);
  }

  incrementUsage(id: number): void {
    this.db.prepare('UPDATE skills SET usage_count = usage_count + 1 WHERE id = ?').run(id);
  }

  scoreAndSaveSkill(skill: NewSkill): number {
    const score = this.scorer.scoreSkill(skill);
    skill.quality_score = score.overall;

    const existing = this.findSimilarSkills(skill.name, skill.triggers);
    if (existing.length > 0) {
      const existingSkill = existing[0];
      this.updateSkill(existingSkill.id, {
        ...skill,
        version: existingSkill.version + 1,
      });
      return existingSkill.id;
    }
    return this.createSkill(skill);
  }

  findSimilarSkills(name: string, triggers: string[]): Skill[] {
    if (triggers.length === 0) return [];
    const like = `%${triggers[0]}%`;
    const rows = this.db.prepare(
      'SELECT * FROM skills WHERE triggers LIKE ? OR name LIKE ? LIMIT 3'
    ).all(like, `%${name}%`) as Record<string, unknown>[];
    return rows.map(r => this.rowToSkill(r));
  }

  logUsage(skillId: number, context: string, scoreAfter?: number): void {
    this.db.prepare(
      'INSERT INTO skill_usage_log (skill_id, usage_context, quality_score_after) VALUES (?, ?, ?)'
    ).run(skillId, context, scoreAfter ?? null);
  }

  private rowToSkill(row: Record<string, unknown>): Skill {
    return {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string,
      category: row.category as string,
      triggers: JSON.parse(row.triggers as string),
      content: row.content as string,
      version: row.version as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      usage_count: row.usage_count as number,
      quality_score: row.quality_score as number,
      file_path: row.file_path as string | null,
    };
  }
}
