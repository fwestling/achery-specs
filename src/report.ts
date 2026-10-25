import type { Problem, SpecIndex } from './types.js'

const formatProblem = (problem: Problem): string => {
  const where = problem.file ? `${problem.file}${problem.line ? `:${problem.line}` : ''}: ` : ''
  return `  ${problem.severity === 'error' ? '✗' : '!'} ${where}${problem.message} [${problem.code}]`
}

/** The human-readable `check` report: per-spec coverage, then problems, then totals. */
export const formatReport = (index: SpecIndex, { missing = false }: { missing?: boolean } = {}): string => {
  const tested = new Set(index.coverage.filter((entry) => entry.tests.length > 0).map((entry) => entry.id))
  const rows = index.specs
    // Deprecated specs' criteria are retired, so they'd only skew the totals
    .filter((spec) => spec.criteria.length > 0 && spec.status !== 'deprecated')
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((spec) => {
      const live = spec.criteria.filter((criterion) => !criterion.deprecated)
      const untested = live.filter((criterion) => !tested.has(criterion.id)).map((criterion) => criterion.id)
      return { spec, ratio: `${live.length - untested.length}/${live.length}`, untested }
    })

  const width = Math.max(0, ...rows.map((row) => row.spec.path.length))
  const ratioWidth = Math.max(0, ...rows.map((row) => row.ratio.length))
  const lines = ['Spec coverage (live criteria with at least one @spec-tagged test)', '']
  for (const { spec, ratio, untested } of rows) {
    lines.push(`${spec.path.padEnd(width)}  ${ratio.padStart(ratioWidth)}  ${spec.status}`)
    if (missing && untested.length > 0) lines.push(`${''.padEnd(width)}  untested: ${untested.join(', ')}`)
  }

  const { summary } = index
  lines.push('', `Total: ${summary.covered}/${summary.live} live criteria tested, ${summary.tags} tags in ${summary.testFiles} test files`)

  const errors = index.problems.filter((problem) => problem.severity === 'error')
  const warnings = index.problems.filter((problem) => problem.severity === 'warning')
  if (warnings.length > 0) lines.push('', `${warnings.length} warning(s):`, ...warnings.map(formatProblem))
  if (errors.length > 0) lines.push('', `${errors.length} error(s):`, ...errors.map(formatProblem))
  return lines.join('\n')
}
