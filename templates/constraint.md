---
id: <kebab-slug>
title: <human-readable title>
status: planned             # planned | in-progress | shipped | deprecated
since: 0.0.0
prefix: <SHORTCAPS>         # short ALL-CAPS domain tag for criterion IDs
                            # (e.g. OFFLINE, LATENCY, A11Y). Constraints
                            # usually have their own prefix; may share with
                            # another constraint spec if the numbering pool
                            # is genuinely one namespace.
tags: []
related: []                 # slugs of related capabilities/journeys/constraints
scope: []                   # slugs of capabilities/journeys this constraint applies to,
                            # or [all] for the whole product
kind: offline               # offline | sync | latency | data-residency | a11y | security | other
---

## Intent

<!--
What forces this constraint on the product? Regulatory requirement, UX
commitment, architectural decision with team buy-in? A constraint without
a "why" tends to get quietly relaxed.

Only write constraint specs for things that are actually specified.
"Should feel fast" is not a constraint; "P95 route change < 200ms on
mid-tier Android" is.
-->

## Statement

<!--
The constraint in one paragraph, concrete and measurable. Avoid vague
qualifiers ("reasonable", "good", "modern").
-->

## Acceptance criteria

<!--
Testable bullets. Same rules as capability criteria: stable IDs using the
frontmatter `prefix:`, never reused, unique across specs sharing the
prefix. Reference from tests via `// @spec <prefix>-N`.
-->

- **<prefix>-N** — <testable statement of the constraint>

## Verification

<!--
How is compliance measured? Automated test, load test, manual audit, CI
gate, external report? In which environments?

If the constraint isn't verifiable, it isn't a constraint yet — go back to
the Statement and tighten it.
-->

- <verification method>

## Consequences

<!--
Downstream capabilities that inherit this constraint. Useful for reviewers
assessing whether a new capability violates. Link by slug.
-->

- <capability slug or note>

## Non-goals

- <what the constraint deliberately does not cover>
