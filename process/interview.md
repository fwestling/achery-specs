# Backfill interview script

Use during Phase 3 of `backfill-agent.md`. Ask only the questions that
apply to the capability in front of you. Don't robot-recite the list — the
draft is the anchor, questions are for filling gaps and confirming
uncertainty flags.

Sequence per capability: **show draft → ask targeted questions → revise →
confirm → next**.

## Intent

- What was the original motivation for this capability? Is that motivation
  still current?
- Who is the primary user? Same as you had in mind originally, or has it
  shifted?
- Was this driven by a specific issue, request, or moment? (Useful for
  the `Marketing copy` section later.)

## Scope

- What does this deliberately NOT do? (Non-goals — critical to capture.
  Push for at least one, even if obvious.)
- Any related capability this is often confused with?

## Status

- Is this actually shipped and working, or half-shipped?
- Which version first shipped it? (Cross-check CHANGELOG.)
- Any known bugs against it? If so, a criterion likely needs sharpening —
  or a new one needs adding.

## Acceptance

- Which of these criteria are load-bearing (must never regress) vs.
  nice-to-have?
- Anything missing from the list?
- Anything on the list that isn't actually a hard requirement?
- Is each one testable as written, or do we need to sharpen wording?

## Marketing

- If we wrote one sentence about this for a public page, what would it
  say?
- Any tone or framing preferences? (Terse? Warm? Technical?)

## Cross-cutting

- Does this depend on any constraint (offline, sync latency, data
  residency, a11y)? If so, note it — may spawn a constraint spec.
- Does this participate in any user journey worth documenting on its
  own?
- Any other capability this one is coupled to that should be linked via
  `related`?

## Wrap

- "Anything about this you want captured that I haven't asked about?"
- Confirm the final draft. Then write it.
