import t from 'tap'
import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Test } from 'tap'

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
}

const graph = new Graph.Graph({
  projectRoot: t.testdirName,
  ...specOptions,
  mainManifest: {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      bar: '^1.0.0',
    },
  },
})

const mockAudit = async (
  t: Test,
  { graph: g = graph, ...mocks }: Record<string, any> = {},
) =>
  t.mockImport<typeof import('../../src/commands/audit.ts')>(
    '../../src/commands/audit.ts',
    {
      '@vltpkg/graph': t.createMock(Graph, {
        actual: {
          load: () => g,
        },
      }),
      '@vltpkg/security-archive': {
        SecurityArchive: {
          async start() {
            return {
              ok: true,
              get: () => undefined,
            }
          },
        },
      },
      ...mocks,
    },
  )

const Command = await mockAudit(t)

const runCommand = async (
  {
    options = {},
    positionals = [],
    values,
  }: {
    options?: object
    positionals?: string[]
    values: Partial<LoadedConfig['values']> & {
      view: Exclude<LoadedConfig['values']['view'], 'inspect'>
    }
  },
  cmd = Command,
) => {
  const config = {
    options,
    positionals,
    values,
    get: (key: string) => (values as Record<string, unknown>)[key],
  } as LoadedConfig
  const res = await cmd.command(config)
  const output =
    values.view === 'silent' ? undefined
    : values.view === 'human' ? cmd.views.human(res)
    : values.view === 'count' ? cmd.views.count(res)
    : cmd.views.json(res)
  return values.view === 'json' ?
      JSON.stringify(output, null, 2)
    : output
}

t.test('audit', async t => {
  t.ok(Command.usage, 'should have usage')
  t.ok(Command.command, 'should have command')
  t.ok(Command.views, 'should have views')

  const options = {
    scurry: new PathScurry(),
    packageJson: new PackageJson(),
    projectRoot: t.testdirName,
  }
  options.packageJson.read = () => graph.mainImporter.manifest!

  t.test('human view shows zero issues when none found', async t => {
    const result = await runCommand({
      values: { view: 'human' },
      options,
    })
    t.match(result, /0 packages with security issues/)
  })

  t.test('json view returns AuditResult structure', async t => {
    const result = await runCommand({
      values: { view: 'json' },
      options,
    })
    t.ok(typeof result === 'string')
    const parsed = JSON.parse(result as string)
    t.equal(parsed.total, 0)
    t.ok(parsed.summary)
    t.ok(Array.isArray(parsed.summary.critical))
  })

  t.test('count view returns 0', async t => {
    const result = await runCommand({
      values: { view: 'count' },
      options,
    })
    t.equal(result, 0)
  })

  t.test('no package.json found in project root', async t => {
    const logs = t.capture(console, 'log').args
    const noPkgOptions = {
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      projectRoot: t.testdirName,
    }
    noPkgOptions.packageJson.maybeRead = () => undefined

    const result = await runCommand({
      values: { view: 'json' },
      options: noPkgOptions,
    })

    t.strictSame(logs(), [['No package.json found in project root']])
    t.strictSame(JSON.parse(result as string), {
      summary: { critical: [], high: [], moderate: [], low: [] },
      total: 0,
      directCount: 0,
      indirectCount: 0,
    })
  })
})
