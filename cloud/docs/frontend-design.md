# Frontend Design

> Part of [Cloud ValueRank Architecture](./architecture-overview.md)

## Recommendation: React + TypeScript + Vite

The existing DevTool provides a solid foundation. Same tech stack for Cloud.

## New Features Needed

1. **Authentication**: User accounts, API keys management
2. **Run Dashboard**: List runs with status, progress bars
3. **Queue Controls**: Pause/resume/cancel buttons
4. **Real-time Progress**: WebSocket-driven updates
5. **Transcript Viewer**: Browse and search transcripts
6. **Deep Analysis**: PCA visualization, outlier detection, correlation matrices
7. **Run Comparison**: Side-by-side delta analysis, divergence highlighting
8. **Experiment Management**: Create experiments, track hypothesis, group related runs
9. **Sampled Runs**: Configure sample %, view confidence intervals, expand to full
10. **Multi-tenancy**: Workspace/organization support (future)

## Component Architecture

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── ApiKeyManager.tsx
│   ├── scenarios/
│   │   ├── ScenarioEditor.tsx      # (from DevTool)
│   │   ├── ScenarioGenerator.tsx   # (from DevTool)
│   │   └── ScenarioList.tsx
│   ├── runs/
│   │   ├── RunDashboard.tsx        # NEW: List all runs
│   │   ├── RunProgress.tsx         # NEW: Real-time progress
│   │   ├── RunControls.tsx         # NEW: Pause/resume/cancel
│   │   ├── RunConfig.tsx           # NEW: Sample %, model selection
│   │   └── TranscriptViewer.tsx    # NEW: Browse transcripts
│   ├── analysis/
│   │   ├── DeepAnalysis.tsx        # Port from DevTool + enhancements
│   │   ├── PCAVisualization.tsx    # Model positioning chart
│   │   ├── CorrelationMatrix.tsx   # Dimension × model heatmap
│   │   ├── OutlierDetection.tsx    # Multi-method outlier display
│   │   └── InsightsList.tsx        # Auto-generated findings
│   ├── comparison/
│   │   ├── RunComparison.tsx       # Side-by-side delta view
│   │   ├── DeltaChart.tsx          # Visualize differences
│   │   └── DivergenceTable.tsx     # Most divergent scenarios
│   ├── experiments/
│   │   ├── ExperimentList.tsx      # All experiments
│   │   ├── ExperimentDetail.tsx    # Runs within experiment
│   │   └── HypothesisTracker.tsx   # Track experiment outcomes
│   ├── queue/
│   │   ├── QueueStatus.tsx         # NEW: Global queue stats
│   │   └── QueueControls.tsx       # NEW: Global pause/resume
│   └── settings/
│       └── RuntimeConfig.tsx       # (from DevTool)
├── hooks/
│   ├── useWebSocket.ts             # NEW: Real-time updates
│   └── useQueue.ts                 # NEW: Queue operations
└── api/
    └── client.ts                   # API client with auth
```

## State Management

For real-time updates and complex state, consider:
- **Zustand** (lightweight) or **TanStack Query** (server state)
- WebSocket integration for live updates
- Optimistic updates for queue operations

## Key UI Flows

### Run Creation Flow
1. Select definition (with version tree browser)
2. Choose models to evaluate
3. Configure sampling (10%, 50%, 100%)
4. Review estimated cost
5. Start run → redirect to progress view

### Analysis Flow
1. View run dashboard
2. Select completed run
3. View basic analysis (instant)
4. Trigger deep analysis (10-30s, async)
5. Explore PCA, correlations, outliers
6. Read LLM-generated summary

### Comparison Flow
1. Select baseline run
2. Select comparison run (or create variant)
3. View delta analysis
4. Highlight most divergent scenarios
5. Statistical significance indicators

## Components from DevTool to Reuse

- `ScenarioEditor` - Definition authoring
- `ScenarioGenerator` - AI-assisted generation
- `DeepAnalysis` - Statistical analysis views
- Chart components (Recharts-based)

## Components to Build New

- Authentication (Supabase Auth integration)
- Run management (dashboard, progress, controls)
- Comparison views
- Experiment management
- Version tree visualization
