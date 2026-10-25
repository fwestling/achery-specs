import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { globSync } from 'tinyglobby'
import { loadConfig, SPECS_DIR } from './config.js'
import { parseSpec } from './parse.js'
import { scanTags } from './tags.js'
import { HEADING_ALIASES, loadTemplates, OPTIONAL_HEADINGS, type TemplateShape } from './templates.js'
import {
  CONSTRAINT_KINDS,
  CRITERIA_SECTION,
  PREFIX_PATTERN,
  SPEC_TYPES,
  STATUSES,
  TYPE_DIRS,
  type Criterion,
  type CriterionCoverage,
  type Location,
  type Problem,
  type Spec,
  type SpecIndex,
  type SpecType,
  type Tag,
} from './types.js'
import { isVerifiedCurrent, renderVerified, VERIFIED_HEADING } from './verified.js'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const GENERATOR = 'achery-specs'

const error = (code: string, message: string, at?: Partial<Location>): Problem => ({ severity: 'error', code, message, ...at })
const warning = (code: string, message: string, at?: Partial<Location>): Problem => ({ severity: 'warning', code, message, ...at })

/** Spec files under specs/<type dir>/, with their type and (for capabilities) feature area. */
const findSpecFiles = (root: string, problems: Problem[]) =>
  SPEC_TYPES.flatMap((type) => {
    const dir = `${SPECS_DIR}/${TYPE_DIRS[type]}`
    return globSync(`${dir}/**/*.md`, { cwd: root })
      .sort()
      .flatMap((path) => {
        const depth = path.slice(dir.length + 1).split('/').length
        const expected = type === 'capability' ? 2 : 1
        if (depth !== expected) {
          const where = type === 'capability' ? `${dir}/<area>/<slug>.md` : `${dir}/<slug>.md`
          problems.push(error('layout', `${type} specs live at ${where}`, { file: path }))
          return []
        }
        const area = type === 'capability' ? path.split('/')[2]! : null
        return [{ path, type, area }]
      })
  })

const checkFrontmatter = (spec: Spec, template: TemplateShape, problems: Problem[]) => {
  const at = { file: spec.path, line: 1 }
  for (const key of template.keys) {
    if (!(key in spec.frontmatter)) problems.push(error('missing-field', `frontmatter is missing "${key}" (${template.source})`, at))
  }
  for (const key of Object.keys(spec.frontmatter)) {
    if (!template.keys.includes(key)) problems.push(warning('unknown-field', `frontmatter field "${key}" isn't in ${template.source}`, at))
  }

  const filename = spec.path.split('/').pop()!.replace(/\.md$/, '')
  if (spec.id !== filename) problems.push(error('id-mismatch', `id "${spec.id}" does not match the filename "${filename}"`, at))
  if (spec.id && !SLUG.test(spec.id)) problems.push(error('invalid-slug', `id "${spec.id}" isn't a kebab-case slug`, at))
  if (spec.area !== null && !SLUG.test(spec.area)) problems.push(error('invalid-slug', `feature area "${spec.area}" isn't a kebab-case slug`, at))
  if (!spec.title) problems.push(error('missing-title', 'title is empty', at))
  if (!(STATUSES as readonly string[]).includes(spec.status)) {
    problems.push(error('invalid-status', `status "${spec.status}" is not one of ${STATUSES.join(', ')}`, at))
  }
  if (spec.status === 'shipped' && (spec.since === '' || spec.since === '0.0.0')) {
    problems.push(error('missing-since', 'status shipped but "since" is not set to the version it shipped in', at))
  }
  if (!PREFIX_PATTERN.test(spec.prefix)) problems.push(error('invalid-prefix', `prefix "${spec.prefix}" must be ALL-CAPS (e.g. SYNC)`, at))
  if (spec.kind !== null && !(CONSTRAINT_KINDS as readonly string[]).includes(spec.kind)) {
    problems.push(error('invalid-kind', `kind "${spec.kind}" is not one of ${CONSTRAINT_KINDS.join(', ')}`, at))
  }
}

const checkSections = (spec: Spec, template: TemplateShape, problems: Problem[]) => {
  const headings = spec.sections.map((section) => ({ ...section, canonical: HEADING_ALIASES[section.heading] ?? section.heading }))
  const required = template.headings.filter((heading) => !OPTIONAL_HEADINGS.has(heading))
  for (const heading of required) {
    if (!headings.some((section) => section.canonical === heading)) {
      problems.push(error('missing-section', `missing section "## ${heading}" (${template.source})`, { file: spec.path }))
    }
  }
  const seen = new Set<string>()
  for (const section of headings) {
    const at = { file: spec.path, line: section.line }
    if (!template.headings.includes(section.canonical)) {
      problems.push(error('unknown-section', `section "## ${section.heading}" isn't in ${template.source} (don't invent sections)`, at))
    } else if (seen.has(section.canonical)) {
      problems.push(error('duplicate-section', `section "## ${section.heading}" appears twice`, at))
    }
    seen.add(section.canonical)
  }
  const order = headings.map((section) => template.headings.indexOf(section.canonical)).filter((index) => index !== -1)
  const outOfOrder = order.findIndex((index, i) => i > 0 && index < order[i - 1]!)
  if (outOfOrder !== -1) {
    const section = headings.filter((h) => template.headings.includes(h.canonical))[outOfOrder]!
    problems.push(error('section-order', `section "## ${section.heading}" is out of order (${template.source})`, { file: spec.path, line: section.line }))
  }

  // Criteria are defined only in the criteria section
  const criteriaSection = spec.sections.find((section) => section.heading === CRITERIA_SECTION[spec.type])
  const sectionEnd = (section: { line: number }) => {
    const next = spec.sections.find((s) => s.line > section.line)
    return next ? next.line : Number.POSITIVE_INFINITY
  }
  for (const criterion of spec.criteria) {
    const inside = criteriaSection !== undefined && criterion.line > criteriaSection.line && criterion.line < sectionEnd(criteriaSection)
    if (!inside) {
      problems.push(error('misplaced-criterion', `${criterion.id} is defined outside "## ${CRITERIA_SECTION[spec.type]}"`, criterion))
    }
  }
}

const checkSlugRefs = (spec: Spec, bySlug: ReadonlyMap<string, Spec>, problems: Problem[]) => {
  const at = { file: spec.path, line: 1 }
  const lists: [field: string, slugs: string[], allowed: SpecType[] | null][] = [
    ['related', spec.related, null],
    ['supersedes', spec.supersedes, null],
    ['capabilities', spec.capabilities, ['capability']],
    ['scope', spec.scope, ['capability', 'journey']],
  ]
  for (const [field, slugs, allowed] of lists) {
    for (const slug of slugs) {
      if (field === 'scope' && slug === 'all') continue
      const target = bySlug.get(slug)
      if (!target) problems.push(error('unknown-slug', `${field}: no spec with slug "${slug}"`, at))
      else if (allowed && !allowed.includes(target.type)) {
        problems.push(error('wrong-slug-type', `${field}: "${slug}" is a ${target.type}, expected ${allowed.join(' or ')}`, at))
      }
    }
  }
}

export interface BuildOptions {
  /** Project root: the directory containing specs/. */
  root: string
}

/** Parses specs and test tags under `root`, runs every check, and computes coverage. */
export const buildIndex = ({ root }: BuildOptions): SpecIndex => {
  const specsPath = join(root, SPECS_DIR)
  if (!existsSync(specsPath)) throw new Error(`no ${SPECS_DIR}/ directory in ${root}`)

  const config = loadConfig(root)
  const templates = loadTemplates(specsPath, SPECS_DIR)
  const problems: Problem[] = []

  // Specs
  const specs = findSpecFiles(root, problems).flatMap(({ path, type, area }) => {
    const result = parseSpec(path, readFileSync(join(root, path), 'utf8'), type, area)
    problems.push(...result.problems)
    return result.spec ? [result.spec] : []
  })

  const bySlug = new Map<string, Spec>()
  for (const spec of specs) {
    const other = bySlug.get(spec.id)
    if (other && spec.id) problems.push(error('duplicate-slug', `slug "${spec.id}" is also used by ${other.path}`, { file: spec.path, line: 1 }))
    else bySlug.set(spec.id, spec)
  }

  const criteria = new Map<string, Criterion>()
  const prefixes = new Set(specs.map((spec) => spec.prefix))
  for (const spec of specs) {
    checkFrontmatter(spec, templates[spec.type], problems)
    checkSections(spec, templates[spec.type], problems)
    checkSlugRefs(spec, bySlug, problems)
    if (spec.criteria.length === 0) problems.push(warning('no-criteria', `no criteria defined`, { file: spec.path }))
    for (const criterion of spec.criteria) {
      if (criterion.prefix !== spec.prefix) {
        problems.push(error('prefix-mismatch', `${criterion.id} doesn't use this spec's prefix ${spec.prefix}`, criterion))
      }
      const existing = criteria.get(criterion.id)
      if (existing) {
        const where = existing.file === criterion.file ? `line ${existing.line}` : `${existing.file}:${existing.line}`
        problems.push(error('duplicate-criterion', `${criterion.id} is already defined at ${where}`, criterion))
      } else {
        criteria.set(criterion.id, criterion)
      }
    }
  }

  const isRetired = (criterion: Criterion) => criterion.deprecated || bySlug.get(criterion.spec)?.status === 'deprecated'

  // Criterion references in spec bodies
  for (const spec of specs) {
    for (const ref of spec.refs) {
      const target = criteria.get(ref.id)
      if (!target) {
        // Prose like "UTF-8" isn't a reference; an unknown ID with a known prefix, or in backticks, is
        if (ref.explicit || prefixes.has(ref.id.slice(0, ref.id.lastIndexOf('-')))) {
          problems.push(error('undefined-ref', `references ${ref.id}, which no spec defines`, ref))
        }
      } else if (isRetired(target) && target.spec !== spec.id && spec.status !== 'deprecated') {
        problems.push(warning('deprecated-ref', `references ${ref.id}, which is deprecated`, ref))
      }
    }
  }

  // Test tags
  const testFiles = globSync(config.tests, { cwd: root, ignore: config.ignore }).sort()
  const tags: Tag[] = []
  for (const file of testFiles) {
    const result = scanTags(file, readFileSync(join(root, file), 'utf8'))
    tags.push(...result.tags)
    problems.push(...result.problems)
  }

  const coverage = new Map<string, Location[]>()
  for (const tag of tags) {
    const target = criteria.get(tag.id)
    if (!target) {
      problems.push(error('unresolved-tag', `@spec ${tag.id} does not resolve to a criterion`, tag))
      continue
    }
    if (tag.slug !== null && tag.slug !== target.spec) {
      problems.push(error('tag-slug-mismatch', `@spec ${tag.slug}/${tag.id}: ${tag.id} is defined in "${target.spec}"`, tag))
    }
    if (isRetired(target)) problems.push(warning('deprecated-tag', `@spec ${tag.id} tags a deprecated criterion`, tag))
    coverage.set(tag.id, [...(coverage.get(tag.id) ?? []), { file: tag.file, line: tag.line }])
  }

  // Shipped means every live criterion has a test; Verified by mirrors the tags
  for (const spec of specs) {
    const untested = spec.criteria.filter((criterion) => !criterion.deprecated && !coverage.has(criterion.id))
    if (spec.status === 'shipped' && untested.length > 0) {
      problems.push(error('untested-shipped', `status shipped but untested: ${untested.map((c) => c.id).join(', ')}`, { file: spec.path, line: 1 }))
    }
    const verified = spec.sections.find((section) => section.heading === VERIFIED_HEADING)
    if (verified && !isVerifiedCurrent(verified.content, renderVerified(spec, coverage))) {
      problems.push(error('stale-verified', `"## ${VERIFIED_HEADING}" is out of date (run achery-specs write)`, { file: spec.path, line: verified.line }))
    }
  }

  problems.sort((a, b) => (a.file ?? '').localeCompare(b.file ?? '') || (a.line ?? 0) - (b.line ?? 0))

  const coverageList: CriterionCoverage[] = [...criteria.values()].map((criterion) => ({
    id: criterion.id,
    spec: criterion.spec,
    deprecated: isRetired(criterion),
    tests: coverage.get(criterion.id) ?? [],
  }))
  const live = coverageList.filter((entry) => !entry.deprecated)
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    config,
    specs,
    tags,
    coverage: coverageList,
    problems,
    summary: {
      specs: specs.length,
      criteria: coverageList.length,
      live: live.length,
      covered: live.filter((entry) => entry.tests.length > 0).length,
      testFiles: testFiles.length,
      tags: tags.length,
      errors: problems.filter((problem) => problem.severity === 'error').length,
      warnings: problems.filter((problem) => problem.severity === 'warning').length,
    },
  }
}

/** Coverage keyed by criterion ID, for rendering "Verified by". */
export const coverageMap = (index: SpecIndex): Map<string, Location[]> =>
  new Map(index.coverage.map((entry) => [entry.id, entry.tests]))
