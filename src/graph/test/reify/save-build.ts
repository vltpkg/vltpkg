import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Diff } from '../../src/diff.ts'
import { Graph } from '../../src/graph.ts'
import { saveBuild } from '../../src/reify/save-build.ts'

// Helper to create a mock node for testing
const createMockNode = (
  id: string,
  manifest?: any,
  importer = false,
  gitDep = false,
): any => {
  const node = {
    id: gitDep ? `git:${id}` : id,
    manifest: manifest || undefined,
    importer,
    inVltStore: () => !importer && !gitDep, // importers and git deps are not in store
  }
  return node
}

// Local implementation of nodeNeedsBuild logic for testing
const nodeNeedsBuild = (node: any): boolean => {
  // If the node has already been built during reify, no need to build again
  if (node.built) return false

  const { manifest } = node
  if (!manifest) return false

  const { scripts = {} } = manifest

  // Check for install lifecycle scripts
  const runInstall = !!(
    scripts.install ||
    scripts.preinstall ||
    scripts.postinstall
  )
  if (runInstall) return true

  // Check for prepare scripts on importers or git dependencies
  const prepable =
    node.id.startsWith('git') || node.importer || !node.inVltStore()
  const runPrepare =
    !!(
      scripts.prepare ||
      scripts.preprepare ||
      scripts.postprepare
    ) && prepable
  if (runPrepare) return true

  // Check if the package has binary files
  const { bin } = manifest
  if (bin) {
    if (typeof bin === 'string') return true
    if (typeof bin === 'object' && Object.keys(bin).length > 0)
      return true
  }

  return false
}

t.test('nodeNeedsBuild', async t => {
  t.test('includes nodes with install scripts', async t => {
    const nodeWithPreinstall = createMockNode('test@1.0.0', {
      name: 'test',
      version: '1.0.0',
      scripts: { preinstall: 'echo pre' },
    })
    t.ok(
      nodeNeedsBuild(nodeWithPreinstall),
      'should include node with preinstall script',
    )

    const nodeWithInstall = createMockNode('test@1.0.0', {
      name: 'test',
      version: '1.0.0',
      scripts: { install: 'echo install' },
    })
    t.ok(
      nodeNeedsBuild(nodeWithInstall),
      'should include node with install script',
    )

    const nodeWithPostinstall = createMockNode('test@1.0.0', {
      name: 'test',
      version: '1.0.0',
      scripts: { postinstall: 'echo post' },
    })
    t.ok(
      nodeNeedsBuild(nodeWithPostinstall),
      'should include node with postinstall script',
    )

    t.end()
  })

  t.test('includes nodes with binary files', async t => {
    const nodeWithStringBin = createMockNode('test@1.0.0', {
      name: 'test',
      version: '1.0.0',
      bin: './bin/test',
    })
    t.ok(
      nodeNeedsBuild(nodeWithStringBin),
      'should include node with string bin',
    )

    const nodeWithObjectBin = createMockNode('test@1.0.0', {
      name: 'test',
      version: '1.0.0',
      bin: { test: './bin/test', other: './bin/other' },
    })
    t.ok(
      nodeNeedsBuild(nodeWithObjectBin),
      'should include node with object bin',
    )

    t.end()
  })

  t.test('includes importers with prepare scripts', async t => {
    const importerWithPrepare = createMockNode(
      'test@1.0.0',
      {
        name: 'test',
        version: '1.0.0',
        scripts: { prepare: 'npm run build' },
      },
      true,
    ) // importer = true
    t.ok(
      nodeNeedsBuild(importerWithPrepare),
      'should include importer with prepare script',
    )

    const importerWithPreprepare = createMockNode(
      'test@1.0.0',
      {
        name: 'test',
        version: '1.0.0',
        scripts: { preprepare: 'echo preparing' },
      },
      true,
    ) // importer = true
    t.ok(
      nodeNeedsBuild(importerWithPreprepare),
      'should include importer with preprepare script',
    )

    const importerWithPostprepare = createMockNode(
      'test@1.0.0',
      {
        name: 'test',
        version: '1.0.0',
        scripts: { postprepare: 'echo done' },
      },
      true,
    ) // importer = true
    t.ok(
      nodeNeedsBuild(importerWithPostprepare),
      'should include importer with postprepare script',
    )

    t.end()
  })

  t.test(
    'includes git dependencies with prepare scripts',
    async t => {
      const gitDepWithPrepare = createMockNode(
        'test@1.0.0',
        {
          name: 'test',
          version: '1.0.0',
          scripts: { prepare: 'npm run build' },
        },
        false,
        true,
      ) // gitDep = true
      t.ok(
        nodeNeedsBuild(gitDepWithPrepare),
        'should include git dependency with prepare script',
      )

      t.end()
    },
  )

  t.test('excludes registry nodes with prepare scripts', async t => {
    const registryNodeWithPrepare = createMockNode(
      joinDepIDTuple(['registry', '', 'test@1.0.0']),
      {
        name: 'test',
        version: '1.0.0',
        scripts: { prepare: 'npm run build' },
      },
    )
    t.notOk(
      nodeNeedsBuild(registryNodeWithPrepare),
      'should exclude registry node with prepare script',
    )

    t.end()
  })

  t.test('excludes nodes without manifests', async t => {
    const nodeWithoutManifest = createMockNode('test@1.0.0')
    t.notOk(
      nodeNeedsBuild(nodeWithoutManifest),
      'should exclude node without manifest',
    )

    t.end()
  })

  t.test('excludes nodes without build requirements', async t => {
    const plainNode = createMockNode('test@1.0.0', {
      name: 'test',
      version: '1.0.0',
    })
    t.notOk(
      nodeNeedsBuild(plainNode),
      'should exclude node with no build requirements',
    )

    const nodeWithIrrelevantScripts = createMockNode('test@1.0.0', {
      name: 'test',
      version: '1.0.0',
      scripts: { test: 'echo test', start: 'node index.js' },
    })
    t.notOk(
      nodeNeedsBuild(nodeWithIrrelevantScripts),
      'should exclude node with irrelevant scripts',
    )

    t.end()
  })

  t.end()
})

t.test(
  'nodeNeedsBuild - excludes nodes that have already been built',
  async t => {
    t.test(
      'excludes nodes with built=true even when they have install scripts',
      async t => {
        const builtNodeWithInstall = createMockNode(
          'built-pkg@1.0.0',
          {
            name: 'built-pkg',
            version: '1.0.0',
            scripts: { install: 'echo installing' },
          },
        )
        builtNodeWithInstall.built = true

        t.notOk(
          nodeNeedsBuild(builtNodeWithInstall),
          'should exclude node with built=true even with install script',
        )

        // Compare with similar node that hasn't been built
        const unbuiltNodeWithInstall = createMockNode(
          'unbuilt-pkg@1.0.0',
          {
            name: 'unbuilt-pkg',
            version: '1.0.0',
            scripts: { install: 'echo installing' },
          },
        )
        // Built should default to false, but let's be explicit
        unbuiltNodeWithInstall.built = false

        t.ok(
          nodeNeedsBuild(unbuiltNodeWithInstall),
          'should include node with built=false and install script',
        )

        t.end()
      },
    )

    t.test(
      'excludes nodes with built=true even when they have prepare scripts as importers',
      async t => {
        const builtImporterWithPrepare = createMockNode(
          'built-importer@1.0.0',
          {
            name: 'built-importer',
            version: '1.0.0',
            scripts: { prepare: 'npm run build' },
          },
          true, // importer = true
        )
        builtImporterWithPrepare.built = true

        t.notOk(
          nodeNeedsBuild(builtImporterWithPrepare),
          'should exclude built importer even with prepare script',
        )

        // Compare with similar node that hasn't been built
        const unbuiltImporterWithPrepare = createMockNode(
          'unbuilt-importer@1.0.0',
          {
            name: 'unbuilt-importer',
            version: '1.0.0',
            scripts: { prepare: 'npm run build' },
          },
          true, // importer = true
        )
        unbuiltImporterWithPrepare.built = false

        t.ok(
          nodeNeedsBuild(unbuiltImporterWithPrepare),
          'should include unbuilt importer with prepare script',
        )

        t.end()
      },
    )

    t.test(
      'excludes nodes with built=true even when they have binary files',
      async t => {
        const builtNodeWithBin = createMockNode(
          'built-bin-pkg@1.0.0',
          {
            name: 'built-bin-pkg',
            version: '1.0.0',
            bin: './bin/tool',
          },
        )
        builtNodeWithBin.built = true

        t.notOk(
          nodeNeedsBuild(builtNodeWithBin),
          'should exclude node with built=true even with binary',
        )

        // Compare with similar node that hasn't been built
        const unbuiltNodeWithBin = createMockNode(
          'unbuilt-bin-pkg@1.0.0',
          {
            name: 'unbuilt-bin-pkg',
            version: '1.0.0',
            bin: './bin/tool',
          },
        )
        unbuiltNodeWithBin.built = false

        t.ok(
          nodeNeedsBuild(unbuiltNodeWithBin),
          'should include node with built=false and binary',
        )

        t.end()
      },
    )

    t.test(
      'excludes nodes with built=true even when they are git dependencies with prepare scripts',
      async t => {
        const builtGitDepWithPrepare = createMockNode(
          'built-git-pkg@1.0.0',
          {
            name: 'built-git-pkg',
            version: '1.0.0',
            scripts: { prepare: 'npm run build' },
          },
          false,
          true, // gitDep = true
        )
        builtGitDepWithPrepare.built = true

        t.notOk(
          nodeNeedsBuild(builtGitDepWithPrepare),
          'should exclude built git dependency even with prepare script',
        )

        // Compare with similar node that hasn't been built
        const unbuiltGitDepWithPrepare = createMockNode(
          'unbuilt-git-pkg@1.0.0',
          {
            name: 'unbuilt-git-pkg',
            version: '1.0.0',
            scripts: { prepare: 'npm run build' },
          },
          false,
          true, // gitDep = true
        )
        unbuiltGitDepWithPrepare.built = false

        t.ok(
          nodeNeedsBuild(unbuiltGitDepWithPrepare),
          'should include unbuilt git dependency with prepare script',
        )

        t.end()
      },
    )

    t.end()
  },
)

t.test('saveBuild integration', async t => {
  t.test('creates and saves build data file', async t => {
    const projectRoot = t.testdir({})

    // Create a simple graph with one importer
    const graph1 = new Graph({
      projectRoot,
      mainManifest: { name: 'test-project', version: '1.0.0' },
      registry: 'https://registry.npmjs.org/',
    })

    const graph2 = new Graph({
      projectRoot,
      mainManifest: { name: 'test-project', version: '1.0.0' },
      registry: 'https://registry.npmjs.org/',
    })

    const diff = new Diff(graph1, graph2)
    const buildData = saveBuild({ diff, projectRoot })

    // Verify function returns BuildData
    t.type(buildData, 'object', 'should return BuildData object')
    t.ok('queue' in buildData, 'should have queue property')

    // Verify file was created
    const filePath = resolve(
      projectRoot,
      'node_modules/.vlt-build.json',
    )
    t.ok(existsSync(filePath), 'build file should be created')

    // Verify file content
    const content = readFileSync(filePath, 'utf8')
    const fileData = JSON.parse(content)
    t.strictSame(
      buildData,
      fileData,
      'returned data should match file data',
    )

    // Should have empty queue since no nodes need building
    t.type(fileData.queue, Array, 'queue should be an array')
    t.equal(
      fileData.queue.length,
      0,
      'should have empty queue with no nodes to build',
    )

    t.end()
  })

  t.test(
    'excludes built nodes from build queue even with build requirements',
    async t => {
      const projectRoot = t.testdir({})

      // Create graphs with nodes that have different built states
      const graph1 = new Graph({
        projectRoot,
        mainManifest: { name: 'test-project', version: '1.0.0' },
        registry: 'https://registry.npmjs.org/',
      })

      const graph2 = new Graph({
        projectRoot,
        mainManifest: { name: 'test-project', version: '1.0.0' },
        registry: 'https://registry.npmjs.org/',
      })

      // Add a node with install script that has already been built
      const builtInstallNode = graph2.addNode(
        joinDepIDTuple(['registry', '', 'built-install-pkg@1.0.0']),
        {
          name: 'built-install-pkg',
          version: '1.0.0',
          scripts: { install: 'echo installing' },
        },
      )
      builtInstallNode.manifest = {
        name: 'built-install-pkg',
        version: '1.0.0',
        scripts: { install: 'echo installing' },
      }
      builtInstallNode.built = true // Mark as already built

      // Add a node with install script that hasn't been built
      const unbuiltInstallNode = graph2.addNode(
        joinDepIDTuple(['registry', '', 'unbuilt-install-pkg@1.0.0']),
        {
          name: 'unbuilt-install-pkg',
          version: '1.0.0',
          scripts: { install: 'echo installing' },
        },
      )
      unbuiltInstallNode.manifest = {
        name: 'unbuilt-install-pkg',
        version: '1.0.0',
        scripts: { install: 'echo installing' },
      }
      unbuiltInstallNode.built = false // Explicitly mark as not built

      // Add a node with binary that has already been built
      const builtBinNode = graph2.addNode(
        joinDepIDTuple(['registry', '', 'built-bin-pkg@1.0.0']),
        {
          name: 'built-bin-pkg',
          version: '1.0.0',
          bin: './bin/tool',
        },
      )
      builtBinNode.manifest = {
        name: 'built-bin-pkg',
        version: '1.0.0',
        bin: './bin/tool',
      }
      builtBinNode.built = true

      const diff = new Diff(graph1, graph2)
      const buildData = saveBuild({ diff, projectRoot })

      // Verify function returns BuildData
      t.type(buildData, 'object', 'should return BuildData object')
      t.ok('queue' in buildData, 'should have queue property')

      // Verify file was created
      const filePath = resolve(
        projectRoot,
        'node_modules/.vlt-build.json',
      )
      t.ok(existsSync(filePath), 'build file should be created')

      // Verify file content
      const content = readFileSync(filePath, 'utf8')
      const fileData = JSON.parse(content)
      t.strictSame(
        buildData,
        fileData,
        'returned data should match file data',
      )

      // Should include only the unbuilt install node, exclude built nodes
      t.type(fileData.queue, Array, 'queue should be an array')
      t.equal(
        fileData.queue.length,
        1,
        'should have 1 node needing build',
      )

      t.ok(
        fileData.queue.includes(
          joinDepIDTuple([
            'registry',
            '',
            'unbuilt-install-pkg@1.0.0',
          ]),
        ),
        'should include unbuilt node with install script',
      )

      t.notOk(
        fileData.queue.includes(
          joinDepIDTuple(['registry', '', 'built-install-pkg@1.0.0']),
        ),
        'should exclude built node even with install script',
      )

      t.notOk(
        fileData.queue.includes(
          joinDepIDTuple(['registry', '', 'built-bin-pkg@1.0.0']),
        ),
        'should exclude built node even with binary',
      )

      t.end()
    },
  )

  t.test(
    'filters nodes and handles existing queue with deduplication',
    async t => {
      const projectRoot = t.testdir({})

      // Create graphs with actual differences to test filtering
      const graph1 = new Graph({
        projectRoot,
        mainManifest: { name: 'test-project', version: '1.0.0' },
        registry: 'https://registry.npmjs.org/',
      })

      const graph2 = new Graph({
        projectRoot,
        mainManifest: { name: 'test-project', version: '1.0.0' },
        registry: 'https://registry.npmjs.org/',
      })

      // Add nodes with different build requirements to graph2
      const installScriptNode = graph2.addNode(
        joinDepIDTuple(['registry', '', 'install-pkg@1.0.0']),
        {
          name: 'install-pkg',
          version: '1.0.0',
          scripts: { install: 'echo installing' },
        },
      )
      installScriptNode.manifest = {
        name: 'install-pkg',
        version: '1.0.0',
        scripts: { install: 'echo installing' },
      }

      const binNode = graph2.addNode(
        joinDepIDTuple(['registry', '', 'bin-pkg@1.0.0']),
        { name: 'bin-pkg', version: '1.0.0', bin: './bin/tool' },
      )
      binNode.manifest = {
        name: 'bin-pkg',
        version: '1.0.0',
        bin: './bin/tool',
      }

      const plainNode = graph2.addNode(
        joinDepIDTuple(['registry', '', 'plain-pkg@1.0.0']),
        { name: 'plain-pkg', version: '1.0.0' },
      )
      plainNode.manifest = { name: 'plain-pkg', version: '1.0.0' }

      const prepareNode = graph2.addNode(
        joinDepIDTuple(['registry', '', 'prepare-pkg@1.0.0']),
        {
          name: 'prepare-pkg',
          version: '1.0.0',
          scripts: { prepare: 'npm run build' },
        },
      )
      prepareNode.manifest = {
        name: 'prepare-pkg',
        version: '1.0.0',
        scripts: { prepare: 'npm run build' },
      }

      const diff = new Diff(graph1, graph2)

      // Test with existing queue containing some duplicates
      const existingQueue = [
        joinDepIDTuple(['registry', '', 'existing@1.0.0']),
        joinDepIDTuple(['registry', '', 'install-pkg@1.0.0']), // This should be deduplicated
      ]

      const buildData = saveBuild({
        diff,
        projectRoot,
        queue: existingQueue,
      })

      // Verify function returns BuildData
      t.type(buildData, 'object', 'should return BuildData object')
      t.ok('queue' in buildData, 'should have queue property')

      // Verify file was created
      const filePath = resolve(
        projectRoot,
        'node_modules/.vlt-build.json',
      )
      t.ok(existsSync(filePath), 'build file should be created')

      // Verify file content
      const content = readFileSync(filePath, 'utf8')
      const fileData = JSON.parse(content)
      t.strictSame(
        buildData,
        fileData,
        'returned data should match file data',
      )

      // Should include:
      // - existing@1.0.0 (from existing queue)
      // - install-pkg@1.0.0 (has install script, deduplicated)
      // - bin-pkg@1.0.0 (has binary)
      // Should exclude:
      // - plain-pkg@1.0.0 (no build requirements)
      // - prepare-pkg@1.0.0 (registry node with prepare script - not importer/git)
      t.type(fileData.queue, Array, 'queue should be an array')
      t.equal(fileData.queue.length, 3, 'should have 3 unique nodes')

      // Verify specific inclusions
      t.ok(
        fileData.queue.includes(
          joinDepIDTuple(['registry', '', 'existing@1.0.0']),
        ),
        'should include existing queue item',
      )
      t.ok(
        fileData.queue.includes(
          joinDepIDTuple(['registry', '', 'install-pkg@1.0.0']),
        ),
        'should include node with install script',
      )
      t.ok(
        fileData.queue.includes(
          joinDepIDTuple(['registry', '', 'bin-pkg@1.0.0']),
        ),
        'should include node with binary',
      )

      // Verify exclusions
      t.notOk(
        fileData.queue.includes(
          joinDepIDTuple(['registry', '', 'plain-pkg@1.0.0']),
        ),
        'should exclude plain node without build requirements',
      )
      t.notOk(
        fileData.queue.includes(
          joinDepIDTuple(['registry', '', 'prepare-pkg@1.0.0']),
        ),
        'should exclude registry node with prepare script',
      )

      // Verify deduplication worked (no duplicates)
      const uniqueIds = new Set(fileData.queue)
      t.equal(
        uniqueIds.size,
        fileData.queue.length,
        'should not have duplicate DepIDs',
      )

      t.end()
    },
  )

  t.end()
})
