import t, { Test } from 'tap'
import bundle from '../src/bundle.js'
import { Formats, Runtimes, BundleFactors } from '../src/types.js'
import { relative, sep } from 'path'
import { defaultOptions } from '../src/index.js'

const testBundle = async (
  t: Test,
  options: Partial<BundleFactors>,
) => {
  const dir = t.testdir()
  const { outputs } = await bundle({
    outdir: dir,
    ...defaultOptions(),
    ...options,
  })
  const keys = Object.keys(outputs).map(p => relative(dir, p))
  return keys
}

t.test('bundle', async t => {
  await t.resolves(
    testBundle(t, {
      runtime: Runtimes.Node,
      format: Formats.Esm,
    }),
  )
  await t.resolves(
    testBundle(t, {
      runtime: Runtimes.Node,
      format: Formats.Cjs,
    }),
  )
  await t.resolves(
    testBundle(t, {
      runtime: Runtimes.Bun,
      format: Formats.Esm,
    }),
  )
})

t.test('external commands', async t => {
  const commands = await testBundle(t, {
    runtime: Runtimes.Node,
    format: Formats.Esm,
    externalCommands: true,
  })
  const noCommands = await testBundle(t, {
    runtime: Runtimes.Node,
    format: Formats.Esm,
    externalCommands: false,
  })
  t.ok(commands.some(c => c.startsWith(`commands${sep}`)))
  t.notOk(noCommands.some(c => c.startsWith(`commands${sep}`)))
})
