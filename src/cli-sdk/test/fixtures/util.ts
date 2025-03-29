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
