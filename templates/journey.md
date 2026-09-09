---
id: <kebab-slug>
title: <human-readable title>
status: planned             # planned | in-progress | shipped | deprecated
since: 0.0.0
prefix: <SHORTCAPS>         # short ALL-CAPS domain tag for step + success IDs
                            # (e.g. ONBOARD, FIRSTREC). Usually unique per
                            # journey; may be shared if two journeys really
                            # do share a numbering namespace.
tags: []
capabilities: []            # slugs of capabilities composed by this journey
---

## Intent

<!--
What overall user goal this journey supports. Journeys are compositions
of capabilities; the intent here is the composite goal, not the individual
capability goals.
-->

## Actors

<!--
Who initiates and who else is involved. Include external systems if they
participate (e.g. "email provider on step 3").
-->

- <actor>

## Steps

<!--
Ordered steps. Each step should reference one or more capability criteria
so the journey inherits their guarantees. Use `<capability-prefix>-N`.

Keep steps observable — what the user does or sees, not what the code does.
-->

1. **Step 1** — <what happens> — refs: `<capability-prefix>-N`
2. **Step 2** — <what happens>

## Success criteria

<!--
How you know the journey succeeded. Use the frontmatter `prefix:` for IDs.
Can be tagged in tests the same way capability criteria are:
`// @spec <prefix>-N`. Same uniqueness rules apply — no reuse, no renumber.
-->

- **<prefix>-N** — <testable end state>

## Alternative paths

<!--
Branches, retries, failure modes worth documenting. Not every edge case —
just the ones that shape the product.
-->

- <branch>

## Non-goals

- <thing this journey does not attempt>
