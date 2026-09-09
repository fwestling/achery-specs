# specs/ — rules for agents

This directory is the spec surface for the project. It is the source of
truth for what the product does, what it does not do, and why. Read before
making substantive changes; write when the substantive changes ship.

Spec format, templates, and process live in the `achery-specs` repo. Local
copies of the templates are in `.templates/` — use those.

## Layout

- `capabilities/<area>/<slug>.md` — atomic "product does X" specs
- `journeys/<slug>.md` — multi-step flows composing capabilities
- `constraints/<slug>.md` — non-functional requirements (offline, sync, …)
- `.templates/` — vendored copies of the achery-specs templates

Frontmatter and section structure come from the templates. Do not invent
new sections. If a section genuinely doesn't apply, leave it with a short
"n/a — <reason>" so absence is intentional.

## When to check specs

- **Before implementing a new feature** — search `specs/` for overlapping
  or conflicting capabilities. Update an existing spec if the change lives
  there; only create a new spec if the functionality is genuinely new.
- **Before fixing a bug** — identify which criterion was violated (e.g.
  `SYNC-7`). If no spec covers the area, the bug is also a spec gap —
  propose one.
- **Before editing behavior** — check for criteria the change might
  invalidate. You must either update the spec (with reasoning in the
  PR/commit) or not make the change. Never silently invalidate a criterion.

## When to update specs

- **New capability shipped** — new file, `status: shipped`, `since:
  <version>`. Never mark `shipped` without at least one test tagged per
  criterion.
- **Behavior changed** — update the affected spec. Bump `since` if the
  change is user-visible.
- **Behavior removed** — do not delete the file. Set `status: deprecated`,
  set `supersedes` on any replacement spec, add a short note in the
  deprecated file explaining what happened.

## Proposing new specs

Always propose first, implement second. The spec is the design artefact
and gets reviewed before code lands.

1. Draft the spec markdown using `.templates/`.
2. Present the draft to Fred; get approval.
3. Implement to satisfy the criteria.
4. Add tests tagged with `// @spec <prefix>-N`.
5. Flip `status: shipped` and set `since`.

If you find yourself writing code without an approved spec in hand, stop
and draft one.

## Criterion IDs

Every spec declares a short ALL-CAPS `prefix:` in frontmatter that
namespaces its criterion IDs (e.g. `SYNC`, `EDIT`, `OFFLINE`).

- Criterion IDs are `<prefix>-N`, e.g. `SYNC-1`, `SYNC-2`, …
- **Prefixes may be shared across multiple specs.** All specs sharing a
  prefix draw from the same numbering pool. Two sync capabilities using
  `SYNC` cannot both have `SYNC-1`.
- To find the next available number for a prefix: grep the specs
  directory for `<prefix>-` and take max + 1.
- Never reuse or renumber. Dropped criteria are marked in place; new ones
  take the next available number project-wide within the prefix.
- Each criterion must be individually testable. If it isn't, split it.
- Pick prefixes that make bare IDs readable at a glance in a test tag:
  `SYNC-42` should tell you the domain without a lookup.

## Non-goals matter

The Non-goals section is not filler. It is what prevents scope creep in
future work and is authoritative when rejecting out-of-scope requests.
Fill it in every spec.

## Tagging tests

Mark each test with a comment above it (or above the enclosing `describe`
if it applies to all children):

```ts
// @spec SYNC-42
test('mirror queue drains within 60s of reconnect', () => { … })
```

Rules:

- The prefix + number must resolve to a real criterion in `specs/`.
- One test can cover multiple criteria — comma-separate:
  `// @spec SYNC-42, SYNC-43`
- One criterion can have multiple tests; coverage counts them.
- Cross-domain tests use multiple tags, one per prefix.
- If a test doesn't map to any spec, don't force a tag. Not every test is
  tied to a spec, and noise undermines coverage.
- Provenance-qualified form is allowed but not required:
  `// @spec sync-mirror/SYNC-42`. The bare form is canonical.

## Conflicts

If a proposed change conflicts with an existing spec:

- Do not proceed with implementation.
- Raise the conflict explicitly (which spec, which criterion, why the
  conflict).
- Propose a resolution (update the spec, deprecate it, split, …).
- Wait for approval before writing code.

## Naming

- All slugs kebab-case.
- Slug must equal filename (minus `.md`).
- Feature-area subdirectories under `capabilities/`.
- Flat under `journeys/` and `constraints/`.
