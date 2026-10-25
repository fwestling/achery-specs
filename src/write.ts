import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { coverageMap } from './indexer.js'
import type { SpecIndex } from './types.js'
import { isVerifiedCurrent, renderVerified, replaceVerified, VERIFIED_HEADING } from './verified.js'

/** Rewrites every out-of-date "Verified by" section. Returns the root-relative paths changed. */
export const writeVerified = (root: string, index: SpecIndex): string[] => {
  const coverage = coverageMap(index)
  const changed: string[] = []
  for (const spec of index.specs) {
    const section = spec.sections.find((s) => s.heading === VERIFIED_HEADING)
    const rendered = renderVerified(spec, coverage)
    if (!section || isVerifiedCurrent(section.content, rendered)) continue
    const path = join(root, spec.path)
    const next = replaceVerified(readFileSync(path, 'utf8'), rendered)
    if (next === null) continue
    writeFileSync(path, next)
    changed.push(spec.path)
  }
  return changed
}

/** The next unused criterion number for a prefix: max + 1 across all specs, deprecated IDs included. */
export const nextId = (index: SpecIndex, prefix: string): string => {
  const numbers = index.specs.flatMap((spec) => spec.criteria).filter((c) => c.prefix === prefix).map((c) => c.number)
  return `${prefix}-${numbers.length > 0 ? Math.max(...numbers) + 1 : 1}`
}
