import { describe, expect, test } from 'vitest'
import { parseFrontmatter, parseSections, parseSpec } from '../src/parse.js'
import { capability } from './helpers.js'

const parse = (text: string) => parseSpec('specs/capabilities/area/thing.md', text, 'capability', 'area')

describe('parseFrontmatter', () => {
  test('reads YAML with comments, block lists and numeric-looking versions', () => {
    const { data, bodyLine } = parseFrontmatter('---\nstatus: planned   # planned | shipped\nrelated:\n  - a\n  - b\nsince: 1.0\n---\nbody\n')
    expect(data).toEqual({ status: 'planned', related: ['a', 'b'], since: 1 })
    expect(bodyLine).toBe(8)
  })

  test('rejects a file without frontmatter', () => {
    expect(() => parseFrontmatter('# Title\n')).toThrow(/missing frontmatter/)
  })

  test('rejects unterminated frontmatter and bad YAML', () => {
    expect(() => parseFrontmatter('---\nid: x\n')).toThrow(/unterminated/)
    expect(() => parseFrontmatter('---\nid: [x\n---\n')).toThrow(/invalid frontmatter YAML/)
  })
})

describe('parseSections', () => {
  test('ignores ## lines inside fenced code', () => {
    const sections = parseSections('## One\ntext\n```md\n## Not a heading\n```\n## Two\n', 10)
    expect(sections.map((s) => [s.heading, s.line])).toEqual([['One', 10], ['Two', 15]])
    expect(sections[0]!.content).toContain('## Not a heading')
  })
})

describe('parseSpec', () => {
  test('coerces frontmatter fields', () => {
    const { spec } = parse(capability({ id: 'thing', prefix: 'THING', related: ['a', 'b'] }))
    expect(spec).toMatchObject({ id: 'thing', status: 'shipped', since: '0.1.0', prefix: 'THING', related: ['a', 'b'], area: 'area', kind: null })
  })

  test('finds live and deprecated criterion definitions in every supported form', () => {
    const { spec, problems } = parse(
      capability({
        id: 'thing',
        prefix: 'THING',
        criteria: [
          '**THING-1** — shows the thing',
          '~~**THING-2**~~ (deprecated 2026-10-25: gone)',
          '**~~THING-3~~** — also gone',
          '~~THING-4~~ (deprecated: template form)',
          '**THING-5**: colon separator',
        ],
      }),
    )
    expect(problems).toEqual([])
    expect(spec!.criteria.map((c) => [c.id, c.deprecated, c.text])).toEqual([
      ['THING-1', false, 'shows the thing'],
      ['THING-2', true, '(deprecated 2026-10-25: gone)'],
      ['THING-3', true, 'also gone'],
      ['THING-4', true, '(deprecated: template form)'],
      ['THING-5', false, 'colon separator'],
    ])
    expect(spec!.criteria[0]).toMatchObject({ prefix: 'THING', number: 1, spec: 'thing', line: 22 })
  })

  test('flags a bold ID that is not a list item', () => {
    const { problems } = parse(capability({ id: 'thing', prefix: 'THING', extra: '\nSee **THING-9** for details.\n' }))
    expect(problems).toMatchObject([{ code: 'stray-criterion', line: 28 }])
  })

  test('collects references, marking backticked and refs: lists as explicit', () => {
    const { spec } = parse(capability({ id: 'thing', prefix: 'THING', extra: '\nUses UTF-8 and SYNC-4; see `EDIT-2`.\n1. **Step** — does it — refs: AUTH-1, `AUTH-2`\n' }))
    const refs = spec!.refs.map((r) => [r.id, r.explicit])
    expect(refs).toEqual([
      ['UTF-8', false],
      ['SYNC-4', false],
      ['EDIT-2', true],
      ['AUTH-1', true],
      ['AUTH-2', true],
    ])
  })

  test('does not count its own definition, or the generated Verified by section, as references', () => {
    const { spec } = parse(capability({ id: 'thing', prefix: 'THING', verified: '\n- **THING-1** — `a.test.ts`\n- **THING-7** — untested\n' }))
    expect(spec!.criteria.map((c) => c.id)).toEqual(['THING-1'])
    expect(spec!.refs).toEqual([])
  })

  test('treats a whole-line strikethrough as deprecated, and accepts numbered list items', () => {
    const { spec, problems } = parse(
      capability({ id: 'thing', prefix: 'THING', criteria: ['~~**THING-2** — dropped~~ (deprecated: x)', '~~THING-6 — dropped~~'] }).replace('- **THING-2**', '').replace('## Non-goals', '1. **THING-7** — numbered\n\n## Non-goals'),
    )
    expect(problems).toEqual([])
    expect(spec!.criteria.map((c) => [c.id, c.deprecated, c.text])).toEqual([
      ['THING-2', true, 'dropped (deprecated: x)'],
      ['THING-6', true, 'dropped'],
      ['THING-7', false, 'numbered'],
    ])
  })

  test('ignores criteria and references inside HTML comments and fenced code', () => {
    const extra = '\n<!--\nIf SYNC-1..SYNC-12 are used, start at SYNC-13.\n- **THING-50** — commented out\n-->\n```md\n- **THING-99** — example\n```\n<!-- KNOWN GAP: THING-1 --> but THING-3 counts\n'
    const { spec, problems } = parse(capability({ id: 'thing', prefix: 'THING', extra }))
    expect(problems).toEqual([])
    expect(spec!.criteria.map((c) => c.id)).toEqual(['THING-1'])
    expect(spec!.refs.map((r) => [r.id, r.line])).toEqual([['THING-3', 35]])
  })

  test('returns a frontmatter problem instead of a spec when the YAML is broken', () => {
    const { spec, problems } = parse('---\nid: [\n---\n')
    expect(spec).toBeNull()
    expect(problems).toMatchObject([{ severity: 'error', code: 'frontmatter', line: 1 }])
  })
})
