import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'

t.cleanSnapshot = (str: string) => str.replaceAll(/\\+/g, '/')

const { init } = await t.mockImport<typeof import('../src/index.ts')>(
  '../src/index.ts',
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
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '2.0.0',
        description: 'existing description',
        private: true,
      }),
    },
  })
  const logs: unknown[][] = []
  const logger = (...a: unknown[]) => logs.push(a)

  const result = await init({
    cwd: resolve(dir, 'my-project'),
    logger,
  })
  t.strictSame(logs, [['package.json already exists']])

  // Should return the merged manifest
  t.ok(result.manifest, 'should return manifest info')

  // Should preserve existing properties
  t.equal(
    result.manifest?.data.name,
    'my-project',
    'should preserve existing name',
  )
  t.equal(
    result.manifest?.data.version,
    '2.0.0',
    'should preserve existing version',
  )
  t.equal(
    result.manifest?.data.description,
    'existing description',
    'should preserve existing description',
  )
  t.equal(
    result.manifest?.data.private,
    true,
    'should preserve existing private flag',
  )

  // Should add missing template properties
  t.equal(
    result.manifest?.data.main,
    'index.js',
    'should add missing main',
  )
  t.match(
    result.manifest?.data.author,
    {
      name: 'User',
      email: 'foo@bar.ca',
    },
    'should add missing author',
  )

  // Verify the file was actually updated
  const fileContent = JSON.parse(
    readFileSync(resolve(dir, 'my-project', 'package.json'), 'utf8'),
  )
  t.equal(
    fileContent.name,
    'my-project',
    'file should preserve existing name',
  )
  t.equal(
    fileContent.version,
    '2.0.0',
    'file should preserve existing version',
  )
  t.equal(
    fileContent.description,
    'existing description',
    'file should preserve existing description',
  )
  t.equal(
    fileContent.private,
    true,
    'file should preserve existing private flag',
  )
  t.equal(
    fileContent.main,
    'index.js',
    'file should add missing main',
  )
  t.same(
    fileContent.author,
    {
      name: 'User',
      email: 'foo@bar.ca',
    },
    'file should add missing author',
  )
})

t.test('unknown error reading package.json file', async t => {
  const { init } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
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
    typeof import('../src/index.ts')
  >('../src/index.ts', {
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

t.test('init existing partial package.json', async t => {
  const dir = t.testdir({
    'my-project': {
      'package.json': JSON.stringify({
        name: 'existing-name',
        scripts: { test: 'echo test' },
        dependencies: { lodash: '^4.0.0' },
      }),
    },
  })
  const logs: unknown[][] = []
  const logger = (...a: unknown[]) => logs.push(a)

  const result = await init({
    cwd: resolve(dir, 'my-project'),
    logger,
  })
  t.strictSame(logs, [['package.json already exists']])

  // Should preserve all existing properties
  t.equal(
    result.manifest?.data.name,
    'existing-name',
    'should preserve existing name',
  )
  t.same(
    result.manifest?.data.scripts,
    { test: 'echo test' },
    'should preserve existing scripts',
  )
  t.same(
    result.manifest?.data.dependencies,
    { lodash: '^4.0.0' },
    'should preserve existing dependencies',
  )

  // Should add missing properties from template
  t.equal(
    result.manifest?.data.version,
    '1.0.0',
    'should add missing version from template',
  )
  t.equal(
    result.manifest?.data.description,
    '',
    'should add missing description from template',
  )
  t.equal(
    result.manifest?.data.main,
    'index.js',
    'should add missing main from template',
  )
  t.match(
    result.manifest?.data.author,
    {
      name: 'User',
      email: 'foo@bar.ca',
    },
    'should add missing author from template',
  )
})
