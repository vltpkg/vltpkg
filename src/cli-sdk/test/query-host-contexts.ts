import { resolve } from 'node:path'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import { PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'

t.test('createHostContextsMap', async t => {
  await t.test(
    'local context uses dashboard-root config',
    async t => {
      const dir = t.testdir({
        custom: {
          path1: {
            projectA: {
              node_modules: {
                '.vlt': {},
              },
              'package.json': JSON.stringify({
                name: 'projectA',
                version: '1.0.0',
              }),
              'vlt.json': JSON.stringify({
                config: {
                  'dashboard-root': ['../', '../../path2'],
                },
              }),
            },
          },
          path2: {
            projectB: {
              node_modules: {
                '.vlt': {},
              },
              'package.json': JSON.stringify({
                name: 'projectB',
                version: '1.0.0',
              }),
              'vlt.json': JSON.stringify({
                config: {
                  'dashboard-root': ['../../path1', '../'],
                },
              }),
            },
          },
        },
      })

      const cwd = resolve(dir, 'custom/path1/projectA')
      t.chdir(cwd)
      const conf: LoadedConfig = {
        get: () => undefined,
        options: {
          projectRoot: cwd,
          scurry: new PathScurry(cwd),
          packageJson: new PackageJson(),
          'dashboard-root': [
            resolve(dir, 'custom/path1'),
            resolve(dir, 'custom/path2'),
          ],
        },
        values: [],
      } as unknown as LoadedConfig

      const { createHostContextsMap: createMocked } =
        await t.mockImport<
          typeof import('../src/query-host-contexts.ts')
        >('../src/query-host-contexts.ts', {
          '@vltpkg/server': {
            ...(await t.mockImport<typeof import('@vltpkg/server')>(
              '@vltpkg/server',
            )),
            reloadConfig: async (path: string) => {
              return {
                get: () => undefined,
                options: {
                  projectRoot: path,
                  scurry: new PathScurry(path),
                  packageJson: conf.options.packageJson,
                },
                values: {},
              } as unknown as LoadedConfig
            },
          },
          '@vltpkg/security-archive': {
            SecurityArchive: {
              start: async () => ({
                get: () => undefined,
              }),
            },
          },
        })

      const hostContexts = await createMocked(conf)
      const localFn = hostContexts.get('local')

      if (!localFn) {
        t.fail('local context should exist')
        return
      }

      const result = await localFn()

      t.equal(
        result.initialNodes.length,
        2,
        'returns successful nodes',
      )
      t.equal(result.nodes.length, 1, 'returns selected node')
      t.equal(
        result.edges.length,
        0,
        'returns graph edges (none in this case)',
      )
    },
  )

  await t.test('handles undefined dashboard-root config', async t => {
    const dir = t.testdir({
      projectA: {
        node_modules: {
          '.vlt': {},
        },
        'package.json': JSON.stringify({
          name: 'projectA',
          version: '1.0.0',
        }),
      },
    })

    const cwd = resolve(dir, 'projectA')
    t.chdir(cwd)
    const conf: LoadedConfig = {
      get: () => undefined,
      options: {
        projectRoot: cwd,
        scurry: new PathScurry(cwd),
        packageJson: new PackageJson(),
        // dashboard-root is undefined to test the ?? [] fallback
      },
      values: [],
    } as unknown as LoadedConfig

    const { createHostContextsMap: createMocked } =
      await t.mockImport<
        typeof import('../src/query-host-contexts.ts')
      >('../src/query-host-contexts.ts', {
        '@vltpkg/server': {
          ...(await t.mockImport<typeof import('@vltpkg/server')>(
            '@vltpkg/server',
          )),
          readProjectFolders: async () => [],
        },
        '@vltpkg/security-archive': {
          SecurityArchive: {
            start: async () => ({
              get: () => undefined,
            }),
          },
        },
        '@vltpkg/graph': {
          ...(await t.mockImport<typeof import('@vltpkg/graph')>(
            '@vltpkg/graph',
          )),
          createVirtualRoot: () => ({
            id: 'virtual-root',
            name: 'local',
          }),
        },
      })

    const hostContexts = await createMocked(conf)
    const localFn = hostContexts.get('local')

    if (!localFn) {
      t.fail('local context should exist')
      return
    }

    const result = await localFn()

    t.equal(
      result.initialNodes.length,
      0,
      'returns empty nodes when no projects found',
    )
    t.equal(result.nodes.length, 1, 'returns virtual root node')
  })

  await t.test('skips non-vlt-installed projects', async t => {
    const dir = t.testdir({
      projectA: {
        'package.json': JSON.stringify({
          name: 'projectA',
          version: '1.0.0',
        }),
        // No node_modules/.vlt directory - not vlt-installed
      },
    })

    const cwd = resolve(dir, 'projectA')
    t.chdir(cwd)
    const conf: LoadedConfig = {
      get: () => undefined,
      options: {
        projectRoot: cwd,
        scurry: new PathScurry(cwd),
        packageJson: new PackageJson(),
        'dashboard-root': [dir],
      },
      values: [],
    } as unknown as LoadedConfig

    const { createHostContextsMap: createMocked } =
      await t.mockImport<
        typeof import('../src/query-host-contexts.ts')
      >('../src/query-host-contexts.ts', {
        '@vltpkg/server': {
          ...(await t.mockImport<typeof import('@vltpkg/server')>(
            '@vltpkg/server',
          )),
          readProjectFolders: async () => [
            new PathScurry(dir).cwd.resolve('projectA'),
          ],
          reloadConfig: async (path: string) => ({
            get: () => undefined,
            options: {
              projectRoot: path,
              scurry: new PathScurry(path),
              packageJson: new PackageJson(),
            },
            values: {},
          }),
          getProjectData: () => ({
            vltInstalled: false, // Project is not vlt-installed
          }),
        },
        '@vltpkg/security-archive': {
          SecurityArchive: {
            start: async () => ({
              get: () => undefined,
            }),
          },
        },
        '@vltpkg/graph': {
          ...(await t.mockImport<typeof import('@vltpkg/graph')>(
            '@vltpkg/graph',
          )),
          createVirtualRoot: () => ({
            id: 'virtual-root',
            name: 'local',
          }),
        },
      })

    const hostContexts = await createMocked(conf)
    const localFn = hostContexts.get('local')

    if (!localFn) {
      t.fail('local context should exist')
      return
    }

    const result = await localFn()

    t.equal(
      result.initialNodes.length,
      0,
      'skips non-vlt-installed projects, returns empty nodes',
    )
    t.equal(result.nodes.length, 1, 'returns virtual root node')
  })

  await t.test(
    'handles errors when loading project graphs',
    async t => {
      const dir = t.testdir({
        projectA: {
          node_modules: {
            '.vlt': {},
          },
          'package.json': JSON.stringify({
            name: 'projectA',
            version: '1.0.0',
          }),
        },
      })

      const cwd = resolve(dir, 'projectA')
      t.chdir(cwd)
      const conf: LoadedConfig = {
        get: () => undefined,
        options: {
          projectRoot: cwd,
          scurry: new PathScurry(cwd),
          packageJson: new PackageJson(),
          'dashboard-root': [dir],
        },
        values: [],
      } as unknown as LoadedConfig

      const { createHostContextsMap: createMocked } =
        await t.mockImport<
          typeof import('../src/query-host-contexts.ts')
        >('../src/query-host-contexts.ts', {
          '@vltpkg/server': {
            ...(await t.mockImport<typeof import('@vltpkg/server')>(
              '@vltpkg/server',
            )),
            readProjectFolders: async () => [
              new PathScurry(dir).cwd.resolve('projectA'),
            ],
            reloadConfig: async () => {
              throw new Error('Failed to load config')
            },
          },
          '@vltpkg/security-archive': {
            SecurityArchive: {
              start: async () => ({
                get: () => undefined,
              }),
            },
          },
          '@vltpkg/graph': {
            ...(await t.mockImport<typeof import('@vltpkg/graph')>(
              '@vltpkg/graph',
            )),
            createVirtualRoot: () => ({
              id: 'virtual-root',
              name: 'local',
            }),
          },
        })

      const hostContexts = await createMocked(conf)
      const localFn = hostContexts.get('local')

      if (!localFn) {
        t.fail('local context should exist')
        return
      }

      const result = await localFn()

      t.equal(
        result.initialNodes.length,
        0,
        'gracefully handles errors, returns empty nodes',
      )
      t.equal(
        result.nodes.length,
        1,
        'returns virtual root node despite errors',
      )
    },
  )

  await t.test(
    'throws error when createVirtualRoot returns null',
    async t => {
      const dir = t.testdir({
        projectA: {
          node_modules: {
            '.vlt': {},
          },
          'package.json': JSON.stringify({
            name: 'projectA',
            version: '1.0.0',
          }),
        },
      })

      const cwd = resolve(dir, 'projectA')
      t.chdir(cwd)
      const conf: LoadedConfig = {
        get: () => undefined,
        options: {
          projectRoot: cwd,
          scurry: new PathScurry(cwd),
          packageJson: new PackageJson(),
          'dashboard-root': [dir],
        },
        values: [],
      } as unknown as LoadedConfig

      const { createHostContextsMap: createMocked } =
        await t.mockImport<
          typeof import('../src/query-host-contexts.ts')
        >('../src/query-host-contexts.ts', {
          '@vltpkg/server': {
            ...(await t.mockImport<typeof import('@vltpkg/server')>(
              '@vltpkg/server',
            )),
            readProjectFolders: async () => [],
          },
          '@vltpkg/security-archive': {
            SecurityArchive: {
              start: async () => ({
                get: () => undefined,
              }),
            },
          },
          '@vltpkg/graph': {
            ...(await t.mockImport<typeof import('@vltpkg/graph')>(
              '@vltpkg/graph',
            )),
            createVirtualRoot: () => null, // Return null to trigger error
          },
        })

      const hostContexts = await createMocked(conf)
      const localFn = hostContexts.get('local')

      if (!localFn) {
        t.fail('local context should exist')
        return
      }

      await t.rejects(
        localFn(),
        {
          message: 'Failed to create virtual root for local context',
        },
        'throws error when createVirtualRoot returns null',
      )
    },
  )

  await t.test(
    'project folder keys work with multiple formats',
    async t => {
      const dir = t.testdir({
        nested: {
          projectA: {
            node_modules: {
              '.vlt': {},
            },
            'package.json': JSON.stringify({
              name: 'projectA',
              version: '1.0.0',
            }),
          },
        },
      })

      const projectPath = resolve(dir, 'nested/projectA')
      const cwd = dir
      t.chdir(cwd)

      const conf: LoadedConfig = {
        get: () => undefined,
        options: {
          projectRoot: cwd,
          scurry: new PathScurry(cwd),
          packageJson: new PackageJson(),
          'dashboard-root': [dir],
        },
        values: [],
      } as unknown as LoadedConfig

      // Mock graph with predictable data for verification
      const mockMainImporter = {
        id: 'mock-main-importer',
        name: 'projectA',
      }
      const mockEdges = [{ id: 'mock-edge-1' }]
      const mockNodes = [
        mockMainImporter,
        { id: 'mock-node-1', name: 'dep1' },
      ]

      const { createHostContextsMap: createMocked } =
        await t.mockImport<
          typeof import('../src/query-host-contexts.ts')
        >('../src/query-host-contexts.ts', {
          '@vltpkg/server': {
            ...(await t.mockImport<typeof import('@vltpkg/server')>(
              '@vltpkg/server',
            )),
            readProjectFolders: async () => [
              new PathScurry(dir).cwd.resolve('nested/projectA'),
            ],
            reloadConfig: async (path: string) => ({
              get: () => undefined,
              options: {
                projectRoot: path,
                scurry: new PathScurry(path),
                packageJson: new PackageJson(),
              },
              values: {},
            }),
          },
          '@vltpkg/security-archive': {
            SecurityArchive: {
              start: async () => ({
                get: () => undefined,
              }),
            },
          },
          '@vltpkg/graph': {
            ...(await t.mockImport<typeof import('@vltpkg/graph')>(
              '@vltpkg/graph',
            )),
            actual: {
              load: () => ({
                edges: mockEdges,
                nodes: new Map([
                  ['mock-main-importer', mockMainImporter],
                  ['mock-node-1', mockNodes[1]],
                ]),
                mainImporter: mockMainImporter,
              }),
            },
          },
        })

      const hostContexts = await createMocked(conf)

      // Test different key formats for the same project
      const expectedKeys = [
        'file:nested/projectA', // relative path
        'file:./nested/projectA', // dot relative path
        `file:${projectPath}`, // absolute path
        'file:nested/projectA/', // relative path with trailing slash
        'file:./nested/projectA/', // dot relative path with trailing slash
        `file:${projectPath}/`, // absolute path with trailing slash
      ]

      // Test that all key formats exist and point to the same function
      for (const key of expectedKeys) {
        const projectFn = hostContexts.get(key)
        t.ok(projectFn, `${key} key should exist in host contexts`)

        if (projectFn) {
          const result = await projectFn()
          t.equal(
            result.initialEdges.length,
            1,
            `${key} should return correct edges`,
          )
          t.equal(
            result.initialNodes.length,
            2,
            `${key} should return correct nodes`,
          )
          t.equal(
            result.nodes.length,
            1,
            `${key} should return main importer`,
          )
          t.equal(
            result.nodes[0]?.name,
            'projectA',
            `${key} should return correct main importer name`,
          )
        }
      }

      // Test that home-relative path also works (if project is under home directory)
      const homeRelativeKeys = Array.from(hostContexts.keys()).filter(
        key => key.startsWith('file:~/'),
      )

      if (homeRelativeKeys.length > 0) {
        for (const key of homeRelativeKeys) {
          const projectFn = hostContexts.get(key)
          t.ok(projectFn, `Home relative key ${key} should exist`)

          if (projectFn) {
            const result = await projectFn()
            t.equal(
              result.nodes[0]?.name,
              'projectA',
              `${key} should return correct project data`,
            )
          }
        }
      }
    },
  )

  await t.test(
    'project keys are unique and non-conflicting',
    async t => {
      const dir = t.testdir({
        projectA: {
          node_modules: { '.vlt': {} },
          'package.json': JSON.stringify({
            name: 'projectA',
            version: '1.0.0',
          }),
        },
        nested: {
          projectB: {
            node_modules: { '.vlt': {} },
            'package.json': JSON.stringify({
              name: 'projectB',
              version: '1.0.0',
            }),
          },
        },
      })

      const cwd = dir
      t.chdir(cwd)

      const conf: LoadedConfig = {
        get: () => undefined,
        options: {
          projectRoot: cwd,
          scurry: new PathScurry(cwd),
          packageJson: new PackageJson(),
          'dashboard-root': [dir],
        },
        values: [],
      } as unknown as LoadedConfig

      const { createHostContextsMap: createMocked } =
        await t.mockImport<
          typeof import('../src/query-host-contexts.ts')
        >('../src/query-host-contexts.ts', {
          '@vltpkg/server': {
            ...(await t.mockImport<typeof import('@vltpkg/server')>(
              '@vltpkg/server',
            )),
            readProjectFolders: async () => [
              new PathScurry(dir).cwd.resolve('projectA'),
              new PathScurry(dir).cwd.resolve('nested/projectB'),
            ],
            reloadConfig: async (path: string) => ({
              get: () => undefined,
              options: {
                projectRoot: path,
                scurry: new PathScurry(path),
                packageJson: new PackageJson(),
              },
              values: {},
            }),
          },
          '@vltpkg/security-archive': {
            SecurityArchive: {
              start: async () => ({ get: () => undefined }),
            },
          },
          '@vltpkg/graph': {
            ...(await t.mockImport<typeof import('@vltpkg/graph')>(
              '@vltpkg/graph',
            )),
            actual: {
              load: (options: any) => ({
                edges: [],
                nodes: new Map([
                  [
                    `main-${options.projectRoot}`,
                    {
                      id: `main-${options.projectRoot}`,
                      name:
                        options.projectRoot.includes('projectA') ?
                          'projectA'
                        : 'projectB',
                    },
                  ],
                ]),
                mainImporter: {
                  id: `main-${options.projectRoot}`,
                  name:
                    options.projectRoot.includes('projectA') ?
                      'projectA'
                    : 'projectB',
                },
              }),
            },
          },
        })

      const hostContexts = await createMocked(conf)

      // Verify both projects are accessible through their different key formats
      const projectAFn = hostContexts.get('file:projectA')
      const projectBFn = hostContexts.get('file:nested/projectB')

      t.ok(projectAFn, 'projectA should be accessible')
      t.ok(projectBFn, 'projectB should be accessible')

      if (projectAFn && projectBFn) {
        const resultA = await projectAFn()
        const resultB = await projectBFn()

        t.equal(
          resultA.nodes[0]?.name,
          'projectA',
          'projectA returns correct data',
        )
        t.equal(
          resultB.nodes[0]?.name,
          'projectB',
          'projectB returns correct data',
        )
      }

      // Verify that all keys are present and none conflict
      const allKeys = Array.from(hostContexts.keys())
      const projectAKeys = allKeys.filter(key =>
        key.includes('projectA'),
      )
      const projectBKeys = allKeys.filter(key =>
        key.includes('projectB'),
      )

      t.ok(
        projectAKeys.length >= 6,
        'projectA should have multiple key formats',
      )
      t.ok(
        projectBKeys.length >= 6,
        'projectB should have multiple key formats',
      )

      // Check that no key is duplicated
      const keySet = new Set(allKeys)
      t.equal(
        keySet.size,
        allKeys.length,
        'all keys should be unique',
      )
    },
  )
})
