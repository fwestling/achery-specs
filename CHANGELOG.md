# Changelog

All notable changes to `achery-specs` (the templates, rules, process docs and CLI).

## [Unreleased]

---

## [1.1.0] - 2026-10-26

### Added
- Manual verification: a criterion ending in `_(manual: <method>)_` counts as covered without a `@spec` tag, for criteria no test can check (process rules, on-device checks). "Verified by" shows `manual: <method>`; a tag takes precedence
- `check`: `malformed-manual` error for a marker with no method or not at the end of the line
- Index: `coverage[].manual` and `summary.manual` (live criteria verified only by hand); additive, so `schemaVersion` stays 1
- rules: "Criteria no test can check" section; templates mention the marker

### Changed
- `check` report: per-spec ratios count manual criteria as covered and show `(N manual)`; the total line adds `(+N verified manually)`

---

## [1.0.0] - 2026-10-26

### Added
- CLI `achery-specs check`: validates specs (frontmatter, layout, sections against the project's vendored templates, criterion IDs and prefix pools, slug and criterion references) and `@spec` tags, reports coverage, and fails when a `shipped` spec has untested criteria
- CLI `achery-specs write`: generates each capability's "Verified by" section from the tags; `check` fails when one is stale
- CLI `achery-specs index`: the full index (specs, criteria, tags, coverage, problems) as JSON, for v2's `<SpecBrowser />`
- CLI `achery-specs next <PREFIX>`: next unused criterion ID in a prefix pool
- Optional `specs/achery-specs.json` for test globs and ignores
- Library export `buildIndex` and friends
- MIT licence
- Tags in `#`, `/* */`, JSX `{/* */}` and `--` comments, as well as `//`

### Changed
- rules: next-ID lookup uses `achery-specs next`; new "Checking" section
- templates: journeys and constraints gain `related:` (a journey or constraint can now point at a constraint without misusing `capabilities`/`scope`)
- templates: capability "Verified by" comment describes `achery-specs write`; constraint `scope` documents `[all]`
- process: Phase 5 of the backfill uses `check --missing` and `write`

### Fixed
- Compared with the per-project `spec-check.mjs` scripts this replaces: deprecated criteria no longer count as untested; references to 2-letter prefixes (`BG-1`) are checked; non-spec markdown under `specs/` is ignored; frontmatter is parsed as YAML (comments, block lists)

---

## v0 - 2026-09-09 (untagged)

### Added
- Templates, rules and process docs (markdown only)

[Unreleased]: https://github.com/fwestling/achery-specs/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/fwestling/achery-specs/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/fwestling/achery-specs/releases/tag/v1.0.0
