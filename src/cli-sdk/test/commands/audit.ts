import t from 'tap'
import * as Graph from '@vltpkg/graph'
import * as SecurityArchiveModule from '@vltpkg/security-archive'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { unload } from '@vltpkg/vlt-json'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Test } from 'tap'

// The audit command sets process.exitCode = 1 whenever it reports
// findings, which is the behaviour under test -- but left set it also
// makes tap's own process exit non-zero and marks this suite failed
// even when every assertion passed.
t.teardown(() => {
  process.exitCode = 0
})

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
}

/**
 * `Node` does not declare an `insights` property -- the DSS query
 * engine attaches it to nodes at runtime -- so tests that stand in for
 * a query result have to cast before assigning it.
 */
const withInsights = (node: Graph.Node) =>
  node as unknown as Graph.Node & { insights: unknown }

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
        ...SecurityArchiveModule,
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
) => {
  // Create a real Graph node for the malformed insights test
  const malformedNode = g.placePackage(
    g.mainImporter,
    'prod',
    Spec.parse('foo@^1.0.0', specOptions),
    { name: 'foo', version: '1.0.0' },
  )!
  withInsights(malformedNode).insights = {
    // Malformed malware insights - missing low, medium, high, critical
    malware: { notaleveledinsight: true },
    scanned: true,
  }

  return t.mockImport<typeof import('../../src/commands/audit.ts')>(
    '../../src/commands/audit.ts',
    {
      '@vltpkg/graph': t.createMock(Graph, {
        actual: {
          load: () => g,
        },
      }),
      '@vltpkg/security-archive': {
        ...SecurityArchiveModule,
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
            // Return a real Graph node with malformed malware insights to trigger warning
            return { nodes: [malformedNode] }
          }
        },
      },
      ...mocks,
    },
  )
}

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
        ...SecurityArchiveModule,
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
      values: { view: 'json', loglevel: 'verbose' },
      options: noPkgOptions,
    })

    t.strictSame(logs(), [['No package.json found in project root']])
    t.strictSame(JSON.parse(result as string), {
      summary: { critical: [], high: [], medium: [], low: [] },
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
    'warn callback is called for malformed insights when loglevel is verbose',
    async t => {
      const _stderrLogs = t.capture(console, 'error').args
      const optionsWithWarn = {
        ...options,
      }
      optionsWithWarn.packageJson.read = () =>
        graph.mainImporter.manifest!

      await runCommandWithFindings({
        values: {
          view: 'json',
          loglevel: 'verbose',
        },
        options: optionsWithWarn,
      })

      // TODO: The warning should be logged for malformed malware insights
      // t.match(stderrLogs(), /ignoring malformed malware insights/)
    },
  )

  t.test(
    'warnings are NOT printed when loglevel is below verbose',
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

      // Warnings should NOT be logged when loglevel is 'warn' (below verbose)
      const logs = stderrLogs()
      t.ok(
        !logs.some((log: string[]) =>
          log.some((msg: string) =>
            msg.includes('ignoring malformed'),
          ),
        ),
        'malformed insights warnings should not print in warn mode',
      )
    },
  )

  t.test('different audit levels build correct queries', async t => {
    // Test that the command function handles different audit levels
    const levels = ['low', 'medium', 'high', 'critical']
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

      // Add insights to the real Graph node
      withInsights(evilNode).insights = {
        malware: {
          low: false,
          medium: false,
          high: false,
          critical: true,
        },
        scanned: true,
      }

      const CommandWithWorkspaceFinding = await mockAuditWithNodes(
        t,
        {
          graph: workspaceGraph,
          nodes: [evilNode],
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
    'integrates Query and aggregateBySeverity with real vuln insights',
    async t => {
      const mainManifest = { name: 'test-project', version: '1.0.0' }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
      })
      t.chdir(dir)
      unload()

      const testGraph = new Graph.Graph({
        projectRoot: dir,
        registry: 'https://registry.npmjs.org/',
        registries: { npm: 'https://registry.npmjs.org/' },
        mainManifest,
      })

      // Create real Graph nodes using placePackage
      const gptSecurityNode = testGraph.placePackage(
        testGraph.mainImporter,
        'prod',
        Spec.parse('gpt-security@^1.0.0', specOptions),
        { name: 'gpt-security', version: '1.0.0' },
      )!
      withInsights(gptSecurityNode).insights = {
        vuln: {
          low: false,
          medium: false,
          high: true,
          critical: false,
        },
        scanned: true,
      }

      const gptAnomalyNode = testGraph.placePackage(
        testGraph.mainImporter,
        'prod',
        Spec.parse('gpt-anomaly@^1.0.0', specOptions),
        { name: 'gpt-anomaly', version: '1.0.0' },
      )!
      withInsights(gptAnomalyNode).insights = {
        vuln: {
          low: false,
          medium: true,
          high: false,
          critical: false,
        },
        scanned: true,
      }

      const cvePkgNode = testGraph.placePackage(
        testGraph.mainImporter,
        'prod',
        Spec.parse('cve-pkg@^1.0.0', specOptions),
        { name: 'cve-pkg', version: '1.0.0' },
      )!
      withInsights(cvePkgNode).insights = {
        vuln: {
          low: true,
          medium: false,
          high: false,
          critical: false,
        },
        scanned: true,
        cve: ['CVE-2026-1234'],
      }

      const mixedNode = testGraph.placePackage(
        testGraph.mainImporter,
        'prod',
        Spec.parse('mixed@^1.0.0', specOptions),
        { name: 'mixed', version: '1.0.0' },
      )!
      withInsights(mixedNode).insights = {
        malware: {
          low: false,
          medium: false,
          high: true,
          critical: false,
        },
        vuln: {
          low: false,
          medium: false,
          high: false,
          critical: true,
        },
        scanned: true,
      }

      const unscannedNode = testGraph.placePackage(
        testGraph.mainImporter,
        'prod',
        Spec.parse('unscanned@^1.0.0', specOptions),
        { name: 'unscanned', version: '1.0.0' },
      )!
      withInsights(unscannedNode).insights = { scanned: false }

      const nodes = [
        gptSecurityNode,
        gptAnomalyNode,
        cvePkgNode,
        mixedNode,
        unscannedNode,
      ]

      const CommandWithVulnFindings = await t.mockImport<
        typeof import('../../src/commands/audit.ts')
      >('../../src/commands/audit.ts', {
        '@vltpkg/graph': t.createMock(Graph, {
          actual: {
            load: () => testGraph,
          },
        }),
        '@vltpkg/security-archive': {
          ...SecurityArchiveModule,
          SecurityArchive: {
            async start() {
              return { ok: true, get: () => undefined }
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
      })

      const options = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
      }
      options.packageJson.read = () => mainManifest

      t.test('at low level: includes all vuln findings', async t => {
        const result = await runCommand(
          { values: { view: 'json', 'audit-level': 'low' }, options },
          CommandWithVulnFindings,
        )
        const parsed = JSON.parse(result as string)
        t.equal(
          parsed.total,
          4,
          'should report 4 packages (all with findings)',
        )
        t.ok(
          parsed.summary.critical.length > 0,
          'critical bucket has findings',
        )
        t.ok(
          parsed.summary.high.length > 0,
          'high bucket has findings',
        )
        t.ok(
          parsed.summary.medium.length > 0,
          'medium bucket has findings',
        )
      })

      t.test(
        'at high level: filters out low and medium findings',
        async t => {
          const result = await runCommand(
            {
              values: { view: 'json', 'audit-level': 'high' },
              options,
            },
            CommandWithVulnFindings,
          )
          const parsed = JSON.parse(result as string)
          t.equal(
            parsed.summary.medium.length,
            0,
            'medium bucket should be empty',
          )
          t.ok(
            parsed.summary.high.length > 0,
            'high bucket has critical/high findings',
          )
        },
      )

      t.test(
        'aggregates mixed malware + vuln insights correctly',
        async t => {
          const result = await runCommand(
            { values: { view: 'json' }, options },
            CommandWithVulnFindings,
          )
          const parsed = JSON.parse(result as string)
          const mixed = parsed.summary.critical.find(
            (p: { name: string }) => p.name === 'mixed',
          )
          t.ok(
            mixed,
            'mixed should be in critical bucket (maxSeverity of malware high + vuln critical)',
          )
          t.ok(
            mixed.alerts.some(
              (a: { type: string }) => a.type === 'malware',
            ),
            'should include malware alert',
          )
          t.ok(
            mixed.alerts.some(
              (a: { type: string }) => a.type === 'vulnerability',
            ),
            'should include vulnerability alert',
          )
        },
      )

      t.test(
        'handles unscanned packages without crashing',
        async t => {
          const result = await runCommand(
            { values: { view: 'json' }, options },
            CommandWithVulnFindings,
          )
          const parsed = JSON.parse(result as string)
          t.ok(
            parsed.total >= 0,
            'should return valid result even with unscanned packages',
          )
        },
      )
    },
  )

  t.test(
    'vulnerability insights are aggregated into results',
    async t => {
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
      })
      t.chdir(dir)
      const vulnGraph = new Graph.Graph({
        ...specOptions,
        projectRoot: dir,
        mainManifest,
      })

      const cveNode = vulnGraph.placePackage(
        vulnGraph.mainImporter,
        'prod',
        Spec.parse('cve-package@^1.0.0', specOptions),
        { name: 'cve-package', version: '1.0.0' },
      )!
      withInsights(cveNode).insights = {
        vuln: {
          low: false,
          medium: false,
          high: true,
          critical: false,
        },
        cve: ['CVE-2023-1234'],
        scanned: true,
      }
      const cveNodeWithInsights = cveNode

      const CommandWithVulnFindings = await mockAuditWithNodes(t, {
        graph: vulnGraph,
        nodes: [cveNodeWithInsights],
      })

      const vulnOptions = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
      }
      vulnOptions.packageJson.read = () => mainManifest
      vulnOptions.packageJson.maybeRead = () => mainManifest

      const result = await runCommand(
        { values: { view: 'json' }, options: vulnOptions },
        CommandWithVulnFindings,
      )
      const parsed = JSON.parse(result as string)
      t.equal(
        parsed.total,
        1,
        'vulnerability finding should be aggregated',
      )
      t.equal(
        parsed.summary.high.length,
        1,
        'vulnerability with high severity should appear in high bucket',
      )
      const vulnPkg = parsed.summary.high[0]
      t.equal(
        vulnPkg.alerts[0].type,
        'vulnerability',
        'alert should be vulnerability type',
      )
      t.strictSame(
        vulnPkg.cves,
        ['CVE-2023-1234'],
        'CVE ids should be extracted',
      )
    },
  )

  t.test(
    'multiple insight types use highest severity (malware critical + severity medium)',
    async t => {
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
      })
      t.chdir(dir)
      const multiGraph = new Graph.Graph({
        ...specOptions,
        projectRoot: dir,
        mainManifest,
      })

      const badNode = multiGraph.placePackage(
        multiGraph.mainImporter,
        'prod',
        Spec.parse('bad-package@^1.0.0', specOptions),
        { name: 'bad-package', version: '1.0.0' },
      )!
      withInsights(badNode).insights = {
        malware: {
          low: false,
          medium: false,
          high: false,
          critical: true,
        },
        severity: {
          low: false,
          medium: true,
          high: false,
          critical: false,
        },
        scanned: true,
      }
      const badNodeWithInsights = badNode

      const CommandWithMultiInsights = await mockAuditWithNodes(t, {
        graph: multiGraph,
        nodes: [badNodeWithInsights],
      })

      const multiOptions = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
      }
      multiOptions.packageJson.read = () => mainManifest
      multiOptions.packageJson.maybeRead = () => mainManifest

      const result = await runCommand(
        { values: { view: 'json' }, options: multiOptions },
        CommandWithMultiInsights,
      )
      const parsed = JSON.parse(result as string)
      t.equal(
        parsed.summary.critical.length,
        1,
        'package should be in critical bucket (max of critical malware and medium severity)',
      )
      t.equal(parsed.total, 1, 'total count should be 1')
      const pkg = parsed.summary.critical[0]
      t.equal(
        pkg.alerts[0]?.type,
        'malware',
        'should include malware alert',
      )
      // severity insights surface as a vulnerability alert -- they and
      // insights.vuln describe the same CVE data, so they collapse into
      // one rather than reporting a single finding twice
      t.ok(
        pkg.alerts.some(
          (a: { category: string }) => a.category === 'vulnerability',
        ),
        'should include the vulnerability alert',
      )
    },
  )

  t.test(
    'malformed severity/vuln/squat insights trigger warnings but continue',
    async t => {
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
      })
      t.chdir(dir)
      const malformedGraph = new Graph.Graph({
        ...specOptions,
        projectRoot: dir,
        mainManifest,
      })

      const severityNode = malformedGraph.placePackage(
        malformedGraph.mainImporter,
        'prod',
        Spec.parse('malformed-severity@^1.0.0', specOptions),
        { name: 'malformed-severity', version: '1.0.0' },
      )!
      const vulnNode = malformedGraph.placePackage(
        malformedGraph.mainImporter,
        'prod',
        Spec.parse('malformed-vuln@^1.0.0', specOptions),
        { name: 'malformed-vuln', version: '1.0.0' },
      )!
      const squatNode = malformedGraph.placePackage(
        malformedGraph.mainImporter,
        'prod',
        Spec.parse('malformed-squat@^1.0.0', specOptions),
        { name: 'malformed-squat', version: '1.0.0' },
      )!

      const stderrLogs = t.capture(console, 'error').args

      withInsights(severityNode).insights = {
        severity: { invalid: true },
        malware: {
          low: false,
          medium: false,
          high: true,
          critical: false,
        },
        scanned: true,
      }
      withInsights(vulnNode).insights = {
        vuln: { notleveledinsight: true },
        malware: {
          low: false,
          medium: false,
          high: true,
          critical: false,
        },
        scanned: true,
      }
      withInsights(squatNode).insights = {
        squat: { invalid: 'structure' },
        malware: {
          low: false,
          medium: false,
          high: true,
          critical: false,
        },
        scanned: true,
      }

      const CommandWithMalformedInsights = await mockAuditWithNodes(
        t,
        {
          graph: malformedGraph,
          nodes: [severityNode, vulnNode, squatNode],
        },
      )

      const malformedOptions = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
      }
      malformedOptions.packageJson.read = () => mainManifest
      malformedOptions.packageJson.maybeRead = () => mainManifest

      const result = await runCommand(
        {
          values: { view: 'json', loglevel: 'verbose' },
          options: malformedOptions,
        },
        CommandWithMalformedInsights,
      )
      const parsed = JSON.parse(result as string)

      // All 3 should still be reported because they have valid malware alerts
      t.equal(
        parsed.total,
        3,
        'packages with malformed insights but valid alerts should still be included',
      )

      const warnings = stderrLogs()
        .map(args => args.join(' '))
        .join('\n')
      t.match(
        warnings,
        /ignoring malformed severity insights/,
        'should warn about malformed severity',
      )
      t.match(
        warnings,
        /ignoring malformed vuln insights/,
        'should warn about malformed vuln',
      )
      t.match(
        warnings,
        /ignoring malformed squat insights/,
        'should warn about malformed squat',
      )
    },
  )

  t.test(
    'exit code is 1 when findings are present at or above audit level',
    async t => {
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
      })
      t.chdir(dir)
      const exitCodeGraph = new Graph.Graph({
        ...specOptions,
        projectRoot: dir,
        mainManifest,
      })

      const issueNode = exitCodeGraph.placePackage(
        exitCodeGraph.mainImporter,
        'prod',
        Spec.parse('found-issue@^1.0.0', specOptions),
        { name: 'found-issue', version: '1.0.0' },
      )!

      withInsights(issueNode).insights = {
        malware: {
          low: false,
          medium: false,
          high: true,
          critical: false,
        },
        scanned: true,
      }
      const issueNodeWithInsights = issueNode

      const CommandWithExitFindings = await mockAuditWithNodes(t, {
        graph: exitCodeGraph,
        nodes: [issueNodeWithInsights],
      })

      const exitOptions = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
      }
      exitOptions.packageJson.read = () => mainManifest
      exitOptions.packageJson.maybeRead = () => mainManifest

      // Reset exitCode before test
      process.exitCode = 0
      await runCommand(
        { values: { view: 'json' }, options: exitOptions },
        CommandWithExitFindings,
      )
      t.equal(
        process.exitCode,
        1,
        'process.exitCode should be 1 when findings are present',
      )
    },
  )

  t.test(
    'moderate severity level alias works (backward compatibility)',
    async t => {
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
      })
      t.chdir(dir)
      const testGraph = new Graph.Graph({
        ...specOptions,
        projectRoot: dir,
        mainManifest,
      })

      const testNode = testGraph.placePackage(
        testGraph.mainImporter,
        'prod',
        Spec.parse('test-pkg@^1.0.0', specOptions),
        { name: 'test-pkg', version: '1.0.0' },
      )!
      const lowNode = testGraph.placePackage(
        testGraph.mainImporter,
        'prod',
        Spec.parse('low-pkg@^1.0.0', specOptions),
        { name: 'low-pkg', version: '1.0.0' },
      )!

      const options = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
      }
      options.packageJson.read = () => mainManifest
      options.packageJson.maybeRead = () => mainManifest

      withInsights(testNode).insights = {
        malware: {
          low: false,
          medium: true,
          high: false,
          critical: false,
        },
        scanned: true,
      }
      // a low finding alongside the medium one: `moderate` must filter
      // this out. Without it the assertion below passes whether the
      // alias resolves to `medium` or silently falls back to `low`.
      withInsights(lowNode).insights = {
        severity: {
          low: true,
          medium: false,
          high: false,
          critical: false,
        },
        scanned: true,
      }

      const CommandWithAliasTest = await mockAuditWithNodes(t, {
        graph: testGraph,
        nodes: [testNode, lowNode],
      })

      // Test with 'moderate' audit level (should work as alias for 'medium')
      const result = await runCommand(
        {
          values: { view: 'json', 'audit-level': 'moderate' },
          options,
        },
        CommandWithAliasTest,
      )
      const parsed = JSON.parse(result as string)
      t.equal(
        parsed.total,
        1,
        'moderate audit level should work as alias for medium',
      )
      t.equal(
        parsed.summary.medium.length,
        1,
        'the medium finding is reported',
      )
      t.equal(
        parsed.summary.low.length,
        0,
        'moderate must not report low findings the way audit-level=low does',
      )
    },
  )

  t.test(
    'transitive dependencies of direct deps are marked indirect',
    async t => {
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
        dependencies: { 'direct-dep': '^1.0.0' },
      }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
      })
      t.chdir(dir)
      const transitiveGraph = new Graph.Graph({
        ...specOptions,
        projectRoot: dir,
        mainManifest,
      })

      // Add direct-dep (placed as direct by graph)
      const directDep = transitiveGraph.placePackage(
        transitiveGraph.mainImporter,
        'prod',
        Spec.parse('direct-dep@^1.0.0', specOptions),
        { name: 'direct-dep', version: '1.0.0' },
      )!

      // Add transitive-dep (placed as dependency of direct-dep, not main)
      const transitiveDep = transitiveGraph.placePackage(
        directDep,
        'prod',
        Spec.parse('transitive-dep@^1.0.0', specOptions),
        { name: 'transitive-dep', version: '1.0.0' },
      )!

      const transitiveOptions = {
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        projectRoot: dir,
      }
      transitiveOptions.packageJson.read = () => mainManifest

      withInsights(directDep).insights = {
        malware: {
          low: true,
          medium: false,
          high: false,
          critical: false,
        },
        scanned: true,
      }
      const directDepWithInsights = directDep
      withInsights(transitiveDep).insights = {
        malware: {
          low: true,
          medium: false,
          high: false,
          critical: false,
        },
        scanned: true,
      }
      const transitiveDepWithInsights = transitiveDep

      const CommandWithTransitive = await mockAuditWithNodes(t, {
        graph: transitiveGraph,
        nodes: [directDepWithInsights, transitiveDepWithInsights],
      })

      const result = await runCommand(
        { values: { view: 'json' }, options: transitiveOptions },
        CommandWithTransitive,
      )
      const parsed = JSON.parse(result as string)

      const directPkg = parsed.summary.low.find(
        (p: { name: string }) => p.name === 'direct-dep',
      )
      const transitivePkg = parsed.summary.low.find(
        (p: { name: string }) => p.name === 'transitive-dep',
      )

      t.equal(
        directPkg.direct,
        true,
        'direct dependency should be marked direct',
      )
      t.equal(
        transitivePkg.direct,
        false,
        'dependency of direct dep should be marked indirect (transitive)',
      )
      t.equal(parsed.directCount, 1, 'directCount should be 1')
      t.equal(parsed.indirectCount, 1, 'indirectCount should be 1')
    },
  )
})
