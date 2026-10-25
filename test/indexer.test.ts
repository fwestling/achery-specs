import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { buildIndex } from '../src/indexer.js'
import { nextId, writeVerified } from '../src/write.js'
import { capability, constraint, journey, makeProject } from './helpers.js'

/** A consistent project: two capabilities, a journey and a constraint, all tested. */
const validFiles = (): Record<string, string> => ({
  'specs/CLAUDE.md': '# rules, not a spec\n',
  'specs/IMPLEMENTATION-GAPS.md': '- **SYNC-1** is not a spec definition here\n',
  'specs/capabilities/sync/mirror.md': capability({ id: 'mirror', prefix: 'SYNC', related: ['queue'], criteria: ['**SYNC-1** — mirrors', '~~**SYNC-2**~~ (deprecated: gone)'] }),
  'specs/capabilities/sync/queue.md': capability({ id: 'queue', prefix: 'SYNC', criteria: ['**SYNC-3** — queues'] }),
  'specs/journeys/second-device.md': journey({ id: 'second-device', prefix: 'SECOND', capabilities: ['mirror', 'queue'], steps: '1. **Sync** — data arrives — refs: `SYNC-1`, `SYNC-3`' }),
  'specs/constraints/offline.md': constraint({ id: 'offline', prefix: 'OFFLINE', scope: ['all'] }),
  'apps/server/sync.test.ts': '// @spec SYNC-1, SECOND-1\ntest()\n// @spec queue/SYNC-3\n',
  'packages/addon/tests/offline_test.gd': '# @spec OFFLINE-1\n',
  'node_modules/dep/x.test.ts': '// @spec NOPE-1\n',
})

const codes = (root: string) => buildIndex({ root }).problems.map((p) => p.code)

/** A valid project, written out with its Verified by sections generated. */
const validProject = (overrides: Record<string, string> = {}) => {
  const root = makeProject({ ...validFiles(), ...overrides })
  writeVerified(root, buildIndex({ root }))
  return root
}

describe('buildIndex on a consistent project', () => {
  test('reports no problems and full coverage', () => {
    const index = buildIndex({ root: validProject() })
    expect(index.problems).toEqual([])
    expect(index.summary).toMatchObject({ specs: 4, criteria: 5, live: 4, covered: 4, testFiles: 2, tags: 4, errors: 0 })
    expect(index.specs.map((s) => s.path)).toEqual([
      'specs/capabilities/sync/mirror.md',
      'specs/capabilities/sync/queue.md',
      'specs/journeys/second-device.md',
      'specs/constraints/offline.md',
    ])
    expect(index.coverage.find((c) => c.id === 'SYNC-1')!.tests).toEqual([{ file: 'apps/server/sync.test.ts', line: 1 }])
    expect(index.coverage.find((c) => c.id === 'SYNC-2')).toMatchObject({ deprecated: true, tests: [] })
  })

  test('nextId takes max + 1 across specs sharing a prefix, deprecated IDs included', () => {
    const index = buildIndex({ root: validProject() })
    expect(nextId(index, 'SYNC')).toBe('SYNC-4')
    expect(nextId(index, 'NEW')).toBe('NEW-1')
  })
})

describe('buildIndex catches', () => {
  test('a criterion defined twice in a shared prefix pool', () => {
    const root = validProject({ 'specs/capabilities/sync/queue.md': capability({ id: 'queue', prefix: 'SYNC', criteria: ['**SYNC-1** — clash', '**SYNC-3** — queues'] }) })
    expect(codes(root)).toContain('duplicate-criterion')
  })

  test('a criterion that does not use its spec prefix', () => {
    const root = validProject({ 'specs/capabilities/sync/queue.md': capability({ id: 'queue', prefix: 'SYNC', criteria: ['**EDIT-1** — wrong pool', '**SYNC-3** — queues'] }) })
    expect(codes(root)).toContain('prefix-mismatch')
  })

  test('references to undefined criteria, but not prose with an unknown prefix', () => {
    const root = validProject({
      'specs/capabilities/sync/queue.md': capability({ id: 'queue', prefix: 'SYNC', criteria: ['**SYNC-3** — queues'], extra: '\nStores UTF-8. Unlike SYNC-99 and `WAT-1`.\n' }),
    })
    const problems = buildIndex({ root }).problems.filter((p) => p.code === 'undefined-ref')
    expect(problems.map((p) => p.message)).toEqual(['references SYNC-99, which no spec defines', 'references WAT-1, which no spec defines'])
  })

  test('a reference to a deprecated criterion, as a warning', () => {
    const root = validProject({
      'specs/journeys/second-device.md': journey({ id: 'second-device', prefix: 'SECOND', capabilities: ['mirror'], steps: '1. **Sync** — refs: `SYNC-2`' }),
    })
    expect(buildIndex({ root }).problems).toMatchObject([{ severity: 'warning', code: 'deprecated-ref' }])
  })

  test('tags that do not resolve, or name the wrong spec', () => {
    const root = validProject({ 'apps/web/x.test.tsx': '// @spec SYNC-42\n// @spec mirror/SYNC-3\n' })
    expect(codes(root)).toEqual(expect.arrayContaining(['unresolved-tag', 'tag-slug-mismatch']))
  })

  test('a tag on a deprecated criterion, as a warning', () => {
    const root = validProject({ 'apps/web/x.test.tsx': '// @spec SYNC-2\n' })
    const problem = buildIndex({ root }).problems.find((p) => p.code === 'deprecated-tag')
    expect(problem).toMatchObject({ severity: 'warning', file: 'apps/web/x.test.tsx', line: 1 })
  })

  test('a shipped spec with an untested live criterion', () => {
    const root = validProject({ 'apps/server/sync.test.ts': '// @spec SECOND-1\n// @spec SYNC-3\n' })
    const problem = buildIndex({ root }).problems.find((p) => p.code === 'untested-shipped')
    expect(problem).toMatchObject({ file: 'specs/capabilities/sync/mirror.md', message: 'status shipped but untested: SYNC-1' })
  })

  test('nothing untested when the spec is not shipped yet', () => {
    const files = validFiles()
    const root = validProject({
      'specs/capabilities/sync/mirror.md': files['specs/capabilities/sync/mirror.md']!.replace('status: shipped', 'status: in-progress'),
      'apps/server/sync.test.ts': '// @spec SECOND-1\n// @spec SYNC-3\n',
    })
    expect(codes(root)).toEqual([])
  })

  test('frontmatter problems', () => {
    const root = validProject({
      'specs/capabilities/sync/queue.md': capability({ id: 'queue-x', prefix: 'sync', status: 'done', since: '0.0.0', criteria: ['**SYNC-3** — queues'] }).replace('tags: []\n', 'tags: []\nowner: fred\n'),
    })
    expect(codes(root)).toEqual(expect.arrayContaining(['id-mismatch', 'invalid-prefix', 'invalid-status', 'unknown-field']))
  })

  test('a shipped spec without a since version', () => {
    const root = validProject({ 'specs/capabilities/sync/queue.md': capability({ id: 'queue', prefix: 'SYNC', since: '', criteria: ['**SYNC-3** — queues'] }) })
    expect(codes(root)).toContain('missing-since')
  })

  test('slug references to missing specs, or to the wrong type', () => {
    const root = validProject({
      'specs/journeys/second-device.md': journey({ id: 'second-device', prefix: 'SECOND', capabilities: ['mirror', 'offline'], steps: '1. **Sync** — refs: `SYNC-1`' }),
      'specs/constraints/offline.md': constraint({ id: 'offline', prefix: 'OFFLINE', scope: ['nowhere'], kind: 'vibes' }),
    })
    expect(codes(root)).toEqual(expect.arrayContaining(['wrong-slug-type', 'unknown-slug', 'invalid-kind']))
  })

  test('missing, invented, duplicated and reordered sections', () => {
    const base = validFiles()['specs/capabilities/sync/queue.md']!
    const root = validProject({
      'specs/capabilities/sync/queue.md': base.replace('## User story\n\nAs a user, I want this.\n\n', '').replace('## Implementation', '## Notes\n\n## Intent\n\n## Implementation'),
    })
    expect(codes(root)).toEqual(expect.arrayContaining(['missing-section', 'unknown-section', 'duplicate-section', 'section-order']))
  })

  test('the optional Marketing copy section may be left out or renamed', () => {
    const base = validFiles()['specs/capabilities/sync/queue.md']!
    const without = validProject({ 'specs/capabilities/sync/queue.md': base.replace('## Marketing copy\n\n> Copy.\n\n', '') })
    expect(codes(without)).toEqual([])
    const renamed = validProject({ 'specs/capabilities/sync/queue.md': base.replace('## Marketing copy', '## Documentation copy') })
    expect(codes(renamed)).toEqual([])
  })

  test('specs in the wrong directory depth', () => {
    const root = validProject({ 'specs/capabilities/loose.md': capability({ id: 'loose', prefix: 'LOOSE' }), 'specs/journeys/nested/deep.md': '' })
    expect(buildIndex({ root }).problems.filter((p) => p.code === 'layout').map((p) => p.file)).toEqual(['specs/capabilities/loose.md', 'specs/journeys/nested/deep.md'])
  })

  test('the same slug in two areas', () => {
    const root = validProject({ 'specs/capabilities/other/queue.md': capability({ id: 'queue', prefix: 'OTHER' }) })
    expect(codes(root)).toContain('duplicate-slug')
  })

  test('a criterion defined outside its criteria section', () => {
    const root = validProject({ 'specs/capabilities/sync/queue.md': capability({ id: 'queue', prefix: 'SYNC', criteria: ['**SYNC-3** — queues'], extra: '\n- **SYNC-4** — sneaky\n' }) })
    expect(codes(root)).toContain('misplaced-criterion')
  })

  test('a Verified by section that no longer matches the tags', () => {
    const root = validProject()
    mkdirSync(join(root, 'apps/web'), { recursive: true })
    writeFileSync(join(root, 'apps/web/extra.test.ts'), '// @spec SYNC-3\n')
    const problem = buildIndex({ root }).problems.find((p) => p.code === 'stale-verified')
    expect(problem).toMatchObject({ file: 'specs/capabilities/sync/queue.md' })
  })
})

describe('writeVerified', () => {
  test('lists each live criterion with its test files, and is idempotent', () => {
    const root = makeProject(validFiles())
    expect(writeVerified(root, buildIndex({ root }))).toEqual(['specs/capabilities/sync/mirror.md', 'specs/capabilities/sync/queue.md'])
    const text = readFileSync(join(root, 'specs/capabilities/sync/mirror.md'), 'utf8')
    expect(text.endsWith('## Verified by\n\n<!-- Generated by achery-specs from @spec test tags. Run `achery-specs write` to update; do not hand-edit. -->\n\n- **SYNC-1** — `apps/server/sync.test.ts`\n')).toBe(true)
    expect(writeVerified(root, buildIndex({ root }))).toEqual([])
    expect(codes(root)).toEqual([])
  })

  test('marks untested criteria and keeps following sections intact', () => {
    const spec = capability({ id: 'queue', prefix: 'SYNC', status: 'planned', criteria: ['**SYNC-3** — queues'] }).replace('## Verified by\n', '## Verified by\n\nhand-written\n\n## Marketing copy\n\n> Late.\n').replace('## Marketing copy\n\n> Copy.\n\n', '')
    const root = makeProject({ 'specs/capabilities/sync/queue.md': spec })
    writeVerified(root, buildIndex({ root }))
    const text = readFileSync(join(root, 'specs/capabilities/sync/queue.md'), 'utf8')
    expect(text).toContain('- **SYNC-3** — untested\n\n## Marketing copy\n\n> Late.\n')
    expect(text).not.toContain('hand-written')
  })
})

describe('config', () => {
  test('specs/achery-specs.json replaces the test globs and adds ignores', () => {
    const root = validProject({
      'specs/achery-specs.json': JSON.stringify({ tests: ['apps/**/*.test.ts', 'qa/**/*.feature'], ignore: ['apps/legacy/**'] }),
      'qa/sync.feature': '# @spec OFFLINE-1\n',
      'apps/legacy/old.test.ts': '// @spec GONE-1\n',
    })
    const index = buildIndex({ root })
    expect(index.problems).toEqual([])
    expect(index.summary.testFiles).toBe(2)
  })

  test('rejects unknown keys', () => {
    const root = makeProject({ ...validFiles(), 'specs/achery-specs.json': '{"test": []}' })
    expect(() => buildIndex({ root })).toThrow(/unknown key\(s\) test/)
  })

  test('prefers the project vendored templates', () => {
    const template = readFileSync(new URL('../templates/constraint.md', import.meta.url), 'utf8').replace('## Consequences', '## Blast radius')
    const root = validProject({ 'specs/.templates/constraint.md': template })
    expect(buildIndex({ root }).problems.map((p) => p.message)).toEqual([
      'missing section "## Blast radius" (specs/.templates/constraint.md)',
      'section "## Consequences" isn\'t in specs/.templates/constraint.md (don\'t invent sections)',
    ])
  })
})
