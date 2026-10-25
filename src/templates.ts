import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter, parseSections } from './parse.js'
import { SPEC_TYPES, type SpecType } from './types.js'

export interface TemplateShape {
  /** Where the template was read from: the project's vendored copy, or this package's. */
  source: string
  /** Frontmatter keys, in template order. */
  keys: string[]
  /** `## ` headings, in template order. */
  headings: string[]
}

/** Sections a spec may leave out. Everything else in the template is required. */
export const OPTIONAL_HEADINGS = new Set(['Marketing copy'])

/** Component-library projects rename "Marketing copy" (see the capability template). */
export const HEADING_ALIASES: Record<string, string> = { 'Documentation copy': 'Marketing copy' }

const BUNDLED = fileURLToPath(new URL('../templates/', import.meta.url))

/**
 * Reads the shape of each spec type's template. Prefers the project's vendored
 * `specs/.templates/<type>.md`, because a project's specs follow the template
 * they were written against; falls back to the copy bundled with this package.
 */
export const loadTemplates = (specsPath: string, specsDirLabel: string): Record<SpecType, TemplateShape> => {
  const entries = SPEC_TYPES.map((type) => {
    const vendored = join(specsPath, '.templates', `${type}.md`)
    const path = existsSync(vendored) ? vendored : join(BUNDLED, `${type}.md`)
    const source = path === vendored ? `${specsDirLabel}/.templates/${type}.md` : `achery-specs/templates/${type}.md`
    const { data, body, bodyLine } = parseFrontmatter(readFileSync(path, 'utf8'))
    const shape: TemplateShape = {
      source,
      keys: Object.keys(data),
      headings: parseSections(body, bodyLine).map((section) => section.heading),
    }
    return [type, shape] as const
  })
  return Object.fromEntries(entries) as Record<SpecType, TemplateShape>
}
