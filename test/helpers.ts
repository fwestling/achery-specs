import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach } from 'vitest'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/** Writes `files` (root-relative path → contents) into a fresh temp project and returns its root. */
export const makeProject = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'achery-specs-'))
  roots.push(root)
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return root
}

interface CapabilityOptions {
  id: string
  prefix: string
  status?: string
  since?: string
  related?: string[]
  criteria?: string[]
  extra?: string
  verified?: string
}

/** A capability spec that satisfies the bundled template. */
export const capability = ({ id, prefix, status = 'shipped', since = '0.1.0', related = [], criteria = [`**${prefix}-1** — does the thing`], extra = '', verified = '' }: CapabilityOptions): string => `---
id: ${id}
title: ${id} title
status: ${status}
since: ${since}
prefix: ${prefix}
tags: []
related: [${related.join(', ')}]
supersedes: []
---

## Intent

Why.

## User story

As a user, I want this.

## Acceptance criteria

${criteria.map((c) => `- ${c}`).join('\n')}

## Non-goals

- Nothing else.
${extra}
## Implementation

- Feature root: \`src/\`

## Marketing copy

> Copy.

## Verified by
${verified}`

interface JourneyOptions {
  id: string
  prefix: string
  capabilities: string[]
  steps: string
}

export const journey = ({ id, prefix, capabilities, steps }: JourneyOptions): string => `---
id: ${id}
title: ${id} title
status: shipped
since: 0.1.0
prefix: ${prefix}
tags: []
capabilities: [${capabilities.join(', ')}]
---

## Intent

Goal.

## Actors

- User

## Steps

${steps}

## Success criteria

- **${prefix}-1** — it worked

## Alternative paths

- None.

## Non-goals

- Nothing.
`

export const constraint = ({ id, prefix, scope, kind = 'offline' }: { id: string; prefix: string; scope: string[]; kind?: string }): string => `---
id: ${id}
title: ${id} title
status: shipped
since: 0.1.0
prefix: ${prefix}
tags: []
scope: [${scope.join(', ')}]
kind: ${kind}
---

## Intent

Why.

## Statement

Measurable.

## Acceptance criteria

- **${prefix}-1** — holds

## Verification

- A test.

## Consequences

- Everything.

## Non-goals

- Nothing.
`
