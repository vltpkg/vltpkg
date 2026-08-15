import t from 'tap'
import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { unload } from '@vltpkg/vlt-json'
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

const mockAuditWithFindings = async (
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
      '@vltpkg/query': {
        Query: class MockQuery {
          edges: any
          nodes: any
          importers: any
          securityArchive: any
          constructor(opts: any) {
            this.edges = opts.edges
            this.nodes = opts.nodes
            this.importers = opts.importers
            this.securityArchive = opts.securityArchive
          }
          async search() {
            // Return a node with malformed malware insights to trigger warning
            const malformedNode = {
              id: 'pkg:foo@1.0.0',
              name: 'foo',
              version: '1.0.0',
              insights: {
                // Malformed malware insights - missing low, medium, high, critical
                malware: { notaleveledinsight: true },
                scanned: true,
              },
              edgesIn: new Set(),
            }
            return { nodes: [malformedNode] }
          }
        },
      },
      ...mocks,
    },
  )

/**
 * Mocks `@vltpkg/query`'s `Query` to return a caller-supplied set of
 * nodes from `search()`, regardless of query string -- used to test
 * how `audit.ts` itself classifies/aggregates whatever the query
 * returns (e.g. direct vs transitive), independent of the real DSS
 * engine's selector matching.
 */
const mockAuditWithNodes = async (
  t: Test,
  {
    graph: g,
    nodes,
    ...mocks
  }: { graph: Graph.Graph; nodes: unknown[] } & Record<string, any>,
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
      '@vltpkg/query': {
        Query: class MockQuery {
          async search() {
            return { nodes }
          }
        },
      },
      ...mocks,
    },
  )

const Command = await mockAudit(t)
const CommandWithFindings = await mockAuditWithFindings(t)

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

const runCommandWithFindings = async ({
  options = {},
  positionals = [],
  values,
}: {
  options?: object
  positionals?: string[]
  values: Partial<LoadedConfig['values']> & {
    view: Exclude<LoadedConfig['values']['view'], 'inspect'>
  }
}) =>
  runCommand({ options, positionals, values }, CommandWithFindings)

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
    const logs = t.capture(console, 'error').args
    const noPkgOptions = {
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      projectRoot: t.testdirName,
    }
    noPkgOptions.packageJson.maybeRead = () => undefined

    const result = await runCommand({
      values: { view: 'json', loglevel: 'warn' },
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

  t.test('usage function returns command usage', async t => {
    const usage = Command.usage()
    const usageStr = usage.usage()
    t.match(
      usageStr,
      /Check installed dependencies for security issues/,
    )
    t.match(usageStr, /--audit-level/)
    t.match(usageStr, /--view/)
    t.match(usageStr, /vlt audit/)
    t.match(usageStr, /vlt audit --audit-level=high/)
    t.match(usageStr, /vlt audit --view=json/)
  })

  t.test(
    'warn callback is called for malformed insights when loglevel is warn',
    async t => {
      const stderrLogs = t.capture(console, 'error').args
      const optionsWithWarn = {
        ...options,
      }
      optionsWithWarn.packageJson.read = () =>
        graph.mainImporter.manifest!

      await runCommandWithFindings({
        values: {
          view: 'json',
          loglevel: 'warn',
        },
        options: optionsWithWarn,
      })

      // The warning should be logged for malformed malware insights
      t.match(stderrLogs(), /ignoring malformed malware insights/)
    },
  )

  t.test('different audit levels build correct queries', async t => {
    // Test that the command function handles different audit levels
    const levels = ['low', 'moderate', 'high', 'critical']
    for (const level of levels) {
      const result = await runCommand({
        values: { view: 'json', 'audit-level': level },
        options,
      })
      const parsed = JSON.parse(result as string)
      t.ok(parsed, `should return result for audit-level=${level}`)
    }
  })

  t.test(
    'classifies a workspace-declared dependency as direct',
    async t => {
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
        'vlt.json': JSON.stringify({
          workspaces: { packages: ['./packages/*'] },
        }),
        packages: {
          b: {
            'package.json': JSON.stringify({
              name: 'b',
              version: '1.0.0',
              dependencies: { evil: '^1.0.0' },
            }),
          },
        },
      })
      t.chdir(dir)
      unload()

      const monorepo = Monorepo.load(dir)
      const workspaceGraph = new Graph.Graph({
        ...specOptions,
        projectRoot: dir,
        mainManifest,
        monorepo,
      })
      const wsNode = [...workspaceGraph.importers].find(
        i => i.name === 'b',
      )
      if (!wsNode) throw new Error('workspace b not found')
      const evilNode = workspaceGraph.placePackage(
        wsNode,
        'prod',
        Spec.parse('evil@^1.0.0', specOptions),
        { name: 'evil', version: '1.0.0' },
      )
      if (!evilNode) throw new Error('failed to place evil@1.0.0')

      const workspaceOptions = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
        monorepo,
      }
      workspaceOptions.packageJson.read = () => mainManifest
      workspaceOptions.packageJson.maybeRead = () => mainManifest

      const CommandWithWorkspaceFinding = await mockAuditWithNodes(
        t,
        {
          graph: workspaceGraph,
          nodes: [
            {
              id: evilNode.id,
              name: 'evil',
              version: '1.0.0',
              insights: {
                malware: {
                  low: false,
                  medium: false,
                  high: false,
                  critical: true,
                },
              },
            },
          ],
        },
      )

      const result = await runCommand(
        { values: { view: 'json' }, options: workspaceOptions },
        CommandWithWorkspaceFinding,
      )
      const parsed = JSON.parse(result as string)
      const evilPkg = parsed.summary.critical.find(
        (p: { name: string }) => p.name === 'evil',
      )
      t.ok(evilPkg, 'evil should be reported as a critical finding')
      t.equal(
        evilPkg.direct,
        true,
        'a dependency declared directly by a non-main workspace should be direct, not transitive',
      )
    },
  )

  t.test(
    'exit code is 1 when findings exist, 0 when none',
    async t => {
      const originalExitCode = process.exitCode
      try {
        // Test with findings
        const CommandWithFindings = await mockAuditWithNodes(t, {
          nodes: [
            {
              id: 'pkg:foo@1.0.0',
              name: 'foo',
              version: '1.0.0',
              insights: {
                malware: {
                  low: false,
                  medium: false,
                  high: false,
                  critical: true,
                },
              },
            },
          ],
        })

        process.exitCode = 0
        const config = {
          options: {},
          positionals: [],
          values: { view: 'json' },
          get: (key: string) => ({ view: 'json' })[key],
        } as LoadedConfig

        await CommandWithFindings.command(config)
        t.equal(
          process.exitCode,
          1,
          'should exit with code 1 when findings are present',
        )

        // Test without findings
        const CommandWithoutFindings = await mockAuditWithNodes(t, {
          nodes: [],
        })

        process.exitCode = 0
        await CommandWithoutFindings.command(config)
        t.equal(
          process.exitCode,
          0,
          'should exit with code 0 when no findings exist',
        )
      } finally {
        process.exitCode = originalExitCode
      }
    },
  )

  t.test(
    'vuln insights (CVE-only findings) are properly aggregated',
    async t => {
      // Test that packages with ONLY vuln findings (no malware/severity/squat)
      // are properly aggregated. This was the bug: :vulnerable/:vuln were in
      // the query, but aggregateBySeverity never read insights.vuln, so these
      // packages were silently dropped.
      const CommandWithVulnOnly = await mockAuditWithNodes(t, {
        nodes: [
          {
            id: 'pkg:vulnerable-pkg@1.0.0',
            name: 'vulnerable-pkg',
            version: '1.0.0',
            insights: {
              // CVE-only finding with no malware/severity/squat
              vuln: {
                low: false,
                medium: false,
                high: true, // high severity CVE
                critical: false,
              },
              scanned: true,
            },
          },
          {
            id: 'pkg:crit-cve@2.0.0',
            name: 'crit-cve',
            version: '2.0.0',
            insights: {
              // Critical CVE with no other findings
              vuln: {
                low: false,
                medium: false,
                high: false,
                critical: true,
              },
              scanned: true,
            },
          },
        ],
      })

      const result = await runCommand(
        { values: { view: 'json' }, options: {} },
        CommandWithVulnOnly,
      )
      const parsed = JSON.parse(result as string)

      t.ok(
        parsed.summary.high.find(
          (p: { name: string }) => p.name === 'vulnerable-pkg',
        ),
        'CVE high severity package should be reported in high bucket',
      )
      t.ok(
        parsed.summary.critical.find(
          (p: { name: string }) => p.name === 'crit-cve',
        ),
        'CVE critical severity package should be reported in critical bucket',
      )
      t.equal(
        parsed.total,
        2,
        'total should count both CVE-only findings',
      )
    },
  )
})
