# API & Queue System

> Part of [Cloud ValueRank Architecture](./architecture-overview.md)
>
> See also: [Product Specification](./product-spec.md) for context on these decisions

## Overview

Since the primary workload is **long-running AI tasks** (minutes to hours), we need:

1. **Task Queue**: Durable, persistent queue for AI operations
2. **Workers**: Processes that execute tasks (call LLMs, process responses)
3. **Progress Tracking**: Polling-based updates to clients (5-second intervals)
4. **Queue Management**: Pause, resume, cancel, retry capabilities

## Recommended Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **API** | GraphQL (Yoga or Apollo) | Flexible queries for MCP, schema introspection for LLMs |
| **Queue** | PgBoss (PostgreSQL) | Same DB as app data, no Redis needed, transactional |
| **Workers** | Python workers (separate container) | Reuse existing pipeline code, AI tooling flexibility |
| **Progress** | HTTP polling (5s intervals) | Simpler than WebSockets, sufficient for UX |

### Why GraphQL over REST

1. **MCP/LLM integration** - LLMs can introspect the schema and construct precise queries
2. **Flexible data fetching** - Get exactly what's needed, no over-fetching (critical for token budgets)
3. **Nested relationships** - Definition → runs → transcripts → analysis in one query
4. **Single endpoint** - Simpler auth, simpler MCP integration
5. **Schema as contract** - Strong typing, auto-generated TypeScript types

## Architecture

```
┌─────────────┐     ┌─────────────────────────────────┐
│   Frontend  │────▶│   GraphQL API (Yoga/Apollo)     │
│   (React)   │◀────│   POST /graphql                 │
└─────────────┘     └──────────────┬──────────────────┘
                                   │
┌─────────────┐                    │
│  Local LLM  │────────────────────┤  (same endpoint)
│  via MCP    │                    │
└─────────────┘                    │
                                   │
            ┌──────────────────────┼──────────────┐
            ▼                      ▼              ▼
      ┌───────────┐  ┌─────────────────┐  ┌───────────────────────┐
      │ PostgreSQL│  │   DataLoaders   │  │   Python Workers      │
      │ + PgBoss  │◀─│   (N+1 prevention)│ │   (separate container)│
      └───────────┘  └─────────────────┘  └──────────┬────────────┘
                                                      │
                                                      ▼
                                          ┌─────────────────────┐
                                          │   LLM Providers     │
                                          │ (OpenAI, Anthropic) │
                                          └─────────────────────┘
```

## Job Types

```
- probe:scenario      # Send single scenario to single model
- summarize:run       # Generate natural language summary
- analyze:basic       # Fast aggregation (~500ms)
- analyze:deep        # Heavy statistical analysis (10-30s)
- analyze:compare     # Cross-run comparison
```

## GraphQL Schema (Core Types)

```graphql
type Query {
  # Definitions
  definition(id: ID!): Definition
  definitions(folder: String, includeChildren: Boolean): [Definition!]!

  # Runs
  run(id: ID!): Run
  runs(definitionId: ID, experimentId: ID, status: RunStatus, limit: Int): [Run!]!

  # Experiments
  experiment(id: ID!): Experiment
  experiments(limit: Int): [Experiment!]!

  # Queue status
  queueStatus: QueueStatus!
}

type Mutation {
  # Definitions
  createDefinition(input: CreateDefinitionInput!): Definition!
  forkDefinition(parentId: ID!, name: String!, changes: JSON): Definition!

  # Runs
  startRun(input: StartRunInput!): Run!
  pauseRun(id: ID!): Run!
  resumeRun(id: ID!): Run!
  cancelRun(id: ID!): Run!

  # Experiments
  createExperiment(input: CreateExperimentInput!): Experiment!

  # Queue
  pauseQueue: QueueStatus!
  resumeQueue: QueueStatus!
}

type Definition {
  id: ID!
  name: String!
  versionLabel: String
  parentId: ID
  parent: Definition
  children: [Definition!]!
  content: JSON!
  createdAt: DateTime!
  runs: [Run!]!
}

type Run {
  id: ID!
  status: RunStatus!
  definition: Definition!
  experiment: Experiment
  config: JSON!
  progress: RunProgress!
  transcripts(model: String, limit: Int): [Transcript!]!
  analysis: Analysis
  createdAt: DateTime!
}

type RunProgress {
  total: Int!
  completed: Int!
  failed: Int!
}

type Analysis {
  basicStats: JSON!
  modelAgreement: JSON!
  dimensionAnalysis: JSON
  mostContestedScenarios(limit: Int): [ContestedScenario!]!
}
```

## Example Queries

**Get run with nested data (single request):**
```graphql
query GetRunDetails($id: ID!) {
  run(id: $id) {
    status
    progress { total completed failed }
    definition { name versionLabel }
    experiment { name hypothesis }
    analysis {
      modelAgreement
      mostContestedScenarios(limit: 5) {
        scenarioId
        variance
      }
    }
  }
}
```

**MCP-style flexible query:**
```graphql
query MCPAnalysis($runId: ID!, $model: String!) {
  run(id: $runId) {
    transcripts(model: $model, limit: 10) {
      scenarioId
      turnCount
      wordCount
    }
    analysis {
      basicStats
      dimensionAnalysis
    }
  }
}
```

## Queue Operations (Mutations)

```graphql
# Start a new run
mutation StartRun($input: StartRunInput!) {
  startRun(input: $input) {
    id
    status
    progress { total }
  }
}

# Pause/resume/cancel
mutation PauseRun($id: ID!) {
  pauseRun(id: $id) { id status }
}
```

## Progress Polling

Frontend polls for updates every 5 seconds using GraphQL:

```graphql
query PollRunProgress($id: ID!) {
  run(id: $id) {
    id
    status
    progress { total completed failed }
    recentTasks(limit: 5) {
      scenarioId
      model
      status
      error
    }
    updatedAt
  }
}
```

**Why polling over subscriptions:**
- Simpler implementation (no WebSocket connection management)
- Easier debugging (standard HTTP POST)
- Sufficient for progress updates (5s latency acceptable)
- Can add GraphQL subscriptions later if UX demands real-time

## PgBoss Implementation

PgBoss provides:
- **PostgreSQL-backed**: Uses same database as application data
- **Transactional**: Job creation can be part of a transaction with other data
- **Pause/Resume**: Built-in queue pause without losing jobs
- **Priority**: Run urgent jobs first
- **Retry**: Configurable retry with exponential backoff
- **Scheduling**: Delayed jobs, cron-like scheduling
- **Events**: Job lifecycle events via polling or pub/sub

**Why PgBoss over Redis/BullMQ?**
- One less service to manage (no Redis)
- Job data is transactionally consistent with application data
- Easier to query job history with SQL
- For hundreds to low thousands of jobs, PostgreSQL handles it easily

---

## Worker Architecture: TypeScript Orchestrator + Python

TypeScript manages the queue (native PgBoss), spawns Python for heavy computation.

```
┌─────────────────────────────────────────────────────────────────┐
│                    TypeScript Orchestrator                       │
│                    (runs in API process or separate)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │ PgBoss       │     │ Job Handler  │     │ Job Handler  │   │
│   │ .work()      │────▶│ probe:scenario────▶│ analyze:run  │   │
│   └──────────────┘     └──────┬───────┘     └──────┬───────┘   │
│                               │                     │           │
│                               ▼                     ▼           │
│                        ┌─────────────────────────────────┐      │
│                        │     spawnPython(script, input)  │      │
│                        │     - JSON via stdin            │      │
│                        │     - JSON result via stdout    │      │
│                        └─────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Python Worker Scripts                         │
│                    (stateless, fast startup)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   workers/                                                       │
│   ├── probe.py          # Send scenario to LLM, return response │
│   ├── analyze_basic.py  # Tier 1: win rates, basic stats        │
│   ├── analyze_deep.py   # Tier 2+: correlations, PCA            │
│   └── common/                                                    │
│       ├── llm_adapters.py   # Shared LLM provider logic         │
│       └── config.py         # Read shared provider config       │
└─────────────────────────────────────────────────────────────────┘
```

### TypeScript Orchestrator Code

```typescript
import PgBoss from 'pg-boss';
import { spawnPython } from './spawn';

const boss = new PgBoss(process.env.DATABASE_URL);
await boss.start();

// Register job handlers
await boss.work('probe:scenario', async (job) => {
  const result = await spawnPython('workers/probe.py', job.data);

  // Save transcript to database
  await db.transcripts.create({
    run_id: job.data.run_id,
    scenario_id: job.data.scenario_id,
    model: job.data.model,
    content: result.transcript,
    turns: result.turns,
    turn_count: result.turn_count,
  });

  // Update run progress
  await db.runs.incrementProgress(job.data.run_id);
});

await boss.work('analyze:basic', async (job) => {
  const result = await spawnPython('workers/analyze_basic.py', job.data);
  await db.analysis_results.upsert({
    run_id: job.data.run_id,
    analysis_type: 'basic',
    basic_stats: result.basic_stats,
    // ...
  });
});
```

### Python Script Contract

```python
# workers/probe.py
import json
import sys
from common.llm_adapters import get_adapter

def main():
    # Read input from stdin
    input_data = json.load(sys.stdin)

    # Do the work
    adapter = get_adapter(input_data['model'])
    response = adapter.send_scenario(
        scenario=input_data['scenario'],
        config=input_data['config']
    )

    # Write result to stdout
    result = {
        'transcript': response.transcript,
        'turns': response.turns,
        'turn_count': len(response.turns),
    }
    json.dump(result, sys.stdout)

if __name__ == '__main__':
    main()
```

### spawnPython Utility

```typescript
// spawn.ts
import { spawn } from 'child_process';

export async function spawnPython<T>(
  script: string,
  input: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [script]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python exited ${code}: ${stderr}`));
      } else {
        resolve(JSON.parse(stdout));
      }
    });

    // Send input
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}
```

### Benefits of This Pattern

| Benefit | Explanation |
|---------|-------------|
| Native PgBoss | TypeScript gets full PgBoss API (retries, backoff, events) |
| Python ecosystem | Keep numpy, pandas, scipy for analysis |
| Flexible | Can add TypeScript-only workers for lightweight tasks |
| Debuggable | JSON in/out is easy to inspect and test |
| Stateless Python | Scripts are simple, no daemon management |
| Single queue impl | No duplicate queue logic in Python |

---

## Analysis Processing

Analysis is split into tiers with different trigger strategies:

| Tier | Contents | Trigger | Latency |
|------|----------|---------|---------|
| **Tier 1 (Basic)** | Win rates, per-model scores, basic stats | Auto on run complete | ~1s |
| **Tier 2 (Correlations)** | Inter-model agreement, dimension impact | On-demand when viewed | ~5s |
| **Tier 3 (Deep)** | PCA, outlier detection, LLM summaries | On-demand, queued job | ~30s |

### Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                      Analysis Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   RUN COMPLETES                                              │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ Tier 1: Auto-triggered                                │  │
│   │ - analyze:basic job queued immediately               │  │
│   │ - Results ready within seconds                       │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   USER VIEWS ANALYSIS                                        │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ Tier 2: On-demand                                     │  │
│   │ - Check cache (input_hash)                           │  │
│   │ - If miss: compute inline or queue analyze:deep      │  │
│   │ - Return loading state, poll for completion          │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   USER REQUESTS DEEP ANALYSIS                                │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ Tier 3: Queued job                                    │  │
│   │ - analyze:deep job with lower priority               │  │
│   │ - PCA, outliers, LLM summary                         │  │
│   │ - User sees "Analysis in progress..."                │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Why Hybrid Triggers?

- **Sets user expectations**: Some results are instant, some require waiting
- **Controls compute costs**: Heavy analysis only runs when needed
- **Prepares for future**: As we add more expensive analysis, the pattern scales

### Caching Strategy

- Hash transcript content to detect changes (`input_hash`)
- Return cached results if hash matches
- Auto-invalidate when new transcripts added to run
- Allow manual re-analysis trigger

---

## Run Comparison & Experimentation

A key workflow is running experiments where you change one variable and compare results:

```
Experiment: "How does model selection affect safety scores?"

  run_A (baseline)           run_B (experiment)
  ├── definition: v1.2       ├── definition: v1.2      ← same
  ├── models: [gpt-4, claude]├── models: [gpt-4, gemini] ← changed
  ├── scenarios: 100%        ├── scenarios: 100%       ← same
  └── results: {...}         └── results: {...}
                    ↓
            comparison_result:
            - gemini vs claude delta
            - which scenarios diverged most
            - statistical significance
```

### Comparison API (GraphQL)

```graphql
type Query {
  comparison(id: ID!): RunComparison
  comparisons(runId: ID): [RunComparison!]!
}

type Mutation {
  compareRuns(baselineRunId: ID!, comparisonRunId: ID!): RunComparison!
}

type RunComparison {
  id: ID!
  baselineRun: Run!
  comparisonRun: Run!
  deltaByModel: JSON!
  mostChangedScenarios(limit: Int): [ScenarioDelta!]!
  statisticalSignificance: JSON
  whatChanged: ComparisonDiff!
}

# Example query
query GetComparison($id: ID!) {
  comparison(id: $id) {
    baselineRun { id definition { name } }
    comparisonRun { id definition { name } }
    deltaByModel
    mostChangedScenarios(limit: 5) {
      scenarioId
      baselineScore
      comparisonScore
      delta
    }
  }
}
```

---

## Partial / Sampled Runs

For cost control and rapid iteration, support running only a percentage of scenarios.

### Use Cases

- **10% test run**: Quick sanity check before full run (~$5 vs ~$50)
- **Progressive rollout**: Start with 10%, expand to 50%, then 100%
- **A/B sampling**: Same scenarios, different models

### Sampling Logic

```python
def select_scenarios(all_scenarios: list, percentage: int, seed: int) -> list:
    """Deterministic sampling for reproducibility."""
    import random
    random.seed(seed)

    n = max(1, len(all_scenarios) * percentage // 100)
    return random.sample(all_scenarios, n)

# Same seed + same percentage = same scenarios selected
# Allows apples-to-apples comparison across sampled runs
```

### Run Creation with Sampling

```
POST /api/queue/runs
  body: {
    definition_id: "...",
    models: ["gpt-4", "claude-3"],
    sample_percentage: 10,        # Optional: default 100
    sample_seed: 42               # Optional: random if not provided
  }
```

### Extrapolation Warning

When viewing results from sampled runs, UI should clearly indicate:
- "Based on 10% sample (12 of 120 scenarios)"
- Statistical confidence intervals for extrapolated metrics
- Option to "Expand to full run" (queues remaining 90%)
