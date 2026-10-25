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
- **The `achery-specs` CLI** (npm), which indexes and validates a project's
  `specs/` and builds a coverage map from `@spec` test tags (`src/`)

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
5. Add the CLI: `pnpm add -D achery-specs`, then a
   `"spec:check": "achery-specs check"` script. Wire it into CI once every
   `shipped` spec's criteria are tagged.
6. Point agents at `specs/CLAUDE.md`; they'll do the rest.

## The CLI

```sh
achery-specs check [--missing] [--json]  # validate + coverage; exit 1 on errors
achery-specs write                       # regenerate every "Verified by" section
achery-specs index [--out index.json]    # full index as JSON (for tooling, and v2)
achery-specs next SYNC                   # next unused criterion ID for a prefix
```

Run from the project root (or pass `--root <dir>`). Exit codes: 0 clean (warnings
allowed), 1 errors found, 2 usage or config error.

### What it reads

- Specs: `specs/capabilities/<area>/<slug>.md`, `specs/journeys/<slug>.md` and
  `specs/constraints/<slug>.md`. Other markdown under `specs/` (`CLAUDE.md`,
  gap lists, notes) is ignored.
- Template shape: the project's own `specs/.templates/*.md` when present (a
  project's specs follow the templates they were written against), otherwise
  the copies bundled with the package. Required frontmatter keys and `##`
  sections come from the template.
- Tags: `@spec` directly after a comment opener (`//`, `#`, `/*`, `{/*`, `--`)
  in test files. Default globs cover `*.test.*`/`*.spec.*` (TS/JS),
  `*_test.{gd,py,go}` and `test_*.py`, skipping `node_modules`, `dist`, `build`,
  `coverage`, dot-directories and `specs/`.

### Configuration

Optional `specs/achery-specs.json`:

```json
{
  "tests": ["apps/**/*.test.{ts,tsx}", "packages/godot-addon/tests/*_test.gd"],
  "ignore": ["apps/legacy/**"]
}
```

`tests` replaces the default globs; `ignore` adds to the default ignores.

### Checks

Errors (fail `check`):

| Code | Meaning |
| --- | --- |
| `frontmatter` | Missing, unterminated or invalid YAML frontmatter |
| `layout` | Spec at the wrong depth (capabilities need an area directory; journeys and constraints are flat) |
| `missing-field` | A frontmatter key from the template is absent |
| `id-mismatch`, `invalid-slug`, `duplicate-slug` | `id` must be kebab-case, equal the filename, and be unique |
| `missing-title`, `invalid-status`, `invalid-kind`, `invalid-prefix` | Frontmatter values outside the format |
| `missing-since` | `shipped` without a real `since` version |
| `missing-section`, `unknown-section`, `duplicate-section`, `section-order` | `##` sections must match the template (Marketing copy is optional and may be called Documentation copy) |
| `stray-criterion` | A bold criterion ID that isn't a `- **ID** — …` list item |
| `misplaced-criterion` | A criterion defined outside Acceptance/Success criteria |
| `prefix-mismatch` | A criterion that doesn't use its spec's `prefix:` |
| `duplicate-criterion` | The same ID defined twice (prefix pools are project-wide) |
| `unknown-slug`, `wrong-slug-type` | `related`/`supersedes`/`capabilities`/`scope` naming a missing spec, or the wrong type (`capabilities` takes capabilities; `scope` takes capabilities, journeys or `all`) |
| `undefined-ref` | A reference to an undefined criterion: always when backticked or in a `refs:` list, otherwise only when the prefix is a real one (so "UTF-8" is fine) |
| `malformed-tag`, `unresolved-tag`, `tag-slug-mismatch` | A `@spec` tag that doesn't parse, doesn't resolve, or names the wrong spec |
| `untested-shipped` | A `shipped` spec with a live criterion that no test tags and no manual marker covers |
| `malformed-manual` | A `_(manual: …)_` marker with no method, or not at the end of the criterion line |
| `stale-verified` | A "Verified by" section that doesn't match the tags (run `write`) |

Warnings (reported, don't fail): `unknown-field`, `no-criteria`,
`deprecated-ref` and `deprecated-tag` (a reference or tag pointing at a struck-through
criterion, or one in a `deprecated` spec).

HTML comments and fenced code are ignored when finding criteria and references,
so template guidance, `KNOWN GAP` notes and examples never trip a check.

A criterion no test can check (a process rule, an on-device check) ends with
`_(manual: <method>)_`, e.g. `- **PARITY-6** — … _(manual: spec review)_`. It
counts as covered without a tag, and "Verified by" lists `manual: <method>`
for it, so a hand check never reads as a test. A tag takes precedence over
the marker. The report counts these separately ("+N verified manually"), and
the index carries them as `coverage[].manual` and `summary.manual`.

Deprecated criteria (`- ~~**SYNC-7**~~ (deprecated: …)`) keep their ID in the
numbering pool, but don't count towards coverage and need no tests.

### Library

The same index is available programmatically, for v2's `<SpecBrowser />` and
other tooling:

```ts
import { buildIndex } from 'achery-specs'
const index = buildIndex({ root: process.cwd() }) // specs, criteria, tags, coverage, problems
```

## Why per-project template copies

Sharing templates from this repo at runtime introduces two problems:
one more place agents have to check, and drift risk if this repo updates
without a project pulling. Per-project copies mean the specs of a project
always match the template it was written against. When a template genuinely
changes, we update projects deliberately.

## Roadmap

- **v0** — templates, rules, process docs. Markdown only.
- **v1 (this)** — indexer/validator CLI: parse specs, cross-check criterion
  references, build a coverage map from `@spec` markers, generate "Verified by".
- **v2** — React `<SpecBrowser />` component (achery-ui styled) that any
  project can embed to render its own specs + coverage, from `achery-specs index`.

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
  src/                     # the achery-specs CLI and library
  test/
```

## Developing the CLI

```sh
pnpm install
pnpm test        # vitest
pnpm typecheck
pnpm build       # → dist/
node dist/cli.js check --root ../mandrel
```

Releases follow the achery-workshop pattern: bump `package.json`, promote
`[Unreleased]` in `CHANGELOG.md`, merge, then tag `v{version}` and push the tag.
`.github/workflows/release.yml` publishes to npm through npm trusted publishing
(OIDC, no token; configured on the package's npmjs.com settings) and creates the
GitHub Release. It skips the publish if that version is already on npm.
