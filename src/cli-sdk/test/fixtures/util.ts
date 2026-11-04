import type { Test } from 'tap'

export const setupEnv = (t: Test) => {
  // fresh process.env on every test
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^VLT_/i.test(k)),
  )
  // not sure why this is required, but Windows tests fail without it.
  cleanEnv.PATH = process.env.PATH
  t.beforeEach(t =>
    t.intercept(process, 'env', { value: { ...cleanEnv } }),
  )
  return cleanEnv
}

/**
 * Replace the timings in multi-workspace `vlt run` output (`(523ms)`,
 * `(1.2s)`, `1.7s total`) with `T`, so captured logs can be compared
 * exactly.
 */
export const scrubTimes = (logs: unknown[][]) =>
  logs.map(args =>
    args.map(arg =>
      typeof arg === 'string' ?
        arg.replace(/(\d+m )?\d+(\.\d+)?m?s\b/g, 'T')
      : arg,
    ),
  )
