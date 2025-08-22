import { XDG } from '@vltpkg/xdg'
import { readFileSync, writeFileSync } from 'node:fs'
import { lstat } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'

t.test('create new project file if not found', async t => {
  const dir = t.testdir({
    a: {
      b: {
        c: {},
        'package.json': JSON.stringify({}),
      },
    },
  })
  t.chdir(resolve(dir, 'a/b/c'))

  const { load, save, find } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    'node:os': t.createMock(await import('node:os'), {
      homedir: () => t.testdirName,
    }),
  })
  t.equal(
    find(),
    resolve(dir, 'a/b/vlt.json'),
    'default to location of pj file',
  )

  let validatorRan = false
  const foo = load('foo', (x): x is { foo: boolean } => {
    validatorRan = true
    return (
      !!x && t.strictSame(x, { foo: (x as { foo: boolean }).foo })
    )
  })
  t.equal(foo, undefined)
  t.equal(validatorRan, false)
  save('foo', { foo: true })
  t.equal(validatorRan, true)
})

t.test('load, edit, save existing project file', async t => {
  const dir = t.testdir({
    'vlt.json':
      JSON.stringify(
        {
          foo: { foo: true },
          bar: false,
        },
        null,
        2,
      ) + '\n',
    a: { b: { c: {} } },
  })
  t.chdir(resolve(dir, 'a/b/c'))

  const { load, save, find } =
    await t.mockImport<typeof import('../src/index.ts')>(
      '../src/index.ts',
    )
  t.equal(find(), resolve(dir, 'vlt.json'))
  let validatorRan = false
  const foo = load('foo', (x): x is { foo: boolean } => {
    validatorRan = true
    return t.strictSame(x, { foo: (x as { foo: boolean }).foo })
  })
  t.equal(validatorRan, true)
  t.strictSame(foo, { foo: true })
  const bar = load('bar', (x): asserts x is boolean => {
    if (x !== !!x) throw new Error('nope')
  })
  t.equal(bar, false)
  save('bar', true)
  t.equal(
    readFileSync(resolve(dir, 'vlt.json'), 'utf8'),
    JSON.stringify(
      {
        foo: {
          foo: true,
        },
        bar: true,
      },
      null,
      2,
    ) + '\n',
  )
  save('foo', { foo: false })
  t.equal(
    readFileSync(resolve(dir, 'vlt.json'), 'utf8'),
    JSON.stringify(
      {
        foo: {
          foo: false,
        },
        bar: true,
      },
      null,
      2,
    ) + '\n',
  )
  t.throws(() => save('bar', 99))
  t.throws(() => save('unknown', 'value'))
  t.equal(
    readFileSync(resolve(dir, 'vlt.json'), 'utf8'),
    JSON.stringify(
      {
        foo: {
          foo: false,
        },
        bar: true,
      },
      null,
      2,
    ) + '\n',
    'no change from attempted invalid saves',
  )
})

t.test('do not clobber file if edited out of band', async t => {
  const dir = t.testdir({
    a: {
      b: {
        'vlt.json': JSON.stringify('hello'),
        c: {},
        'package.json': JSON.stringify({}),
      },
    },
  })
  t.chdir(resolve(dir, 'a/b/c'))

  let MTIME = new Date(Date.now() - 10_000)
  const { load, save, find, reload } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    'node:os': t.createMock(await import('node:os'), {
      homedir: () => t.testdirName,
    }),
    'node:fs/promises': t.createMock(
      await import('node:fs/promises'),
      {
        lstat: async (path: string) => {
          const st = await lstat(path)
          st.mtime = MTIME
          return st
        },
      },
    ),
  })
  t.equal(
    find(),
    resolve(dir, 'a/b/vlt.json'),
    'default to location of pj file',
  )

  let validatorRan = false
  const validator = (x: unknown): x is { foo: boolean } => {
    validatorRan = true
    return (
      !!x && t.strictSame(x, { foo: (x as { foo: boolean }).foo })
    )
  }
  const foo = load('foo', validator)
  t.equal(foo, undefined)
  t.equal(validatorRan, false)
  writeFileSync(resolve(dir, 'a/b/vlt.json'), '{}')
  MTIME = new Date(Date.now() + 10_000)
  t.throws(() => save('foo', { foo: true }), {
    message:
      'File was changed by another process, cannot safely write',
  })
  t.equal(reload('foo'), undefined)
  save('foo', { foo: true })
  t.equal(
    readFileSync(resolve(dir, 'a/b/vlt.json'), 'utf8'),
    JSON.stringify({ foo: { foo: true } }, null, 2) + '\n',
  )
})

t.test('do not use user config as project config', async t => {
  class MockXDG extends XDG {
    config() {
      return resolve(t.testdirName, 'vlt.json')
    }
  }

  const dir = t.testdir({
    'vlt.json':
      JSON.stringify(
        {
          foo: { foo: true },
          bar: false,
        },
        null,
        2,
      ) + '\n',
    a: { b: { node_modules: {}, c: {} } },
  })

  t.chdir(resolve(dir, 'a/b/c'))
  const { load, save, find } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', { '@vltpkg/xdg': { XDG: MockXDG } })
  t.equal(find(), resolve(dir, 'a/b/vlt.json'))

  function assertBoolean(b: unknown): asserts b is boolean {
    if (b !== !!b) throw new Error('nope')
  }

  t.equal(find('user'), resolve(dir, 'vlt.json'))
  t.equal(load('bar', assertBoolean, 'user'), false)
  t.throws(() => save('bar', 123, 'user'))
  save('bar', true, 'user')

  t.equal(
    readFileSync(resolve(dir, 'vlt.json'), 'utf8'),
    JSON.stringify(
      {
        foo: { foo: true },
        bar: true,
      },
      null,
      2,
    ) + '\n',
  )
})

t.test('missing vlt.json is no big deal', async t => {
  class MockXDG extends XDG {
    config() {
      return resolve(t.testdirName, 'vlt.json')
    }
  }
  t.testdir({})
  const { load } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    '@vltpkg/xdg': { XDG: MockXDG },
  })
  const data = load('foo', () => {}, 'user')
  t.equal(data, undefined)
})

t.test('fail to parse vlt.json file', async t => {
  class MockXDG extends XDG {
    config() {
      return resolve(t.testdirName, 'vlt.json')
    }
  }
  const dir = t.testdir({ 'vlt.json': 'hello' })
  const { load } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    '@vltpkg/xdg': { XDG: MockXDG },
  })
  t.throws(() => load('foo', () => {}, 'user'), {
    cause: {
      path: resolve(dir, 'vlt.json'),
      cause: {
        name: 'JSONParseError',
        code: 'EJSONPARSE',
      },
    },
  })
})

t.test(
  'throw away undefined value at load without throwing',
  async t => {
    const dir = t.testdir({
      'vlt.json':
        JSON.stringify(
          {
            foo: { foo: true },
          },
          null,
          2,
        ) + '\n',
      a: { b: { c: {} } },
    })

    t.chdir(resolve(dir, 'a/b/c'))

    const { load, save, find } =
      await t.mockImport<typeof import('../src/index.ts')>(
        '../src/index.ts',
      )
    t.equal(find(), resolve(dir, 'vlt.json'))

    function assertBoolean(b: unknown): asserts b is boolean {
      if (b !== !!b) throw new Error('nope')
    }

    t.equal(load('bar', assertBoolean), undefined)
    t.throws(() => save('bar', 123))
    save('bar', true)

    t.equal(
      readFileSync(resolve(dir, 'vlt.json'), 'utf8'),
      JSON.stringify(
        {
          foo: { foo: true },
          bar: true,
        },
        null,
        2,
      ) + '\n',
    )
  },
)

t.test('do not walk up past a .git folder', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ root: true }),
    a: {
      '.git': {},
      b: {
        'package.json': JSON.stringify({}),
        c: {},
      },
    },
  })
  t.chdir(resolve(dir, 'a/b/c'))

  const { load, save, find, unload } =
    await t.mockImport<typeof import('../src/index.ts')>(
      '../src/index.ts',
    )

  t.equal(find('project'), resolve(dir, 'a/b/vlt.json'))
  const assertBool = (b: unknown): asserts b is boolean => {
    if (b !== !!b) throw new Error('expected boolean')
  }
  t.equal(load('root', assertBool), undefined)
  save('root', false)
  unload()
  t.equal(load('root', assertBool), false)
})
