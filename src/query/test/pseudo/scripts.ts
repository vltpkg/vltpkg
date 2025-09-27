import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { normalizeManifest } from '@vltpkg/types'
import type { ParserState } from '../../src/types.ts'
import { scripts } from '../../src/pseudo/scripts.ts'
import { newGraph, newNode } from '../fixtures/graph.ts'
import type { NodeLike } from '@vltpkg/types'

t.test('selects packages that need to be built', async t => {
  const getState = (query: string, nodes: NodeLike[] = []) => {
    const ast = postcssSelectorParser().astSync(query)
    const current = ast.first.first

    // Create a minimal graph with our test nodes
    const graph = newGraph('test-project')
    nodes.forEach(node => {
      graph.nodes.set(node.id, node)
    })

    const state: ParserState = {
      comment: '',
      current,
      initial: {
        edges: new Set(graph.edges.values()),
        nodes: new Set(nodes),
      },
      partial: {
        edges: new Set(graph.edges.values()),
        nodes: new Set(nodes),
      },
      collect: {
        edges: new Set(),
        nodes: new Set(),
      },
      cancellable: async () => {},
      walk: async i => i,
      retries: 0,
      securityArchive: undefined,
      importers: new Set(graph.importers),
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  const createTestNode = (name: string, manifest: any): NodeLike => {
    const graph = newGraph('test')
    const addNode = newNode(graph)
    const node = addNode(name)
    node.manifest = normalizeManifest({
      name,
      version: '1.0.0',
      ...manifest,
    })
    return node
  }

  await t.test(
    'selects nodes with install lifecycle scripts',
    async t => {
      const nodeWithInstall = createTestNode('install-pkg', {
        scripts: { install: 'echo installing' },
      })
      const nodeWithPreinstall = createTestNode('preinstall-pkg', {
        scripts: { preinstall: 'echo pre installing' },
      })
      const nodeWithPostinstall = createTestNode('postinstall-pkg', {
        scripts: { postinstall: 'echo post installing' },
      })
      const nodeWithoutScripts = createTestNode('no-scripts-pkg', {})

      const res = await scripts(
        getState(':scripts', [
          nodeWithInstall,
          nodeWithPreinstall,
          nodeWithPostinstall,
          nodeWithoutScripts,
        ]),
      )

      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['install-pkg', 'postinstall-pkg', 'preinstall-pkg'],
        'should select packages with install lifecycle scripts',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects git dependencies with prepare scripts',
    async t => {
      const gitNodeWithPrepare = createTestNode('git-pkg', {
        scripts: { prepare: 'npm run build' },
      })
      gitNodeWithPrepare.id = joinDepIDTuple([
        'git',
        'github.com/user/repo.git',
        'git-pkg@1.0.0',
      ])

      const gitNodeWithPreprepare = createTestNode(
        'git-preprepare-pkg',
        {
          scripts: { preprepare: 'npm run setup' },
        },
      )
      gitNodeWithPreprepare.id = joinDepIDTuple([
        'git',
        'github.com/user/repo2.git',
        'git-preprepare-pkg@1.0.0',
      ])

      const gitNodeWithPostprepare = createTestNode(
        'git-postprepare-pkg',
        {
          scripts: { postprepare: 'npm run cleanup' },
        },
      )
      gitNodeWithPostprepare.id = joinDepIDTuple([
        'git',
        'github.com/user/repo3.git',
        'git-postprepare-pkg@1.0.0',
      ])

      const gitNodeWithoutPrepare = createTestNode(
        'git-no-prepare-pkg',
        {},
      )
      gitNodeWithoutPrepare.id = joinDepIDTuple([
        'git',
        'github.com/user/repo4.git',
        'git-no-prepare-pkg@1.0.0',
      ])

      const res = await scripts(
        getState(':scripts', [
          gitNodeWithPrepare,
          gitNodeWithPreprepare,
          gitNodeWithPostprepare,
          gitNodeWithoutPrepare,
        ]),
      )

      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['git-pkg', 'git-postprepare-pkg', 'git-preprepare-pkg'],
        'should select git packages with prepare scripts',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects importer nodes with prepare scripts',
    async t => {
      const importerNodeWithPrepare = createTestNode('importer-pkg', {
        scripts: { prepare: 'npm run build' },
      })
      importerNodeWithPrepare.importer = true

      const importerNodeWithoutPrepare = createTestNode(
        'importer-no-prepare-pkg',
        {},
      )
      importerNodeWithoutPrepare.importer = true

      const regularNodeWithPrepare = createTestNode('regular-pkg', {
        scripts: { prepare: 'npm run build' },
      })
      // Add mock inVltStore method that returns true for regular nodes
      ;(regularNodeWithPrepare as any).inVltStore = () => true

      const res = await scripts(
        getState(':scripts', [
          importerNodeWithPrepare,
          importerNodeWithoutPrepare,
          regularNodeWithPrepare,
        ]),
      )

      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['importer-pkg'],
        'should select importer packages with prepare scripts but not regular packages in vlt store',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'filters out nodes without build requirements',
    async t => {
      const nodeWithoutManifest = createTestNode(
        'no-manifest-pkg',
        {},
      )
      delete nodeWithoutManifest.manifest

      const nodeWithEmptyManifest = createTestNode(
        'empty-manifest-pkg',
        {},
      )

      const nodeWithOnlyDevScripts = createTestNode(
        'dev-scripts-pkg',
        {
          scripts: {
            dev: 'webpack serve',
            test: 'jest',
          },
        },
      )

      const res = await scripts(
        getState(':scripts', [
          nodeWithoutManifest,
          nodeWithEmptyManifest,
          nodeWithOnlyDevScripts,
        ]),
      )

      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        [],
        'should filter out packages that do not need building',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('handles mixed scenarios correctly', async t => {
    const nodeNeedingBuild1 = createTestNode('build-pkg1', {
      scripts: { install: 'make install' },
    })

    const nodeNeedingBuild2 = createTestNode('build-pkg2', {
      scripts: { prepare: 'npm run compile' },
    })
    nodeNeedingBuild2.importer = true

    const nodeNotNeedingBuild = createTestNode('no-build-pkg', {
      scripts: { start: 'node server.js' },
    })

    const res = await scripts(
      getState(':scripts', [
        nodeNeedingBuild1,
        nodeNeedingBuild2,
        nodeNotNeedingBuild,
      ]),
    )

    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['build-pkg1', 'build-pkg2'],
      'should correctly handle mixed build scenarios',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name).sort(),
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test('handles empty partial state', async t => {
    const state = getState(':scripts')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await scripts(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should return empty array when starting with empty partial state',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })
})
