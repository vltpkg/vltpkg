import { resolve } from 'node:path'
import t from 'tap'
import { PathScurry } from 'path-scurry'
import { readProjectFolders } from '../src/read-project-folders.js'

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
  const cwd = resolve(dir, 'projects')
  t.chdir(cwd)
  const projectRoot = cwd
  const scurry = new PathScurry(projectRoot)
  const projectFolders = readProjectFolders(cwd, {
    projectRoot,
    scurry,
  })
  t.matchSnapshot(
    projectFolders.map(i => i.name),
    'should return project folders',
  )
})

t.test('run from a given project root', async t => {
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
  const cwd = resolve(dir, 'projects/a')
  t.chdir(cwd)
  const projectRoot = cwd
  const scurry = new PathScurry(projectRoot)
  const projectFolders = readProjectFolders(cwd, {
    projectRoot,
    scurry,
  })
  t.matchSnapshot(
    projectFolders.map(i => i.name),
    'should return sibling folders',
  )
})

t.test(
  'read siblings when dir is a nested in projectRoot',
  async t => {
    const dir = t.testdir({
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
        lib: {
          utils: {
            'index.js': 'console.log("hello")',
          },
        },
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
    })
    const cwd = resolve(dir, 'a/lib/utils')
    t.chdir(cwd)
    const projectRoot = resolve(dir, 'a')
    const scurry = new PathScurry(projectRoot)
    const projectFolders = readProjectFolders(cwd, {
      projectRoot,
      scurry,
    })
    t.matchSnapshot(
      projectFolders.map(i => i.name),
      'should return sibling folders to project root',
    )
  },
)

t.test(
  'read nested dirs if nothing is found at first level',
  async t => {
    const dir = t.testdir({
      home: {
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
    const cwd = resolve(dir, 'home')
    t.chdir(cwd)
    const projectRoot = cwd
    const scurry = new PathScurry(projectRoot)
    const projectFolders = readProjectFolders(cwd, {
      projectRoot,
      scurry,
    })
    t.matchSnapshot(
      projectFolders.map(i => i.name),
      'should nested found folders',
    )
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
    const cwd = resolve(dir, 'projects')
    t.chdir(cwd)
    const projectRoot = cwd
    const scurry = new PathScurry(projectRoot)
    const projectFolders = readProjectFolders(cwd, {
      projectRoot,
      scurry,
    })
    t.matchSnapshot(
      projectFolders.map(i => i.name),
      'should return project folders',
    )
  },
)

t.test('run from a workspace dir', async t => {
  const dir = t.testdir({
    'project-foo': {
      'package.json': JSON.stringify({
        name: 'project-foo',
        version: '1.0.0',
      }),
      'vlt-workspaces.json': JSON.stringify({ packages: ['a', 'b'] }),
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
  })
  const cwd = resolve(dir, 'project-foo/a')
  t.chdir(cwd)
  const projectRoot = resolve(dir, 'project-foo')
  const scurry = new PathScurry(projectRoot)
  const projectFolders = readProjectFolders(cwd, {
    projectRoot,
    scurry,
  })
  t.matchSnapshot(
    projectFolders.map(i => i.name),
    'should return project folders',
  )
})
