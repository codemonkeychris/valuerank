# API & Queue System

> Part of [Cloud ValueRank Architecture](./architecture-overview.md)

## Overview

Since the primary workload is **long-running AI tasks** (minutes to hours), we need:

1. **Task Queue**: Durable, persistent queue for AI operations
2. **Workers**: Processes that execute tasks (call LLMs, process responses)
3. **Progress Tracking**: Real-time updates to clients
4. **Queue Management**: Pause, resume, cancel, retry capabilities

## Recommended Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Queue** | BullMQ (Redis) or AWS SQS | Mature, pausable, priority support |
| **Workers** | Node.js or Python workers | Match existing LLM adapter code |
| **API** | Express or Fastify | Lightweight, WebSocket support |
| **Real-time** | WebSockets or SSE | Progress updates to UI |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   API       │────▶│   Queue     │
│   (React)   │◀────│   Server    │◀────│   (Redis)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           │              ┌─────┴─────┐
                           │              ▼           ▼
                           │        ┌─────────┐ ┌─────────┐
                           │        │ Worker  │ │ Worker  │
                           │        │   1     │ │   2     │
                           └───────▶└─────────┘ └─────────┘
                         (status)         │           │
                                          ▼           ▼
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

## Queue Management API

```
POST /api/queue/runs              # Start a new run (enqueue all tasks)
GET  /api/queue/runs/:id          # Get run status and progress
POST /api/queue/runs/:id/pause    # Pause all tasks for run
POST /api/queue/runs/:id/resume   # Resume paused run
POST /api/queue/runs/:id/cancel   # Cancel and remove pending tasks
DELETE /api/queue/runs/:id        # Delete run and all associated data

GET  /api/queue/status            # Global queue stats
POST /api/queue/pause             # Pause entire queue (all runs)
POST /api/queue/resume            # Resume entire queue
```

## WebSocket Events

```
ws://api/runs/:id/progress
  → { type: "task_complete", scenario_id, model, progress: "45/120" }
  → { type: "task_failed", scenario_id, model, error: "..." }
  → { type: "run_complete" }
```

## BullMQ Implementation

BullMQ provides:
- **Pause/Resume**: Built-in queue pause without losing jobs
- **Priority**: Run urgent jobs first
- **Retry**: Configurable retry with backoff
- **Rate Limiting**: Respect LLM provider limits
- **Progress**: Job-level progress tracking
- **Events**: Real-time job lifecycle events

```javascript
// Example: Creating a run
const queue = new Queue('valuerank');

async function startRun(runConfig) {
  const run = await db.runs.insert(runConfig);

  for (const scenario of scenarios) {
    for (const model of runConfig.target_models) {
      await queue.add('probe:scenario', {
        run_id: run.id,
        scenario_id: scenario.id,
        model: model
      }, {
        priority: 1,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
    }
  }

  return run;
}
```

---

## Analysis Processing

The deep analysis is computationally heavy (10-30s) and includes:
- PCA for model positioning
- Outlier detection (Mahalanobis, Isolation Forest, Jackknife)
- Pearson correlations across dimensions
- Inter-model agreement matrices
- LLM-generated narrative summaries

### Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                      Analysis Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────────────────┐ │
│   │ Basic    │───▶│ Cache    │───▶│ Return cached result │ │
│   │ Analysis │    │ Check    │    └──────────────────────┘ │
│   │ Request  │    └────┬─────┘                              │
│   └──────────┘         │ miss                               │
│                        ▼                                     │
│   ┌──────────┐    ┌──────────┐    ┌──────────────────────┐ │
│   │ Deep     │───▶│ Queue    │───▶│ Python Worker        │ │
│   │ Analysis │    │ Job      │    │ (dedicated compute)  │ │
│   │ Request  │    └──────────┘    └──────────┬───────────┘ │
│   └──────────┘                               │              │
│                                              ▼              │
│                                    ┌──────────────────────┐ │
│                                    │ Store in analysis    │ │
│                                    │ results table        │ │
│                                    └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Caching Strategy

- Hash transcript content to detect changes
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

### Comparison API

```
POST /api/runs/compare
  body: { baseline_run_id, comparison_run_id }
  → Queues analyze:compare job
  → Returns comparison_id

GET /api/runs/:id/comparisons
  → List all comparisons involving this run

GET /api/comparisons/:id
  → Get comparison results (delta analysis)

POST /api/experiments
  body: { name, hypothesis, baseline_run_id }
  → Create experiment container

POST /api/experiments/:id/runs
  body: { changes: { models: [...] } }
  → Create variant run within experiment
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
