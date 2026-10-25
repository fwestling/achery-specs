export const SPEC_TYPES = ['capability', 'journey', 'constraint'] as const
export type SpecType = (typeof SPEC_TYPES)[number]

export const STATUSES = ['planned', 'in-progress', 'shipped', 'deprecated'] as const
export type Status = (typeof STATUSES)[number]

/** A spec's `prefix:`: ALL-CAPS, digits allowed after the first letter. */
export const PREFIX_PATTERN = /^[A-Z][A-Z0-9]*$/

export const CONSTRAINT_KINDS = ['offline', 'sync', 'latency', 'data-residency', 'a11y', 'security', 'other'] as const

/** Directory under specs/ that holds each spec type. */
export const TYPE_DIRS: Record<SpecType, string> = {
  capability: 'capabilities',
  journey: 'journeys',
  constraint: 'constraints',
}

/** The generated coverage section (capabilities). */
export const VERIFIED_HEADING = 'Verified by'

/** The section that defines a spec type's criteria. */
export const CRITERIA_SECTION: Record<SpecType, string> = {
  capability: 'Acceptance criteria',
  journey: 'Success criteria',
  constraint: 'Acceptance criteria',
}

export interface Location {
  /** Path relative to the project root, forward slashes. */
  file: string
  /** 1-based line number. */
  line: number
}

export interface Criterion extends Location {
  /** e.g. `SYNC-42` */
  id: string
  prefix: string
  number: number
  /** The statement after the ID, markdown as written. */
  text: string
  /** Struck through in place (`~~**SYNC-7**~~`): never reused, never tested. */
  deprecated: boolean
  /**
   * How the criterion is verified when no test can check it, from a trailing
   * `_(manual: <method>)_` marker (e.g. "spec review"). Null when absent.
   */
  manual: string | null
  /** Slug of the spec that defines it. */
  spec: string
}

export interface Ref extends Location {
  id: string
  /** In backticks or a journey `refs:` list, so it must resolve whatever its prefix. */
  explicit: boolean
}

export interface Section {
  heading: string
  /** Line of the `## ` heading. */
  line: number
  /** Markdown between this heading and the next. */
  content: string
}

export interface Spec {
  id: string
  type: SpecType
  /** Feature-area directory, for capabilities. */
  area: string | null
  path: string
  title: string
  status: string
  since: string
  prefix: string
  tags: string[]
  related: string[]
  supersedes: string[]
  /** Journeys: capability slugs composed. */
  capabilities: string[]
  /** Constraints: capability/journey slugs (or `all`) the constraint applies to. */
  scope: string[]
  /** Constraints only. */
  kind: string | null
  frontmatter: Record<string, unknown>
  /** Markdown after the frontmatter. */
  body: string
  /** 1-based line of the body's first line in the file. */
  bodyLine: number
  sections: Section[]
  criteria: Criterion[]
  refs: Ref[]
}

export interface Tag extends Location {
  id: string
  /** Provenance qualifier from `slug/ID`, if given. */
  slug: string | null
}

export type Severity = 'error' | 'warning'

export interface Problem {
  severity: Severity
  /** Stable kebab-case code, e.g. `duplicate-criterion`. */
  code: string
  message: string
  file?: string
  line?: number
}

/** `specs/achery-specs.json`; every field optional there. */
export interface Config {
  /** Globs (relative to the root) of files scanned for `@spec` tags. */
  tests: string[]
  /** Globs excluded from the test scan. */
  ignore: string[]
}

export interface CriterionCoverage {
  id: string
  spec: string
  deprecated: boolean
  /** The criterion's manual-verification method, if marked (see `Criterion.manual`). */
  manual: string | null
  tests: Location[]
}

export interface Summary {
  specs: number
  criteria: number
  /** Live (non-deprecated) criteria. */
  live: number
  /** Live criteria with at least one tagged test. */
  covered: number
  /** Live criteria with no tagged test but a `_(manual: …)_` marker. */
  manual: number
  testFiles: number
  tags: number
  errors: number
  warnings: number
}

/** Everything the indexer knows about a project. Serialised by `achery-specs index`. */
export interface SpecIndex {
  schemaVersion: 1
  generator: string
  config: Config
  specs: Spec[]
  tags: Tag[]
  coverage: CriterionCoverage[]
  problems: Problem[]
  summary: Summary
}
