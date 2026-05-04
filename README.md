# OpenCode Self-Improve Plugin

A [OpenCode](https://opencode.ai) plugin that brings [Hermes Agent](https://github.com/NousResearch/hermes-agent)-style self-improvement capabilities to OpenCode.

## What It Does

This plugin creates an autonomous learning loop inside OpenCode:

1. **SkillForge** (Review Fork) — After each agent turn, extracts patterns from conversations and creates/updates structured skills
2. **Curator** — Periodically reviews all skills: re-scores quality, removes low-quality ones, merges duplicates
3. **SkillInjector** — Before each turn, injects relevant skills into the system prompt so the agent benefits from accumulated knowledge

## Architecture

```
┌─────────────────────────────────────────┐
│              OpenCode Agent              │
│                                         │
│  before_agent_start ──► SkillInjector   │
│         │                    │          │
│         ▼                    ▼          │
│    [Agent Turn]        inject skills    │
│         │                into prompt    │
│         ▼                               │
│    agent_end ────────► SkillForge       │
│                          │              │
│                          ▼              │
│                   extract patterns      │
│                   create/update skills  │
│                                         │
│  [Background Timer] ──► Curator         │
│                          │              │
│                          ▼              │
│                   re-score skills       │
│                   remove low-quality    │
│                   merge duplicates      │
└─────────────────────────────────────────┘
         │
         ▼
   ┌───────────┐
   │  SQLite   │
   │  skills   │
   └───────────┘
```

## Components

| Component | Purpose |
|-----------|---------|
| **RubricScorer** | 4-dimension quality scoring: accuracy, completeness, actionability, uniqueness |
| **SkillStore** | SQLite-backed CRUD for skills with similarity search |
| **SkillForge** | Hooks into `agent_end`, runs background pattern extraction |
| **Curator** | Timer-based periodic cleanup (re-score, prune, merge) |
| **SkillInjector** | Hooks into `before_agent_start`, injects top-3 relevant skills |

## Registered Tools

| Tool | Description |
|------|-------------|
| `skill_create` | Manually create a new skill |
| `skill_search` | Search skills by query or category |
| `skill_update` | Update an existing skill |
| `skill_list` | List all skills with sorting options |
| `skill_score` | Score a skill's quality |

## Registered Commands

| Command | Description |
|---------|-------------|
| `/skill-status` | Show skill store statistics |
| `/skill-review` | Trigger manual curator run |
| `/skill-diff` | Show recent skill changes |

## Installation

```bash
npm install opencode-self-improve
```

## Configuration

Add to your OpenCode plugin config:

```jsonc
{
  "skillForge": {
    "enabled": true,
    "autoCreate": true,
    "autoUpdate": true,
    "maxSkillsPerTurn": 1,
    "minTurnsBeforeReview": 5
  },
  "curator": {
    "enabled": true,
    "intervalDays": 7,
    "minQualityScore": 0.5,
    "mergeThreshold": 0.85
  },
  "rubric": {
    "accuracy": { "weight": 0.3 },
    "completeness": { "weight": 0.25 },
    "actionability": { "weight": 0.25 },
    "uniqueness": { "weight": 0.2 }
  },
  "storage": {
    "dbPath": "~/.local/share/opencode-self-improve/skills.db",
    "skillDir": "~/.opencode/skills/"
  }
}
```

## Development

```bash
npm install
npm run build    # Compile TypeScript
npx tsc --noEmit # Type check only
```

## How It Differs from Hermes Agent

| Feature | Hermes Agent | This Plugin |
|---------|-------------|-------------|
| Runtime | Standalone agent | OpenCode plugin |
| Skills | YAML+Markdown files | SQLite + YAML |
| Scoring | LLM-based | Heuristic (4-dim rubric) |
| Curator | 7-day cycle | Configurable interval |
| Memory | Built-in | Complements Magic Context |

## License

MIT
