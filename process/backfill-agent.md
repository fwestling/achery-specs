# Spec backfill — agent brief

You are backfilling `specs/` for an existing Achery project. The project
already ships; the specs must document what actually exists (or what should
exist and is close to it), not aspirations. When intent is unclear, ask
Fred — do not guess.

Read `../workflow.md` and `../../rules/CLAUDE.md` before starting.

## Phase 1 — Discovery

Read, in order:

- `README.md`
- `CHANGELOG.md`
- `package.json` (name, version, scripts, dependencies)
- Top-level route/feature directory tree
- Storybook stories, if any
- Test file names and top-level `describe` blocks
- Any existing docs in `docs/` or a wiki

Do NOT try to read every source file. This phase is a scan — you're
building a candidate list, not final specs.

**Output** — a candidate list, grouped by likely area, one line each:

```
- <area>/<slug> — <one-line description> — confidence: high|medium|low
```

Flag anything ambiguous. Also flag anything that looks like a constraint
(offline behavior, sync semantics, data residency, a11y commitments) — it
gets its own list.

## Phase 2 — Draft

For each candidate, produce a first-pass spec using
`.templates/capability.md` (or constraint / journey where appropriate):

- **Intent** — infer from code, CHANGELOG, naming. Mark uncertain intent
  with `<!-- UNCERTAIN: … -->` inline.
- **User story** — propose one. Mark uncertain if you're guessing at the
  actor or motivation.
- **Acceptance criteria** — extract from observable behavior. If tests
  exist for this area, base criteria on what they actually verify (not
  what they claim to verify in their name).
- **Non-goals** — leave blank. This needs Fred's input; guessing here is
  worse than empty.
- **Implementation** — cite the file(s) you found.
- **Marketing copy** — leave blank.

Assemble drafts in memory or a scratch doc. Do NOT write them to disk yet
— unreviewed drafts polluting `specs/` are worse than none.

## Phase 3 — Interview

Work through the drafts **one capability at a time**. For each:

1. Show Fred the draft (intent, user story, criteria, non-goals slot).
2. Ask the questions from `interview.md` that apply. Don't robot-recite
   the list.
3. Adjust the draft based on his answers.
4. Only commit to disk after confirmation.

Do NOT batch. Fred said explicitly he doesn't want to be drowned.

If Fred says a candidate isn't a real capability, drop it. If he names a
missing one, add it to the queue.

## Phase 4 — Finalise

- Write approved specs to `<project>/specs/capabilities/<area>/<slug>.md`.
- Draft journeys that emerged from the interview and run them through the
  same interview rhythm.
- Draft constraints that were mentioned (offline, sync, data residency).
- Present the final structure for a last review.

## Phase 5 — Test backfill (optional)

For existing tests that clearly map to a specific criterion
(`achery-specs check --missing` lists the untested ones per spec):

- Propose adding `// @spec <prefix>-N` above the test.
- Present as a diff. Do NOT apply without approval.
- Once applied, run `achery-specs write` to fill in each spec's
  "Verified by" section, then `achery-specs check`.

If a test doesn't map cleanly, leave it. Not every test is tied to a
capability, and forcing tags creates noise that undermines the whole
system.

## Anti-patterns

- Do not invent capabilities that "sound like they should exist" — spec
  what's built, not what's imagined.
- Do not paraphrase code comments as intent — comments describe how,
  intent is why.
- Do not write vague criteria to defer testing. Every criterion is a test
  contract.
- Do not merge multiple related capabilities into one huge spec. Split
  along testable seams.
