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

      const hostContexts = createMocked(conf)
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

    const hostContexts = createMocked(conf)
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

    const hostContexts = createMocked(conf)
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

      const hostContexts = createMocked(conf)
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

      const hostContexts = createMocked(conf)
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
})
