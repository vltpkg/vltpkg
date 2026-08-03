import { readFileSync, writeFileSync } from 'node:fs'
import t from 'tap'
import {
  cleanHyperfineResults,
  cleanHyperfineResultsFile,
} from '../src/clean-hyperfine-results.ts'

const result = (times: number[], exitCodes: number[]) => ({
  command: 'vlt install',
  mean: 99,
  stddev: 99,
  median: 99,
  min: 99,
  max: 99,
  times,
  exit_codes: exitCodes,
  parameters: { binary: 'vlt' },
})

t.test('removes failed runs and recalculates statistics', t => {
  const cleaned = cleanHyperfineResults({
    metadata: 'preserved',
    results: [result([3, 100, 1, 2], [0, 1, 0, 0])],
  })

  t.equal(cleaned.removed, 1)
  t.equal(cleaned.remaining, 3)
  t.strictSame(cleaned.data, {
    metadata: 'preserved',
    results: [
      {
        ...result([3, 100, 1, 2], [0, 1, 0, 0]),
        mean: 2,
        stddev: Math.sqrt(2 / 3),
        median: 2,
        min: 1,
        max: 3,
        times: [3, 1, 2],
        exit_codes: [0, 0, 0],
      },
    ],
  })
  t.end()
})

t.test('handles an even number of successful runs', t => {
  t.match(
    cleanHyperfineResults({
      results: [result([4, 2], [0, 0])],
    }).data,
    { results: [{ median: 3 }] },
  )
  t.end()
})

t.test('cleans a results file', t => {
  const file = t.testdir({
    'benchmarks.json': JSON.stringify({
      results: [result([1, 2], [0, 1])],
    }),
  })
  const benchmarkFile = `${file}/benchmarks.json`

  t.match(cleanHyperfineResultsFile(benchmarkFile), {
    removed: 1,
    remaining: 1,
  })
  t.match(JSON.parse(readFileSync(benchmarkFile, 'utf8')), {
    results: [{ times: [1], exit_codes: [0] }],
  })
  t.end()
})

t.test('rejects unusable results without overwriting the file', t => {
  const file = t.testdir({ 'benchmarks.json': 'original' })
  const benchmarkFile = `${file}/benchmarks.json`
  writeFileSync(
    benchmarkFile,
    JSON.stringify({ results: [result([1, 2], [1, 1])] }),
  )
  const before = readFileSync(benchmarkFile, 'utf8')

  t.throws(
    () => cleanHyperfineResultsFile(benchmarkFile),
    /All measured runs failed for vlt install/,
  )
  t.equal(readFileSync(benchmarkFile, 'utf8'), before)
  t.end()
})

t.test('rejects invalid Hyperfine data', t => {
  const failures: [unknown, RegExp][] = [
    [null, /Invalid Hyperfine results/],
    [{}, /Invalid Hyperfine results/],
    [{ results: [] }, /Hyperfine produced no results/],
    [{ results: [null] }, /Invalid Hyperfine result at index 0/],
    [
      { results: [{ times: 'no', exit_codes: [] }] },
      /Invalid times array/,
    ],
    [
      { results: [{ times: [1], exit_codes: ['no'] }] },
      /Invalid exit_codes array/,
    ],
    [
      { results: [{ times: [], exit_codes: [] }] },
      /Mismatched or empty times and exit_codes arrays/,
    ],
    [
      { results: [{ times: [1], exit_codes: [0, 0] }] },
      /Mismatched or empty times and exit_codes arrays/,
    ],
    [
      { results: [{ times: [1], exit_codes: [1] }] },
      /All measured runs failed for result 0/,
    ],
  ]

  for (const [value, expected] of failures) {
    t.throws(() => cleanHyperfineResults(value), expected)
  }
  t.end()
})
