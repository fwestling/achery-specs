import { parseDocument } from 'yaml'
import { VERIFIED_HEADING, type Criterion, type Problem, type Ref, type Section, type Spec, type SpecType } from './types.js'

export const CRITERION_ID = /[A-Z][A-Z0-9]*-\d+/
const ID = CRITERION_ID.source

/**
 * A criterion definition is a list item that opens with a bold ID, optionally
 * struck through when deprecated: `- **SYNC-1** — …`, `- ~~**SYNC-7**~~ (deprecated: …)`,
 * `- **~~SYNC-7~~** …`, `- ~~**SYNC-7** — whole line~~ …`, or the template's
 * `- ~~SYNC-7~~ (deprecated: …)`.
 */
const DEFINITION = new RegExp(`^\\s*(?:[-*]|\\d+\\.)\\s+(~~)?(\\*\\*)?(~~)?(${ID})(~~)?(\\*\\*)?(~~)?(.*)$`)
const BOLD_ID = new RegExp(`\\*\\*(?:~~)?(${ID})(?:~~)?\\*\\*`, 'g')
const ANY_ID = new RegExp(`(?<![A-Za-z0-9-])(${ID})(?![A-Za-z0-9])`, 'g')
const FENCE = /^\s*(```|~~~)/
/** A trailing `_(manual: <method>)_` on a criterion: verified by hand, not by a test. */
const MANUAL = /\s*_\(manual:\s*(.*?)\s*\)_\s*$/
const MANUAL_ANYWHERE = /_\(manual\b/

/**
 * The body's lines with fenced code and HTML comments blanked out (line count kept),
 * so examples and commented-out text neither define nor reference criteria.
 */
const maskBody = (body: string): string[] => {
  const uncommented = body.replace(/<!--[\s\S]*?(?:-->|$)/g, (comment) => comment.replace(/[^\n]/g, ' '))
  let fenced = false
  return uncommented.split('\n').map((line) => {
    if (FENCE.test(line)) {
      fenced = !fenced
      return ''
    }
    return fenced ? '' : line
  })
}

export const splitId = (id: string): { prefix: string; number: number } => {
  const dash = id.lastIndexOf('-')
  return { prefix: id.slice(0, dash), number: Number(id.slice(dash + 1)) }
}

export interface ParsedFrontmatter {
  data: Record<string, unknown>
  body: string
  /** 1-based line of the body's first line. */
  bodyLine: number
}

/** Splits `---` frontmatter from the body. Throws with a readable message on bad YAML. */
export const parseFrontmatter = (text: string): ParsedFrontmatter => {
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') throw new Error('missing frontmatter (file must start with ---)')
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (end === -1) throw new Error('unterminated frontmatter (no closing ---)')

  const doc = parseDocument(lines.slice(1, end).join('\n'))
  if (doc.errors.length > 0) throw new Error(`invalid frontmatter YAML: ${doc.errors[0]!.message.split('\n')[0]}`)
  const data: unknown = doc.toJS() ?? {}
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('frontmatter must be a YAML mapping')
  }
  return { data: data as Record<string, unknown>, body: lines.slice(end + 1).join('\n'), bodyLine: end + 2 }
}

/** `## ` headings outside fenced code, with the markdown under each. */
export const parseSections = (body: string, bodyLine: number): Section[] => {
  const lines = body.split('\n')
  const starts: { heading: string; index: number }[] = []
  let fenced = false
  lines.forEach((line, index) => {
    if (FENCE.test(line)) fenced = !fenced
    const heading = !fenced && /^## (.+?)\s*$/.exec(line)
    if (heading) starts.push({ heading: heading[1]!, index })
  })
  return starts.map(({ heading, index }, i) => ({
    heading,
    line: bodyLine + index,
    content: lines.slice(index + 1, starts[i + 1]?.index ?? lines.length).join('\n'),
  }))
}

const asString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value.trim() : String(value)
}

const asList = (value: unknown): string[] => {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return value.map(asString).filter(Boolean)
  return [asString(value)].filter(Boolean)
}

export interface ParseResult {
  spec: Spec | null
  problems: Problem[]
}

/** Parses one spec file. `path` is root-relative; `type` comes from its directory. */
export const parseSpec = (path: string, text: string, type: SpecType, area: string | null): ParseResult => {
  let frontmatter: ParsedFrontmatter
  try {
    frontmatter = parseFrontmatter(text)
  } catch (error) {
    return { spec: null, problems: [{ severity: 'error', code: 'frontmatter', message: (error as Error).message, file: path, line: 1 }] }
  }

  const { data, body, bodyLine } = frontmatter
  const problems: Problem[] = []
  const criteria: Criterion[] = []
  const refs: Ref[] = []
  const id = asString(data.id)
  let heading = ''

  maskBody(body).forEach((text, index) => {
    const line = bodyLine + index
    if (text.startsWith('## ')) heading = text.slice(3).trim()
    // Generated from the tags, so it restates IDs rather than defining or referencing them
    if (heading === VERIFIED_HEADING) return

    const definition = DEFINITION.exec(text)
    const bold = definition?.[2] !== undefined && definition[6] !== undefined
    // Struck through: opening ~~ before the ID, closing ~~ right after it or later on the line
    const struck = definition !== null && (definition[1] ?? definition[3]) !== undefined && ((definition[5] ?? definition[7]) !== undefined || definition[8]!.includes('~~'))
    let definedAt = -1

    if (definition && (bold || struck) && !(definition[2] !== undefined && definition[6] === undefined)) {
      const criterionId = definition[4]!
      definedAt = text.indexOf(criterionId)
      let statement = definition[8]!
      const manual = MANUAL.exec(statement)
      if (manual) statement = statement.slice(0, manual.index)
      if ((manual && manual[1] === '') || (!manual && MANUAL_ANYWHERE.test(statement))) {
        problems.push({
          severity: 'error',
          code: 'malformed-manual',
          message: `${criterionId}: a manual marker must end the line and name the method, e.g. "_(manual: spec review)_"`,
          file: path,
          line,
        })
      }
      criteria.push({
        id: criterionId,
        ...splitId(criterionId),
        text: statement.replace(/~~/g, '').replace(/^\s*(—|–|-|:)\s*/, '').trim(),
        deprecated: struck,
        manual: manual?.[1] ? manual[1] : null,
        spec: id,
        file: path,
        line,
      })
    } else {
      for (const match of text.matchAll(BOLD_ID)) {
        problems.push({
          severity: 'error',
          code: 'stray-criterion',
          message: `**${match[1]}** looks like a criterion definition but isn't a list item ("- **${match[1]}** — …")`,
          file: path,
          line,
        })
      }
    }

    const refsAt = text.indexOf('refs:')
    for (const match of text.matchAll(ANY_ID)) {
      if (match.index === definedAt) continue
      const backticked = text[match.index - 1] === '`' && text[match.index + match[0].length] === '`'
      refs.push({ id: match[1]!, explicit: backticked || (refsAt !== -1 && match.index > refsAt), file: path, line })
    }
  })

  const spec: Spec = {
    id,
    type,
    area,
    path,
    title: asString(data.title),
    status: asString(data.status),
    since: asString(data.since),
    prefix: asString(data.prefix),
    tags: asList(data.tags),
    related: asList(data.related),
    supersedes: asList(data.supersedes),
    capabilities: asList(data.capabilities),
    scope: asList(data.scope),
    kind: type === 'constraint' ? asString(data.kind) : null,
    frontmatter: data,
    body,
    bodyLine,
    sections: parseSections(body, bodyLine),
    criteria,
    refs,
  }
  return { spec, problems }
}
