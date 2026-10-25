import type { Problem, Tag } from './types.js'
import { CRITERION_ID } from './parse.js'

/** A line that is a comment starting `@spec`: `//`, `#`, `/*`, `{/*` (JSX) or `--` (SQL, Lua). */
const TAG_LINE = /^\s*(?:\/\/|#|\{?\/\*|--)\s*@spec\b(.*)$/
const TAG_ITEM = new RegExp(`^(?:([a-z0-9][a-z0-9-]*)\\/)?(${CRITERION_ID.source})$`)

/**
 * Finds `@spec` tags in one file's text. Each tag lists one or more criterion IDs,
 * comma-separated, each optionally qualified with its spec slug (`sync-mirror/SYNC-42`).
 */
export const scanTags = (file: string, text: string): { tags: Tag[]; problems: Problem[] } => {
  const tags: Tag[] = []
  const problems: Problem[] = []
  text.split(/\r?\n/).forEach((source, index) => {
    const match = TAG_LINE.exec(source)
    if (!match) return
    const line = index + 1
    const list = match[1]!.replace(/\*\/\s*\}?\s*$/, '').trim()
    const items = list.split(',').map((item) => item.trim())
    const parsed = items.map((item) => TAG_ITEM.exec(item))
    if (list === '' || parsed.some((item) => item === null)) {
      problems.push({
        severity: 'error',
        code: 'malformed-tag',
        message: `malformed @spec tag "${source.trim()}" (expected "@spec PREFIX-N[, PREFIX-N…]")`,
        file,
        line,
      })
      return
    }
    for (const item of parsed) if (item) tags.push({ id: item[2]!, slug: item[1] ?? null, file, line })
  })
  return { tags, problems }
}
