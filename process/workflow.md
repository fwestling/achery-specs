# Spec-driven workflow

The `specs/` directory is where feature work is designed. Code follows
approved specs; specs are not documentation written after the fact.

## New feature

1. **Propose the spec first.** Draft a capability (or update an existing
   one) using `.templates/capability.md`. Include intent, user story,
   criteria, non-goals.
2. **Get approval.** Spec review is the design review. Details argued out
   here don't need to be re-argued in code review.
3. **Implement.** Code satisfies the criteria, nothing more.
4. **Tag tests.** Every criterion gets at least one test tagged with
   `// @spec <prefix>-N`.
5. **Mark shipped.** Set `status: shipped`, `since: <version>`. Last step,
   not first.

## Bug fix

1. **Identify the violated criterion.** Which spec + criterion does this
   bug break?
2. **If no spec covers it**, propose one. A bug in un-specified territory
   is also a spec gap. Fix and spec go together.
3. **Add a regression test** tagged to the criterion as part of the fix.
4. **Fix.**

## Behavior change

1. **Check for affected specs.** Any criterion that would become false
   under the proposed change?
2. **Update the spec first.** Change the criterion, add a new one, or
   deprecate the capability — whichever fits.
3. **Get approval on the spec change.** Behavior changes without spec
   changes are not allowed.
4. **Implement.**

## Removing a capability

- Do not delete the file. Set `status: deprecated`, set `supersedes` on
  the replacement (if any), add a short note explaining why and when.
- Delete tests that only verified the deprecated capability. Keep the
  spec file so the git history and cross-references stay intact.

## Journey and constraint updates

Same rhythm as capabilities. Journeys inherit criteria from the
capabilities they reference — when a capability's criterion changes, sweep
the journeys that reference it and update or annotate as needed.

Constraint changes are especially load-bearing: a constraint change may
invalidate criteria across many capabilities. Propose changes to
constraints with a scan of impacted capabilities attached.

## Conflicts

If a proposed change conflicts with an existing spec, do not proceed with
implementation. Raise the conflict, propose a resolution, wait for
approval.
