import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'

t.cleanSnapshot = (str: string) => str.replaceAll(/\\+/g, '/')

const { init } = await t.mockImport<typeof import('../src/init.ts')>(
  '../src/init.ts',
  {
    '@vltpkg/git': {
      async getUser() {
        return { name: 'User', email: 'foo@bar.ca' }
      },
    },
  },
)

t.test('init', async t => {
  const dir = t.testdir({
    'my-project': {},
  })
  const logs: unknown[][] = []

  t.matchSnapshot(
    await init({
      cwd: resolve(dir, 'my-project'),
      logger: (...a: unknown[]) => logs.push(a),
    }),
    'should initialize the data',
  )

  t.matchSnapshot(logs, 'should output expected logs')

  t.matchSnapshot(
    readFileSync(resolve(dir, 'my-project', 'package.json'), 'utf8'),
    'should init a new package.json file',
  )
})

t.test('init existing', async t => {
  const dir = t.testdir({
    'my-project': {
      'package.json': JSON.stringify({ name: 'my-project' }),
    },
  })
  const logs: unknown[][] = []
  const logger = (...a: unknown[]) => logs.push(a)

  await init({ cwd: resolve(dir, 'my-project'), logger })
  t.strictSame(logs, [['package.json already exists']])
})

t.test('unknown error reading package.json file', async t => {
  const { init } = await t.mockImport<
    typeof import('../src/init.ts')
  >('../src/init.ts', {
    '@vltpkg/git': {
      async getUser() {
        return { name: 'User', email: 'foo@bar.ca' }
      },
    },
    '@vltpkg/package-json': {
      PackageJson: class {
        read() {
          throw new Error('Unknown error')
        }
      },
    },
  })

  const dir = t.testdir({
    'my-project': {
      'package.json': JSON.stringify({ name: 'my-project' }),
    },
  })

  await t.rejects(
    init({ cwd: resolve(dir, 'my-project') }),
    /Unknown error/,
    'should throw the unknown error',
  )
})

t.test('missing user info', async t => {
  const { init } = await t.mockImport<
    typeof import('../src/init.ts')
  >('../src/init.ts', {
    '@vltpkg/git': {
      async getUser() {
        return undefined
      },
    },
  })

  const dir = t.testdir({
    'my-project': {},
  })

  const logs: unknown[][] = []

  t.matchSnapshot(
    await init({
      cwd: resolve(dir, 'my-project'),
      logger: (...a: unknown[]) => logs.push(a),
    }),
    'should initialize with data',
  )
  t.matchSnapshot(
    logs,
    'should output expected message when no user info is found',
  )

  t.matchSnapshot(
    readFileSync(resolve(dir, 'my-project', 'package.json'), 'utf8'),
    'should init a new package.json file with no user info',
  )
})

t.test('init with author info', async t => {
  const dir = t.testdir({
    'my-project': {},
  })

  t.matchSnapshot(
    await init({
      cwd: resolve(dir, 'my-project'),
      author: 'Ruy Adorno',
    }),
    'should output expected message with author info',
  )

  t.matchSnapshot(
    readFileSync(resolve(dir, 'my-project', 'package.json'), 'utf8'),
    'should init a new package.json file with author info',
  )
})
