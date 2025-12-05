# Deployment & Operations

> Part of [Cloud ValueRank Architecture](./architecture-overview.md)

## Recommended Stack for MVP

| Component | Service | Cost Model |
|-----------|---------|------------|
| Database | Supabase (PostgreSQL + Auth + Realtime) | Free tier → $25/mo |
| Queue | Upstash Redis (serverless) | Pay-per-request |
| API | Vercel or Railway | Free tier available |
| Workers | Railway or Render | ~$7/mo per worker |
| Frontend | Vercel | Free tier |

## Scaling Path

1. **MVP**: Single worker, shared Redis, free database tier
2. **Growth**: Multiple workers, dedicated Redis, larger DB
3. **Scale**: Kubernetes workers, Redis cluster, sharded DB

---

## Export Strategy (CLI Compatibility)

A key requirement is the ability to dump the database back to files compatible with the CLI tool.

### Export Mapping

| Cloud Schema | CLI Format | Export Strategy |
|--------------|-----------|-----------------|
| `transcripts.content` | `transcript.*.md` | Store raw markdown verbatim; export as-is |
| `runs` table | `run_manifest.yaml` | Serialize JSONB columns to YAML |
| `scenarios` table | `exp-*.yaml` | Serialize JSONB to YAML |
| `definitions.content` | `exp-*.md` | **Requires markdown serializer** |

### Definition Markdown Serializer

```python
def serialize_definition_to_md(definition: dict) -> str:
    """Convert JSONB definition to CLI-compatible markdown."""
    lines = []

    # YAML frontmatter
    lines.append("---")
    lines.append(f"name: {definition['name']}")
    lines.append(f"base_id: {definition['base_id']}")
    if definition.get('category'):
        lines.append(f"category: {definition['category']}")
    lines.append("---\n")

    # Preamble section
    lines.append("# Preamble")
    lines.append(definition['preamble'])
    lines.append("")

    # Template section
    lines.append("# Template")
    lines.append(definition['template'])
    lines.append("")

    # Dimensions as markdown tables
    lines.append("# Dimensions")
    for dim in definition.get('dimensions', []):
        lines.append(f"## {dim['name']}")
        lines.append("| Score | Label | Options |")
        lines.append("|-------|-------|---------|")
        for level in dim['levels']:
            opts = ", ".join(level['options'])
            lines.append(f"| {level['score']} | {level['label']} | {opts} |")
        lines.append("")

    # Matching rules (if any)
    if definition.get('matching_rules'):
        lines.append("# Matching Rules")
        lines.append(definition['matching_rules'])

    return "\n".join(lines)
```

### Export API Endpoints

```
POST /api/export/run/:id
  → Downloads ZIP containing:
     ├── run_manifest.yaml
     ├── scenarios/
     │   └── exp-*.yaml
     └── transcripts/
         └── transcript.*.md

POST /api/export/definition/:id
  → Downloads definition as .md file (with all version ancestry if requested)

POST /api/export/workspace
  → Full workspace export (all definitions + runs)
```

### Round-Trip Guarantee

To ensure CLI compatibility:
1. **Store transcripts verbatim** - don't parse/restructure the markdown
2. **Store scenarios as generated** - keep the exact YAML structure
3. **Test export/import cycle** - import exported data back, verify identical behavior

---

## Data Volume Estimates

Based on current ValueRank usage:

| Data Type | Size per Run | Retention |
|-----------|--------------|-----------|
| Run metadata | ~10 KB | Forever |
| Transcripts | ~500 KB - 5 MB | 90 days |

For 100 runs/month with ~50 scenarios × 6 models each:
- Storage: ~50 GB/year (mostly transcripts)
- Documents: ~30,000/month

---

## Open Questions

1. **Multi-tenancy**: Do we need separate workspaces/organizations from day one?
2. **API Keys**: Where do users store their LLM API keys? (Server-side vs client-side)
3. **Cost Tracking**: Do we track and display LLM costs per run?
4. **Persistence of Transcripts**: How long do we retain full transcript data?
5. **Export/Import**: Do users need to export runs to local files?
6. **Version Labeling**: Auto-increment (v1, v1.1, v1.1.1) or user-defined labels?
7. **Fork Visibility**: Can users fork from others' definitions, or only their own?
8. **Diff Display**: How do we visualize changes between definition versions in the UI?

---

## Next Steps

1. **Supabase Setup**: Create project, define initial schema with versioning tables
2. **Queue Prototype**: Build BullMQ proof-of-concept with single worker
3. **Version Tree UI**: Design component for visualizing definition lineage
4. **API Schema**: Define OpenAPI spec for all endpoints (including fork/version operations)
5. **Auth Strategy**: Leverage Supabase Auth or add Clerk/Auth0
6. **DevTool Migration**: Identify components to reuse vs rewrite
