import type { Plugin, PluginInput, Hooks } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';

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

export const SelfImprovePlugin: Plugin = async (_input: PluginInput) => {
  const config = loadConfig();
  const db = initializeDatabase(config.storage.dbPath);

  const scorer = new RubricScorer(config.rubric);
  const skillStore = new SkillStore(db, config, scorer);
  const subagentRunner = new SubagentRunner();
  const forge = new SkillForge(config, skillStore, subagentRunner);
  const curator = new Curator(config, skillStore, scorer);
  const injector = new SkillInjector(config, skillStore);

  curator.start();

  const hooks: Hooks = {
    // Inject relevant learned skills into the system prompt
    "experimental.chat.system.transform": async (_input, output) => {
      const context = output.system.join('\n');
      const injected = injector.injectSkills(context);
      if (injected !== context) {
        output.system.push(injected.slice(context.length).trim());
      }
    },

    // Track tool executions (extensible for future skill-related logging)
    "tool.execute.after": async (_input, _output) => {
      // placeholder for future tool usage tracking
    },

    // Tools — the primary interface for the agent to manage skills
    tool: {
      skill_create: tool({
        description: 'Create a new learned skill with name, description, category, triggers, and content',
        args: {
          name: tool.schema.string().describe('Skill name'),
          description: tool.schema.string().describe('Brief description'),
          category: tool.schema.string().describe('Category: testing, debugging, refactoring, api, ui, database, other'),
          triggers: tool.schema.array(tool.schema.string()).describe('Keywords that trigger this skill'),
          content: tool.schema.string().describe('Markdown content with steps and examples'),
        },
        async execute(args) {
          const result = skillCreate(args, skillStore);
          return JSON.stringify(result, null, 2);
        },
      }),

      skill_search: tool({
        description: 'Search the skill store by query string or category',
        args: {
          query: tool.schema.string().optional().describe('Search query'),
          category: tool.schema.string().optional().describe('Filter by category'),
          limit: tool.schema.number().optional().describe('Max results (default 10)'),
        },
        async execute(args) {
          const result = skillSearch(args, skillStore);
          return JSON.stringify(result, null, 2);
        },
      }),

      skill_update: tool({
        description: 'Update an existing skill by id',
        args: {
          id: tool.schema.number().describe('Skill id to update'),
          name: tool.schema.string().optional().describe('New name'),
          description: tool.schema.string().optional().describe('New description'),
          category: tool.schema.string().optional().describe('New category'),
          triggers: tool.schema.array(tool.schema.string()).optional().describe('New triggers'),
          content: tool.schema.string().optional().describe('New content'),
        },
        async execute(args) {
          const result = skillUpdate(args, skillStore);
          return JSON.stringify(result, null, 2);
        },
      }),

      skill_list: tool({
        description: 'List all skills, optionally filtered by category and sorted',
        args: {
          category: tool.schema.string().optional().describe('Filter by category'),
          sortBy: tool.schema.enum(['quality', 'usage', 'updated']).optional().describe('Sort criteria (default: quality)'),
          limit: tool.schema.number().optional().describe('Max results (default 20)'),
        },
        async execute(args) {
          const result = skillList(args, skillStore);
          return JSON.stringify(result, null, 2);
        },
      }),

      skill_score: tool({
        description: 'Calculate quality scores for a skill using the rubric scorer',
        args: {
          id: tool.schema.number().describe('Skill id to score'),
        },
        async execute(args) {
          const result = skillScore(args, skillStore, scorer);
          return JSON.stringify(result, null, 2);
        },
      }),

      skill_status: tool({
        description: 'Show current skill store status including totals, categories, and quality metrics',
        args: {},
        async execute() {
          return skillStatus(skillStore);
        },
      }),

      skill_review: tool({
        description: 'Run curator review to rescore, remove low-quality, and merge duplicate skills',
        args: {},
        async execute() {
          return await skillReview(curator);
        },
      }),

      skill_diff: tool({
        description: 'Show recent skill changes sorted by update time',
        args: {
          limit: tool.schema.number().optional().describe('Max results (default 10)'),
        },
        async execute(args) {
          return skillDiff(skillStore, args.limit ?? 10);
        },
      }),

      skill_forge_review: tool({
        description: 'Trigger the SkillForge to review conversation messages and extract learnable patterns as new skills',
        args: {
          messages: tool.schema.array(
            tool.schema.object({
              role: tool.schema.string().describe('Message role (user, assistant, system)'),
              content: tool.schema.string().describe('Message content'),
            }),
          ).describe('Conversation messages to review for patterns'),
        },
        async execute(args) {
          forge.onAgentEnd(args.messages);
          return 'SkillForge review triggered. Use skill_list to see any newly created skills.';
        },
      }),
    },
  };

  return hooks;
};

export default SelfImprovePlugin;
