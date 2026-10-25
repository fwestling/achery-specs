#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { buildIndex } from './indexer.js'
import { formatReport } from './report.js'
import { PREFIX_PATTERN } from './types.js'
import { nextId, writeVerified } from './write.js'

const USAGE = `achery-specs — index and validate a project's specs/

Usage:
  achery-specs check [--missing] [--json]   Validate specs and @spec tags, report coverage (exit 1 on errors)
  achery-specs write                        Regenerate every spec's "Verified by" section from the tags
  achery-specs index [--out <file>]         Write the full index as JSON (stdout by default)
  achery-specs next <PREFIX>                Print the next unused criterion ID for a prefix

Options:
  --root <dir>   Project root containing specs/ (default: current directory)
  --missing      check: list each spec's untested criteria
  --json         check: print problems and summary as JSON
  --out <file>   index: write to a file instead of stdout
  -h, --help     Show this help
  -v, --version  Show the version
`

const version = (): string => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
  return pkg.version
}

const main = (): number => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      root: { type: 'string' },
      missing: { type: 'boolean' },
      json: { type: 'boolean' },
      out: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })
  if (values.help) {
    process.stdout.write(USAGE)
    return 0
  }
  if (values.version) {
    process.stdout.write(`${version()}\n`)
    return 0
  }

  const [command = 'check', ...rest] = positionals
  const root = resolve(values.root ?? process.cwd())

  switch (command) {
    case 'check': {
      const index = buildIndex({ root })
      if (values.json) {
        process.stdout.write(`${JSON.stringify({ summary: index.summary, problems: index.problems }, null, 2)}\n`)
      } else {
        process.stdout.write(`${formatReport(index, { missing: values.missing })}\n`)
      }
      return index.summary.errors > 0 ? 1 : 0
    }
    case 'write': {
      const changed = writeVerified(root, buildIndex({ root }))
      process.stdout.write(changed.length > 0 ? `Updated ${changed.length} spec(s):\n${changed.map((p) => `  ${p}`).join('\n')}\n` : 'Verified by sections are up to date.\n')
      return 0
    }
    case 'index': {
      const json = `${JSON.stringify(buildIndex({ root }), null, 2)}\n`
      if (values.out) writeFileSync(resolve(values.out), json)
      else process.stdout.write(json)
      return 0
    }
    case 'next': {
      const prefix = rest[0]
      if (!prefix || !PREFIX_PATTERN.test(prefix)) {
        process.stderr.write('Usage: achery-specs next <PREFIX> (ALL-CAPS, e.g. SYNC)\n')
        return 2
      }
      process.stdout.write(`${nextId(buildIndex({ root }), prefix)}\n`)
      return 0
    }
    default:
      process.stderr.write(`Unknown command "${command}"\n\n${USAGE}`)
      return 2
  }
}

// Piped into head and the like: stop quietly when the reader goes away
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(process.exitCode ?? 0)
  throw error
})

try {
  process.exitCode = main()
} catch (error) {
  process.stderr.write(`achery-specs: ${(error as Error).message}\n`)
  process.exitCode = 2
}
