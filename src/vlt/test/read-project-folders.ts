import { availableParallelism } from 'node:os'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { readProjectFolders } from '../src/read-project-folders.ts'

t.test('run from folder with project folders on it', async t => {
  const dir = t.testdir({
    projects: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
        }),
      },
      c: {
        'package.json': JSON.stringify({
          name: 'c',
          version: '1.0.0',
        }),
      },
      d: {},
      e: {
        'README.md': 'File content',
      },
      'README.md': 'File content',
      'linked-folder': t.fixture('symlink', '../a'),
      node_modules: {
        'package.json': JSON.stringify({
          name: 'wat',
          version: '1.0.0',
        }),
      },
    },
  })
  const userDefinedPath = resolve(dir, 'projects')
  const projectRoot = userDefinedPath
  const scurry = new PathScurry(projectRoot)
  const projectFolders = await readProjectFolders({
    scurry,
    userDefinedProjectPaths: [userDefinedPath],
  })
  t.matchSnapshot(
    projectFolders.map(i => i.name),
    'should return project folders',
  )
})

t.test(
  'read nested dirs if nothing is found at first level',
  async t => {
    const dir = t.testdir({
      home: {
        downloads: {
          'ignore-this-always': {
            'package.json': JSON.stringify({}),
          },
        },
        projects: {
          a: {
            'package.json': JSON.stringify({
              name: 'a',
              version: '1.0.0',
            }),
          },
          b: {
            'package.json': JSON.stringify({
              name: 'b',
              version: '1.0.0',
            }),
          },
          c: {
            'package.json': JSON.stringify({
              name: 'c',
              version: '1.0.0',
            }),
          },
          node_modules: {
            f: {
              'package.json': JSON.stringify({
                name: 'do-not-pick-me-up',
                version: '1.0.0',
              }),
            },
          },
        },
        spikes: {
          scoped: {
            '@myscope': {
              foo: {
                'package.json': JSON.stringify({
                  name: '@myscope/foo',
                  version: '1.0.0',
                }),
              },
              bar: {
                'package.json': JSON.stringify({
                  name: '@myscope/bar',
                  version: '1.0.0',
                }),
              },
            },
          },
          packages: {
            d: {
              'package.json': JSON.stringify({
                name: 'd',
                version: '1.0.0',
              }),
            },
            node_modules: {
              f: {
                'package.json': JSON.stringify({
                  name: 'do-not-pick-me-up',
                  version: '1.0.0',
                }),
              },
            },
          },
        },
      },
    })

    const homedir = resolve(dir, 'home')
    const scurry = new PathScurry(homedir)
    const { readProjectFolders } = await t.mockImport<
      typeof import('../src/read-project-folders.ts')
    >('../src/read-project-folders.ts', {
      'node:os': {
        availableParallelism,
        homedir: () => homedir,
      },
    })

    t.test('with path specified', async t => {
      const projectFolders = await readProjectFolders({
        path: homedir,
        scurry,
        userDefinedProjectPaths: [],
      })

      t.matchSnapshot(
        projectFolders.map(i => i.name),
        'should nested found folders',
      )
    })

    t.test('defaulting to home', async t => {
      const projectFolders = await readProjectFolders({
        scurry,
        userDefinedProjectPaths: [],
      })

      t.matchSnapshot(
        projectFolders.map(i => i.name),
        'should nested found folders',
      )
    })
  },
)

t.test(
  'run from a folder with projects using workspaces',
  async t => {
    const dir = t.testdir({
      projects: {
        'project-foo': {
          'package.json': JSON.stringify({
            name: 'project-foo',
            version: '1.0.0',
          }),
          'vlt-workspaces.json': JSON.stringify({
            packages: ['a', 'b'],
          }),
          a: {
            'package.json': JSON.stringify({
              name: 'a',
              version: '1.0.0',
            }),
          },
          b: {
            'package.json': JSON.stringify({
              name: 'b',
              version: '1.0.0',
            }),
          },
        },
        'project-bar': {
          'package.json': JSON.stringify({
            name: 'project-bar',
            version: '1.0.0',
          }),
          'vlt-workspaces.json': JSON.stringify({ packages: ['c'] }),
          c: {
            'package.json': JSON.stringify({
              name: 'c',
              version: '1.0.0',
            }),
          },
          d: {},
          e: {
            'README.md': 'File content',
          },
        },
        'README.md': 'File content',
      },
    })
    const userDefinedPath = resolve(dir, 'projects')
    const scurry = new PathScurry(userDefinedPath)
    const projectFolders = await readProjectFolders({
      scurry,
      userDefinedProjectPaths: [userDefinedPath],
    })
    t.matchSnapshot(
      projectFolders.map(i => i.name),
      'should return project folders',
    )
  },
)
