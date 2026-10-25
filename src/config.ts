import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Config } from './types.js'

export const SPECS_DIR = 'specs'
export const CONFIG_FILE = 'achery-specs.json'

/** Test files in the languages Achery projects use: TS/JS, GDScript, Python, Go. */
export const DEFAULT_TESTS = [
  '**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  '**/*_test.{gd,py,go}',
  '**/test_*.py',
]

export const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.*/**',
  `${SPECS_DIR}/**`,
]

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

/** Reads `specs/achery-specs.json` if present. `ignore` adds to the defaults; `tests` replaces them. */
export const loadConfig = (root: string): Config => {
  const path = join(root, SPECS_DIR, CONFIG_FILE)
  if (!existsSync(path)) return { tests: DEFAULT_TESTS, ignore: DEFAULT_IGNORE }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`${SPECS_DIR}/${CONFIG_FILE}: invalid JSON (${(error as Error).message})`)
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${SPECS_DIR}/${CONFIG_FILE}: expected an object`)
  }

  const { tests, ignore, ...rest } = raw as Record<string, unknown>
  const unknownKeys = Object.keys(rest).filter((key) => key !== '$schema')
  if (unknownKeys.length > 0) {
    throw new Error(`${SPECS_DIR}/${CONFIG_FILE}: unknown key(s) ${unknownKeys.join(', ')}`)
  }
  if (tests !== undefined && !isStringArray(tests)) {
    throw new Error(`${SPECS_DIR}/${CONFIG_FILE}: "tests" must be an array of globs`)
  }
  if (ignore !== undefined && !isStringArray(ignore)) {
    throw new Error(`${SPECS_DIR}/${CONFIG_FILE}: "ignore" must be an array of globs`)
  }
  return {
    tests: tests ?? DEFAULT_TESTS,
    ignore: [...DEFAULT_IGNORE, ...(ignore ?? [])],
  }
}
