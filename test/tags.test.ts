import { describe, expect, test } from 'vitest'
import { scanTags } from '../src/tags.js'

describe('scanTags', () => {
  test('reads tags in every comment style', () => {
    const text = [
      '// @spec SYNC-1',
      "test('a', () => {})",
      '# @spec SYNC-2',
      '/* @spec SYNC-3 */',
      '{/* @spec SYNC-4 */}',
      '-- @spec SYNC-5',
      '  // @spec SYNC-6, EDIT-2',
    ].join('\n')
    const { tags, problems } = scanTags('a.test.ts', text)
    expect(problems).toEqual([])
    expect(tags.map((t) => [t.id, t.line])).toEqual([
      ['SYNC-1', 1],
      ['SYNC-2', 3],
      ['SYNC-3', 4],
      ['SYNC-4', 5],
      ['SYNC-5', 6],
      ['SYNC-6', 7],
      ['EDIT-2', 7],
    ])
  })

  test('keeps the slug of a provenance-qualified tag', () => {
    const { tags } = scanTags('a.test.ts', '// @spec sync-mirror/SYNC-42, SYNC-43')
    expect(tags.map((t) => [t.slug, t.id])).toEqual([
      ['sync-mirror', 'SYNC-42'],
      [null, 'SYNC-43'],
    ])
  })

  test('reports malformed tags rather than guessing', () => {
    const { tags, problems } = scanTags('a.test.ts', '// @spec\n// @spec SYNC-1 mirror drains\n// @spec sync-1\n// @spec SYNC-1,')
    expect(tags).toEqual([])
    expect(problems.map((p) => [p.code, p.line])).toEqual([
      ['malformed-tag', 1],
      ['malformed-tag', 2],
      ['malformed-tag', 3],
      ['malformed-tag', 4],
    ])
  })

  test('ignores @spec outside a comment, and words that merely start with it', () => {
    const { tags, problems } = scanTags('a.test.ts', "const s = '@spec SYNC-1'\nconst t = '# @spec SYNC-3'\n// @specification SYNC-2")
    expect(tags).toEqual([])
    expect(problems).toEqual([])
  })
})
