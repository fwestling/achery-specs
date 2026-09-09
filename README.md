# achery-specs

Product specification format, rules, and process shared across Achery projects
(Mandrel, Skein, Fulcrum, achery-ui, …).

Each project keeps its own `specs/` directory at the repo root. Spec content
does not cross project boundaries — some duplication is preferred over drift
from a shared vocabulary.

This repo distributes:

- **Templates** for the three spec types (`templates/`)
- **Rules** to drop into each project's `specs/CLAUDE.md` (`rules/`)
- **Process** docs: backfill brief, dev workflow, interview script (`process/`)

## The model

Three spec types:

- **Capabilities** — atomic "the product does X" statements with testable
  acceptance criteria. The unit tests, code, and marketing copy key off.
- **Journeys** — multi-step flows that compose capabilities.
- **Constraints** — non-functional requirements that are actually specified
  ("must remain usable offline for 7 days", "sync must land within 60s"). Skip
  aspirational stuff like "should feel fast" — that's just good practice.

Component-library projects (achery-ui, and any others) use the same
capability template. Read "consumer developer" wherever the template says
"user", and "documentation copy" wherever it says "marketing copy".

## Initialising `specs/` in a project

1. Create `<project>/specs/` at the repo root.
2. Copy `rules/CLAUDE.md` → `<project>/specs/CLAUDE.md`.
3. Copy `templates/*.md` → `<project>/specs/.templates/` (each project
   vendors its own copies — accepted drift; see rationale below).
4. Create `<project>/specs/capabilities/`, `<project>/specs/journeys/`,
   `<project>/specs/constraints/` as they become needed.
5. Point agents at `specs/CLAUDE.md`; they'll do the rest.

## Why per-project template copies

Sharing templates from this repo at runtime introduces two problems:
one more place agents have to check, and drift risk if this repo updates
without a project pulling. Per-project copies mean the specs of a project
always match the template it was written against. When a template genuinely
changes, we update projects deliberately.

## Roadmap

- **v0 (this)** — templates, rules, process docs. Markdown only.
- **v1** — indexer/validator CLI: parse specs, cross-check criterion references,
  build coverage map from `// @spec` markers.
- **v2** — React `<SpecBrowser />` component (achery-ui styled) that any
  project can embed to render its own specs + coverage.

v1 lands after we've applied v0 to at least one project (Mandrel) and
confirmed the format survives contact with reality.

## Repo layout

```
achery-specs/
  README.md
  templates/
    capability.md
    journey.md
    constraint.md
  rules/
    CLAUDE.md              # drop into <project>/specs/CLAUDE.md
  process/
    backfill-agent.md      # brief for the backfill agent
    interview.md           # question script for Phase 3 of backfill
    workflow.md            # how spec authorship interleaves with dev
```
