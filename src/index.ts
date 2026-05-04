import { loadConfig } from './config';
import { initializeDatabase, closeDatabase } from './storage';
import { RubricScorer } from './rubric-scorer';
import { SkillStore } from './skill-store';
import { SkillForge } from './skill-forge';
import { Curator } from './curator';
import { SkillInjector } from './skill-injector';
import { SubagentRunner } from './subagent-runner';
import { skillCreate } from './tools/skill-create';
import { skillSearch } from './tools/skill-search';
import { skillUpdate } from './tools/skill-update';
import { skillList } from './tools/skill-list';
import { skillScore } from './tools/skill-score';
import { skillStatus } from './commands/skill-status';
import { skillReview } from './commands/skill-review';
import { skillDiff } from './commands/skill-diff';
import type { ExtensionAPI, BeforeAgentStartEvent, AgentEndEvent, ToolExecutionEndEvent, ExtensionContext } from './types';

export type { ExtensionAPI } from './types';

export interface SelfImproveDeps {
  config: ReturnType<typeof loadConfig>;
  skillStore: SkillStore;
  scorer: RubricScorer;
  forge: SkillForge;
  curator: Curator;
  injector: SkillInjector;
}

function wirePlugin(api: ExtensionAPI): { deps: SelfImproveDeps; cleanup: () => void } {
  // Load config
  const config = loadConfig();

  // Initialize database
  const db = initializeDatabase(config.storage.dbPath);

  // Create components
  const scorer = new RubricScorer(config.rubric);
  const skillStore = new SkillStore(db, config, scorer);
  const subagentRunner = new SubagentRunner();
  const forge = new SkillForge(config, skillStore, subagentRunner);
  const curator = new Curator(config, skillStore, scorer);
  const injector = new SkillInjector(config, skillStore);

  // Start curator timer
  curator.start();

  // --- Register hooks ---

  api.onBeforeAgentStart((event: BeforeAgentStartEvent, _ctx: ExtensionContext) => {
    const injected = injector.injectSkills(event.systemPrompt);
    return { systemPrompt: injected };
  });

  api.onAgentEnd((event: AgentEndEvent, _ctx: ExtensionContext) => {
    forge.onAgentEnd(event.messages);
  });

  api.onToolExecutionEnd((_event: ToolExecutionEndEvent, _ctx: ExtensionContext) => {
    // Could log skill-related tool usage here
  });

  // --- Register tools ---

  api.registerTool({
    name: 'skill_create',
    label: 'Create Skill',
    description: 'Create a new learned skill with name, description, category, triggers, and content',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name' },
        description: { type: 'string', description: 'Brief description' },
        category: { type: 'string', description: 'Category: testing, debugging, refactoring, api, ui, database, other' },
        triggers: { type: 'array', items: { type: 'string' }, description: 'Keywords that trigger this skill' },
        content: { type: 'string', description: 'Markdown content with steps and examples' },
      },
      required: ['name', 'description', 'content'],
    },
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const result = skillCreate(params as any, skillStore);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: 'skill_search',
    label: 'Search Skills',
    description: 'Search the skill store by query string or category',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Filter by category' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const result = skillSearch(params as any, skillStore);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: 'skill_update',
    label: 'Update Skill',
    description: 'Update an existing skill by id',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Skill id to update' },
        name: { type: 'string', description: 'New name' },
        description: { type: 'string', description: 'New description' },
        category: { type: 'string', description: 'New category' },
        triggers: { type: 'array', items: { type: 'string' }, description: 'New triggers' },
        content: { type: 'string', description: 'New content' },
      },
      required: ['id'],
    },
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const result = skillUpdate(params as any, skillStore);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: 'skill_list',
    label: 'List Skills',
    description: 'List all skills, optionally filtered by category and sorted',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        sortBy: { type: 'string', enum: ['quality', 'usage', 'updated'], description: 'Sort criteria' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const result = skillList(params as any, skillStore);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: 'skill_score',
    label: 'Score Skill',
    description: 'Calculate quality scores for a skill using the rubric scorer',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Skill id to score' },
      },
      required: ['id'],
    },
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const result = skillScore(params as any, skillStore, scorer);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  });

  // --- Register commands ---

  api.registerCommand('skill-status', (_ctx: ExtensionContext) => {
    return skillStatus(skillStore);
  });

  api.registerCommand('skill-review', async (_ctx: ExtensionContext) => {
    return await skillReview(curator);
  });

  api.registerCommand('skill-diff', (_ctx: ExtensionContext, ...args: string[]) => {
    const limit = args[0] ? parseInt(args[0], 10) : 10;
    return skillDiff(skillStore, limit);
  });

  const cleanup = () => {
    curator.stop();
    closeDatabase();
  };

  return {
    deps: { config, skillStore, scorer, forge, curator, injector },
    cleanup,
  };
}

/**
 * Plugin factory. The host application calls this with its ExtensionAPI.
 */
export default function createSelfImprovePlugin(api: ExtensionAPI): { cleanup: () => void } {
  const { cleanup } = wirePlugin(api);
  return { cleanup };
}

// Also export as named for flexibility
export { createSelfImprovePlugin };
