import { Test } from 'tap'

/**
 * Run the specified bin for testing
 * Note that mockes must be relative to this fixture, not the test,
 * and the bin should be just the basename that lives in src, but with
 * the .js extension, not ts.
 */
export const run = async (
  t: Test,
  /** basename of bin in ./src, with a .js extension */
  bin: string,
  argv: string[],
  /** mock keys relative to this fixture, not the test */
  mocks?: Record<string, any>,
) => {
  const a = [process.execPath, 'index.js', ...argv]
  t.intercept(process, 'argv', {
    value: a,
  })
  const logs: any[] = []
  t.capture(console, 'log', (...msg: any[]) => logs.push(msg))
  const config =
    await t.mockImport<typeof import('@vltpkg/config')>(
      '@vltpkg/config',
    )
  let er: unknown
  try {
    await t.mockImport(`../../src/${bin}`, {
      '@vltpkg/config': config,
      ...mocks,
    })
  } catch (e) {
    er = e
  }
  return {
    er,
    config: await config.Config.load(),
    logs,
    argv: a.slice(2),
  }
}
