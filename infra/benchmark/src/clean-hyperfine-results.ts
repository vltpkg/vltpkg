#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

type HyperfineResult = {
  command?: unknown
  exit_codes?: unknown
  times?: unknown
  [key: string]: unknown
}

type HyperfineData = {
  results: HyperfineResult[]
  [key: string]: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const numberArray = (value: unknown, name: string): number[] => {
  if (
    !Array.isArray(value) ||
    !value.every(
      item => typeof item === 'number' && Number.isFinite(item),
    )
  ) {
    throw new Error(`Invalid ${name} array`)
  }
  return value as number[]
}

const mean = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const valueAt = (wanted: number) =>
    sorted.reduce(
      (found, value, index) => (index === wanted ? value : found),
      0,
    )
  const upper = valueAt(middle)
  return sorted.length % 2 === 0 ?
      (valueAt(middle - 1) + upper) / 2
    : upper
}

export const cleanHyperfineResults = (
  value: unknown,
): { data: HyperfineData; removed: number; remaining: number } => {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error('Invalid Hyperfine results')
  }
  if (value.results.length === 0) {
    throw new Error('Hyperfine produced no results')
  }

  let removed = 0
  let remaining = 0
  const results = value.results.map(
    (value, index): HyperfineResult => {
      if (!isRecord(value)) {
        throw new Error(`Invalid Hyperfine result at index ${index}`)
      }

      const times = numberArray(value.times, 'times')
      const exitCodes = numberArray(value.exit_codes, 'exit_codes')
      if (times.length === 0 || times.length !== exitCodes.length) {
        throw new Error(
          'Mismatched or empty times and exit_codes arrays',
        )
      }

      const successfulTimes = times.filter(
        (_, i) => exitCodes[i] === 0,
      )
      if (successfulTimes.length === 0) {
        const command =
          typeof value.command === 'string' ?
            value.command
          : `result ${index}`
        throw new Error(`All measured runs failed for ${command}`)
      }

      const resultMean = mean(successfulTimes)
      removed += times.length - successfulTimes.length
      remaining += successfulTimes.length
      return {
        ...value,
        times: successfulTimes,
        exit_codes: successfulTimes.map(() => 0),
        mean: resultMean,
        stddev: Math.sqrt(
          successfulTimes.reduce(
            (sum, time) => sum + Math.pow(time - resultMean, 2),
            0,
          ) / successfulTimes.length,
        ),
        median: median(successfulTimes),
        min: Math.min(...successfulTimes),
        max: Math.max(...successfulTimes),
      }
    },
  )

  return { data: { ...value, results }, removed, remaining }
}

export const cleanHyperfineResultsFile = (file: string) => {
  const input: unknown = JSON.parse(readFileSync(file, 'utf8'))
  const cleaned = cleanHyperfineResults(input)
  writeFileSync(file, JSON.stringify(cleaned.data, null, 2))
  return cleaned
}

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2]
  if (!file)
    throw new Error('Usage: clean-hyperfine-results.ts <file>')

  const { removed, remaining } = cleanHyperfineResultsFile(file)
  console.log(
    `Validated ${file}: removed ${removed} failed runs; ${remaining} successful runs remain`,
  )
}
/* c8 ignore stop */
