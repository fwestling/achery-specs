---
id: <kebab-slug>            # must match filename minus .md
title: <human-readable title>
status: planned             # planned | in-progress | shipped | deprecated
since: 0.0.0                # version first shipped; blank until then
prefix: <SHORTCAPS>         # short ALL-CAPS domain tag for criterion IDs
                            # (e.g. SYNC, EDIT, BOOK). Multiple capabilities
                            # may share a prefix — they then share one
                            # numbering pool. See "Acceptance criteria" below.
tags: []
related: []                 # slugs of related capabilities/journeys/constraints
supersedes: []              # for deprecation chains
---

## Intent

<!--
One paragraph. What problem does this capability solve, for whom, and why
now? This is the "why" agents need to make good judgement calls on adjacent
work. Do not paraphrase the acceptance criteria — that's the "what".
-->

## User story

<!--
One sentence: "As a <role>, I want to <do X> so I can <get Y>."

For component-library capabilities the actor is a consumer developer:
"As a consumer, I want <Component> to <do X> so I can build <use case>."
-->

## Acceptance criteria

<!--
Testable bullets, each with a stable ID of the form `<prefix>-N`, where
<prefix> is the frontmatter `prefix:` for this spec. Tests reference these
via `// @spec <prefix>-N` markers.

Numbering rules:
- IDs are unique across ALL specs sharing the same prefix. If another
  capability in this domain already uses SYNC-1..SYNC-12, this spec starts
  at SYNC-13.
- Never reuse or renumber IDs. If SYNC-7 is dropped, mark it in place with
  a `~~SYNC-7~~ (deprecated: <reason>)` line; the next new ID is still one
  higher than the current max.
- Each criterion should be individually testable. If it isn't, split it.
- Prefer active, concrete verbs. "Shows", "returns", "persists" beat
  "handles", "supports".

To find the next available number for a shared prefix: grep the specs
directory for `<prefix>-` and take max + 1.
-->

- **<prefix>-N** — <testable statement>
- **<prefix>-N+1** — <testable statement>

## Non-goals

<!--
What this capability explicitly does NOT do. This section is load-bearing:
it prevents scope creep in future work and is authoritative when rejecting
out-of-scope requests. Fill it in every spec.

Link to a related capability if the non-goal lives there.
-->

- <thing this does not do>

## Implementation

<!--
Approximate file/directory pointers. Not source of truth; a hint for agents
and humans exploring. Will drift; keep it broad enough to survive minor
refactors ("Feature root: src/features/bookmarks/", not "line 42 of Foo.tsx").
-->

- Feature root: `src/…`

## Marketing copy

<!--
Optional. Pre-approved public-facing prose. Marketing agents and public
documentation should pull from here verbatim rather than paraphrase from
the intent section.

For component-library capabilities, rename to "Documentation copy" and
target consumer-developer readers.
-->

> …

## Verified by

<!--
Populated by the coverage indexer once tooling ships (achery-specs v1).
Do not hand-edit.
-->
