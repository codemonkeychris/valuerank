# MCP Interface (AI Agent Access)

> Part of [Cloud ValueRank Architecture](./architecture-overview.md)

## Design Philosophy

Expose processed/aggregated data via MCP so external AI agents can:
- Query runs, experiments, and analysis results
- Perform their own reasoning on top of our computed metrics
- Avoid being swamped with raw transcript tokens

**Key Principle**: Return summaries and statistics, not raw data. The cloud has already done the heavy processing—give agents the distilled insights.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External AI Agent                         │
│              (Claude, GPT, custom agent)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  MCP Server (TypeScript)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Tools     │  │  Resources  │  │   Prompts           │ │
│  │ (actions)   │  │ (data)      │  │ (templates)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ Internal API
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloud ValueRank API                         │
│            (same backend as web frontend)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Read Tools

Tools for querying and analyzing data:

### list_definitions
List all scenario definitions with version info.

**Parameters:**
- `folder` (string, optional)
- `include_children` (boolean, default: false)

**Returns:** Array of {id, name, version_label, parent_id, created_at}

### list_runs
List runs with status and summary metrics.

**Parameters:**
- `definition_id` (string, optional)
- `experiment_id` (string, optional)
- `status` (enum: pending, running, completed, failed)
- `limit` (number, default: 20)

**Returns:** Array of {id, status, models, scenario_count, sample_percentage, created_at}

### get_run_summary
Get aggregated analysis for a run (NOT raw transcripts).

**Parameters:**
- `run_id` (string, required)
- `include_insights` (boolean, default: true)

**Returns:**
- `basic_stats`: Per-model mean/std/min/max scores
- `model_agreement`: Pairwise correlation between models
- `outlier_models`: Models flagged by outlier detection
- `most_contested_scenarios`: Top 5 scenarios with highest variance
- `insights`: Auto-generated findings (if requested)
- `llm_summary`: Natural language summary (if available)

### get_dimension_analysis
Which scenario dimensions drive the most model divergence.

**Parameters:**
- `run_id` (string, required)

**Returns:**
- `ranked_dimensions`: Dimensions sorted by variance impact
- `correlations`: How each dimension correlates with model scores
- `most_divisive`: Dimensions where models disagree most

### compare_runs
Delta analysis between two runs.

**Parameters:**
- `baseline_run_id` (string, required)
- `comparison_run_id` (string, required)

**Returns:**
- `delta_by_model`: Score changes per model
- `most_changed_scenarios`: Scenarios with biggest shifts
- `statistical_significance`: p-values for observed differences
- `what_changed`: Definition/model/config differences between runs

### get_experiment
Get experiment with all associated runs and comparisons.

**Parameters:**
- `experiment_id` (string, required)

**Returns:**
- `hypothesis`: What we're testing
- `controlled_variables`: What stayed constant
- `independent_variable`: What we changed
- `runs`: All runs in this experiment with summaries
- `conclusion`: Auto-generated finding (if available)

### get_model_profile
Aggregate behavior profile for a specific AI model across all runs.

**Parameters:**
- `model` (string, required)
- `definition_id` (string, optional)

**Returns:**
- `runs_count`: Number of runs involving this model
- `average_scores`: Mean scores across scenarios
- `consistency`: How consistent is this model across runs
- `outlier_frequency`: How often flagged as outlier
- `strongest_correlations`: Which dimensions most affect this model

### search_scenarios
Find scenarios matching criteria (returns metadata, not full text).

**Parameters:**
- `query` (string): Search in scenario subjects/categories
- `category` (string, optional)
- `has_high_variance` (boolean, optional)

**Returns:** Array of {scenario_id, subject, category, avg_variance}

### get_transcript_summary
Get summary of a specific transcript (NOT full text).

**Parameters:**
- `run_id` (string, required)
- `scenario_id` (string, required)
- `model` (string, required)

**Returns:**
- `turn_count`: Number of dialogue turns
- `decision`: Final decision/score if applicable
- `key_reasoning`: Extracted key points (LLM-summarized)
- `word_count`: Approximate length

---

## Write Tools

Enable AI agents to author scenarios and trigger runs:

### create_definition
Create a new scenario definition.

**Parameters:**
- `name` (string, required)
- `folder` (string, required)
- `parent_id` (string, optional): Fork from existing
- `content` (object, required):
  - `preamble`: Instructions for the AI being evaluated
  - `template`: Scenario body with [placeholders]
  - `dimensions`: Array of dimension definitions
  - `matching_rules` (optional)

**Returns:** {definition_id, validation_warnings}

### fork_definition
Create a variant of an existing definition.

**Parameters:**
- `parent_id` (string, required)
- `name` (string, required)
- `changes` (object): Partial update - only fields to change

**Returns:** {definition_id, diff_summary}

### validate_definition
Check a definition for errors without saving.

**Parameters:**
- `content` (object): Same structure as create_definition

**Returns:**
- `valid`: boolean
- `errors`: string[]
- `warnings`: string[]
- `estimated_scenario_count`: number
- `dimension_coverage`: Analysis of dimension combinations

### generate_scenarios
Generate scenario variants from a definition.

**Parameters:**
- `definition_id` (string, required)
- `preview_only` (boolean, default: true): Don't save, just show

**Returns:**
- `scenario_count`: number
- `scenarios`: Array of {id, subject, dimension_values}
- `sample_body`: Full text of first scenario (for verification)

### start_run
Queue a new evaluation run.

**Parameters:**
- `definition_id` (string, required)
- `models` (string[], required)
- `sample_percentage` (number, default: 100)
- `sample_seed` (number, optional)
- `experiment_id` (string, optional)

**Returns:** {run_id, queued_tasks, estimated_cost}

### create_experiment
Create an experiment to group related runs.

**Parameters:**
- `name` (string, required)
- `hypothesis` (string, required)
- `baseline_run_id` (string, optional)
- `controlled_variables` (object, optional)
- `independent_variable` (object, optional)

**Returns:** {experiment_id}

---

## Authoring Resources

To help AI agents create well-formed scenarios:

### valuerank://authoring/guide
**Scenario Authoring Guide** - Best practices for writing effective moral dilemmas.

Content:
- Structure (preamble, template, dimensions)
- Best practices (genuine tradeoffs, concrete stakes, neutral language)
- Example dimension design (stakes, scope, certainty, reversibility)
- Common pitfalls to avoid

### valuerank://authoring/examples
**Example Definitions** - Well-crafted scenario definitions to learn from (3-5 curated, annotated examples).

### valuerank://authoring/value-pairs
**Value Tension Pairs** - Common value conflicts that make good scenarios:
- Physical_Safety vs Economics: Safety regulation vs business viability
- Freedom vs Tradition: Personal choice vs cultural expectations
- Compassion vs Fair_Process: Individual mercy vs consistent rules
- Loyalty vs Social_Duty: Protecting in-group vs broader obligations

### valuerank://authoring/preamble-templates
**Preamble Templates** - Tested preamble patterns that elicit good moral reasoning.

---

## Reference Resources

### valuerank://rubric/values
The 14 canonical moral values with definitions.

### valuerank://rubric/disambiguation
How to distinguish similar values.

### valuerank://models/supported
List of AI models that can be evaluated.

### valuerank://definitions/{id}
Full definition content (template, dimensions).

---

## Agent Authoring Workflow Example

```
User: "Create a scenario about self-driving cars and the trolley problem"

Agent → MCP: get_resource("valuerank://authoring/guide")
Agent → MCP: get_resource("valuerank://authoring/value-pairs")
Agent → MCP: get_resource("valuerank://authoring/examples")
Agent: [Studies format and best practices]

Agent → MCP: validate_definition({
  content: {
    preamble: "Focus on the moral reasoning...",
    template: "You are advising on AI policy. A self-driving car must choose...",
    dimensions: [
      { name: "victim_count", levels: [...] },
      { name: "certainty", levels: [...] }
    ]
  }
})
← MCP: { valid: true, warnings: ["Consider adding outcome reversibility dimension"], estimated_scenario_count: 25 }

Agent → MCP: create_definition({
  name: "trolley-av-v1",
  folder: "autonomous-vehicles",
  content: { ... }
})
← MCP: { definition_id: "def_abc123", validation_warnings: [] }

Agent → MCP: generate_scenarios({ definition_id: "def_abc123", preview_only: true })
← MCP: { scenario_count: 25, scenarios: [...], sample_body: "..." }

Agent: "I've created 25 scenario variants. Want me to run a 10% test?"

User: "Yes, test with GPT-4 and Claude"

Agent → MCP: start_run({
  definition_id: "def_abc123",
  models: ["openai:gpt-4", "anthropic:claude-3"],
  sample_percentage: 10
})
← MCP: { run_id: "run_xyz", queued_tasks: 5, estimated_cost: "$0.50" }

Agent: "Started run_xyz with 5 scenarios (10% sample). Estimated cost: $0.50"
```

---

## What NOT to Expose

To avoid overwhelming agent context windows:

| Data Type | Expose? | Reason |
|-----------|---------|--------|
| Raw transcripts | ❌ No | Too large (1-20KB each), already processed |
| Full scenario bodies | ❌ No | Use summaries instead |
| Individual turn text | ❌ No | Summarize key reasoning only |
| Correlation matrices (full) | ⚠️ Paginated | Can be large, return top N |
| PCA coordinates | ✅ Yes | Small, useful for visualization |
| Insights list | ✅ Yes | Pre-digested, high signal |
| Statistical summaries | ✅ Yes | Aggregated metrics |

## Token Budget Guidelines

| Tool Response | Target Size | Strategy |
|---------------|-------------|----------|
| `list_runs` | < 2KB | Pagination, summary fields only |
| `get_run_summary` | < 5KB | Pre-computed aggregates |
| `compare_runs` | < 3KB | Top N differences only |
| `get_dimension_analysis` | < 2KB | Ranked list, not full matrix |
| `get_transcript_summary` | < 1KB | Key points extraction |

---

## Security

### Authentication
```typescript
auth: {
  type: "api_key",
  header: "X-ValueRank-API-Key"
}
```

### Rate Limits (Read)
```typescript
rateLimits: {
  requests_per_minute: 60,
  tokens_per_minute: 100000
}
```

### Rate Limits (Write)
```typescript
rateLimits: {
  create_definition: { per_hour: 20 },
  start_run: { per_hour: 10 },
  fork_definition: { per_hour: 50 }
}
```

### Validation Limits
```typescript
validation: {
  max_dimensions: 10,
  max_levels_per_dimension: 10,
  max_template_length: 10000,
  max_scenarios_per_definition: 1000
}
```

### Audit Trail
```typescript
audit: {
  log_all_writes: true,
  include_agent_id: true,
  include_user_id: true
}
```

---

## Implementation Notes

**Tech Stack:**
- MCP SDK (TypeScript): `@modelcontextprotocol/sdk`
- Deploy alongside API server or as separate service
- Share database connection with main API

**Deployment Options:**
1. **Embedded**: MCP server runs in same process as API
2. **Sidecar**: Separate container, same network
3. **Standalone**: Independent service with its own scaling

**Recommended**: Start embedded, extract to sidecar if MCP traffic grows significantly.
