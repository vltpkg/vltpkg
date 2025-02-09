import fs from 'fs'
import pathModule, {
  basename,
  delimiter,
  join,
  relative,
  sep,
} from 'path'
import t, { type Test } from 'tap'
import { type WhichOptions } from '../src/index.ts'

import { posix as isexePosix, win32 as isexeWin } from 'isexe'

const isWindows = process.platform === 'win32'

t.saveFixture = isWindows

const runTest = async (
  t: Test,
  exec: string,
  expect?: string[] | string | { code: string } | null,
  {
    platforms = ['posix', 'win32'],
    ..._opt
  }: WhichOptions & { platforms?: string[] } = {},
) => {
  for (const platform of platforms) {
    t.test(`${t.name} - ${platform}`, async t => {
      // pass in undefined if there are no opts to test default argß
      const opt = Object.keys(_opt).length ? { ..._opt } : undefined
      if (!isWindows)
        t.intercept(process, 'platform', { value: platform })
      const { which, whichSync } = await t.mockImport(
        '../src/index.ts',
        {
          isexe: isWindows ? isexeWin : isexePosix,
        },
      )
      const er = expect as { code: string } | null
      if (er?.code) {
        await t.rejects(() => which(exec, opt), er, 'async rejects')
        t.throws(() => whichSync(exec, opt), er, 'sync throws')
      } else {
        t.strictSame(await which(exec, opt), expect, 'async')
        t.strictSame(whichSync(exec, opt), expect, 'sync')
      }
    })
  }
}

t.test('does not find missed', async t => {
  const fixture = t.testdir()
  const cmd = join(fixture, 'foobar.sh')

  t.test('throw', async t => {
    await runTest(t, cmd, { code: 'ENOENT' })
  })
  t.test('nothrow', async t => {
    await runTest(t, cmd, null, { nothrow: true })
  })
})

t.test('windows style', async t => {
  const path = t.testdir({
    'foo.sh': 'shell script',
    'foo.cmd': 'batch script',
    'foo.txt': 'bare file',
  })
  t.intercept(process, 'platform', { value: 'win32' })
  const { which, whichSync } = await t.mockImport('../src/index.ts', {
    isexe: isexeWin,
    path: { ...pathModule, delimiter: pathModule.win32.delimiter },
  })
  t.match(await which('foo', { path, pathExt: '.CMD' }), /foo\.cmd$/i)
  t.match(await which('foo', { path, pathExt: '.SH' }), /foo\.sh$/i)
  t.match(
    await which('foo', { path, pathExt: '.CMD;.SH' }),
    /foo\.cmd$/i,
  )
  t.match(
    await which('foo', { path, pathExt: '.SH;.CMD' }),
    /foo\.sh$/i,
  )
  await t.rejects(which('foo', { path, pathExt: '.EXE' }))

  t.match(
    await which('foo', {
      path,
      pathExt: '.SH;.CMD',
      all: true,
    }),
    new Set([/foo\.sh/i, /foo\.cmd$/i]),
  )

  t.match(whichSync('foo', { path, pathExt: '.CMD' }), /foo\.cmd$/i)
  t.match(whichSync('foo', { path, pathExt: '.SH' }), /foo\.sh$/i)
  t.match(
    whichSync('foo', { path, pathExt: '.CMD;.SH' }),
    /foo\.cmd$/i,
  )
  t.match(
    whichSync('foo', { path, pathExt: '.SH;.CMD' }),
    /foo\.sh$/i,
  )
  t.throws(() => whichSync('foo', { path, pathExt: '.EXE' }))
  t.match(
    whichSync('foo', {
      path,
      pathExt: '.SH;.CMD',
      all: true,
    }),
    new Set([/foo\.sh$/i, /foo\.cmd$/i]),
  )
})

t.test('does not find non-executable', async t => {
  const dir = t.testdir({ 'foo.sh': 'echo foo\n' })
  const foo = join(dir, 'foo.sh')

  t.test('absolute', async t => {
    await runTest(t, foo, { code: 'ENOENT' })
  })

  t.test('with path', async t => {
    await runTest(t, basename(foo), { code: 'ENOENT' }, { path: dir })
  })
})

t.test('find when executable', async t => {
  const fixture = t.testdir({ 'foo.sh': 'echo foo\n' })
  const foo = join(fixture, 'foo.sh')
  fs.chmodSync(foo, 0o755)

  // windows needs to explicitly look for .sh files by default
  const opts = isWindows ? { pathExt: '.SH' } : {}

  t.test('absolute', async t => {
    await runTest(t, foo, foo, opts)
  })

  t.test('with process.env.PATH', async t => {
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        PATH: fixture,
      },
    })
    await runTest(t, basename(foo), foo, opts)
  })

  t.test('with path opt', async t => {
    await runTest(t, basename(foo), foo, { ...opts, path: fixture })
  })

  t.test('no ./', async t => {
    const rel = relative(process.cwd(), foo)
    await runTest(t, rel, rel, opts)
  })

  t.test('with ./', async t => {
    const rel = `.${sep}${relative(process.cwd(), foo)}`
    await runTest(t, rel, rel, opts)
  })

  t.test('with ../', async t => {
    const dir = basename(process.cwd())
    const rel = join('..', dir, relative(process.cwd(), foo))
    await runTest(t, rel, rel, opts)
  })
})

t.test('find all', async t => {
  const cmdName = 'x.cmd'
  const fixture = t.testdir({
    all: {
      a: { [cmdName]: 'exec me' },
      b: { [cmdName]: 'exec me' },
    },
  })
  const dirs = [join(fixture, 'all', 'a'), join(fixture, 'all', 'b')]
  const cmds = dirs.map(dir => {
    const cmd = join(dir, cmdName)
    fs.chmodSync(cmd, 0o755)
    return cmd
  })
  await runTest(t, cmdName, cmds, {
    all: true,
    path: dirs
      .map((dir, index) => (index % 2 ? dir : `"${dir}"`))
      .join(delimiter),
  })
})

t.test('pathExt', async t => {
  const fixture = t.testdir({ 'foo.sh': 'echo foo\n' })
  const foo = join(fixture, 'foo.sh')
  fs.chmodSync(foo, 0o755)

  const pathExt = '.sh'
  const opts = { platforms: ['win32'] }

  t.test('foo.sh - env vars', async t => {
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        PATHEXT: pathExt,
        PATH: fixture,
      },
    })
    await runTest(t, basename(foo), foo, opts)
  })

  t.test('foo.sh - opts', async t => {
    await runTest(t, basename(foo), foo, {
      ...opts,
      path: fixture,
      pathExt,
    })
  })

  t.test('foo - env vars', async t => {
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        PATHEXT: pathExt,
        PATH: fixture,
      },
    })
    await runTest(t, basename(foo, '.sh'), foo, opts)
  })

  t.test('foo - opts', async t => {
    await runTest(t, basename(foo, '.sh'), foo, {
      ...opts,
      path: fixture,
      pathExt,
    })
  })

  t.test('foo - no pathext', async t => {
    await runTest(
      t,
      basename(foo, '.sh'),
      { code: 'ENOENT' },
      {
        ...opts,
        path: fixture,
        pathExt: '',
      },
    )
  })
})
