import t, { type Test } from 'tap'
import { setupCommand, setupEnv } from '../fixtures/run.js'
import * as Command from '../../src/commands/pkg.js'
import { readFileSync } from 'fs'
import { join } from 'path'

t.matchSnapshot(Command.usage().usage(), 'usage')

setupEnv(t)

t.afterEach(() => (process.exitCode = 0))

const parseLogs = (r: { logs: string }) => JSON.parse(r.logs)
const parseError = (r: { errs: string }) => r.errs

const setupPkg = async (
  t: Test,
  method?: string,
  packageJson: object = {},
  { indent = 2 } = {},
) => {
  const setup = await setupCommand<typeof Command>(t, {
    command: 'pkg',
    argv: method ? [method] : [],
    testdir: {
      'package.json': JSON.stringify(packageJson, null, indent),
    },
  })
  return {
    ...setup,
    readPackageJson: () =>
      readFileSync(join(setup.dir, 'package.json'), 'utf8'),
  }
}

t.test('basic', async t => {
  const { runCommand } = await setupPkg(t)
  const error = await runCommand(['gett']).then(parseError)
  t.match(error, 'Error: Unrecognized pkg command')
  t.match(error, 'Found: gett')
  t.match(error, 'Valid options: get, set, rm')
  t.equal(process.exitCode, 1)
})

t.test('init', async t => {
  const setup = await setupCommand<typeof Command>(t, {
    command: 'pkg',
    argv: ['init'],
    testdir: {},
    mocks: {
      '../../src/init.js': await t.mockImport('../../src/init.js', {
        '@vltpkg/git': {
          async getUser() {
            return {
              name: 'Ruy',
              email: 'ruy@example.com',
            }
          },
        },
      }),
    },
  })
  await setup.runCommand()
  t.matchSnapshot(
    readFileSync(join(setup.dir, 'package.json'), 'utf8'),
    'should init a new package.json file',
  )
})

t.test('get', async t => {
  const pkg = {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
    },
  }
  const { runCommand } = await setupPkg(t, 'get', pkg)
  t.strictSame(await runCommand().then(parseLogs), pkg)
  t.strictSame(await runCommand(['name']).then(parseLogs), pkg.name)
  t.strictSame(
    await runCommand(['nested.keywords[3].obj[1]']).then(parseLogs),
    (pkg.nested.keywords[3] as { obj: string[] }).obj[1],
  )
  const error = await runCommand(['name', 'version']).then(parseError)
  t.match(
    error,
    'Error: get requires not more than 1 argument. use `pick` to get more than 1.',
  )
})

t.test('pick', async t => {
  const pkg = {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
    },
  }
  const { runCommand } = await setupPkg(t, 'pick', pkg)
  t.strictSame(await runCommand().then(parseLogs), pkg)
  t.strictSame(await runCommand(['name']).then(parseLogs), {
    name: pkg.name,
  })
  t.strictSame(
    await runCommand(['nested.keywords[3].obj[1]']).then(parseLogs),
    {
      nested: {
        keywords: [null, null, null, { obj: [null, 'arrays'] }],
      },
    },
  )
  t.strictSame(
    await runCommand(['nested.keywords']).then(parseLogs),
    {
      nested: {
        keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
      },
    },
  )
  t.strictSame(
    await runCommand(['name', 'version']).then(parseLogs),
    {
      name: pkg.name,
      version: pkg.version,
    },
  )
})

t.test('set', async t => {
  const { runCommand, readPackageJson } = await setupPkg(t, 'set', {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
  })
  t.strictSame(await runCommand(['name=new-package-name']), {
    errs: '',
    logs: '',
  })
  t.strictSame(JSON.parse(readPackageJson()), {
    name: 'new-package-name',
    version: '1.0.0',
    description: 'This is the desc',
  })
  t.match(
    await runCommand().then(parseError),
    'set requires arguments',
  )
  t.match(
    await runCommand(['name']).then(parseError),
    'set arguments must contain `=`',
  )
})

t.test('delete', async t => {
  const { runCommand, readPackageJson } = await setupPkg(t, 'rm', {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
    },
  })
  t.strictSame(await runCommand(['name']), {
    errs: '',
    logs: '',
  })
  t.strictSame(await runCommand(['nested.keywords[3].obj[0]']), {
    errs: '',
    logs: '',
  })
  t.strictSame(JSON.parse(readPackageJson()), {
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['arrays'] }],
    },
  })
  t.match(
    await runCommand().then(parseError),
    'rm requires arguments',
  )
})
