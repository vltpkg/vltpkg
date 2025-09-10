import { PathScurry } from 'path-scurry'
import t from 'tap'

t.test('read some project folders', async t => {
  const dir = t.testdir({
    _0: {
      _1: {
        _2: {
          _3: {
            _4: {
              _5: {
                _6: {
                  includeme: {
                    'package.json': JSON.stringify({
                      name: 'becasue it is not too deep',
                    }),
                  },
                  _7: {
                    ignoreme: {
                      'package.json': JSON.stringify({
                        name: 'becasue it is too deep',
                      }),
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    Downloads: {
      ignoreme: {
        'package.json': JSON.stringify({
          name: 'because it is in an ignored homedir folder',
        }),
      },
    },

    web: {
      includeme: {
        'package.json': JSON.stringify({ name: 'foo' }),
        ignoreme: {
          'package.json': JSON.stringify({
            name: 'because it is inside another package',
          }),
        },
      },

      bar: {
        baz: {
          includeme: {
            'package.json': JSON.stringify({
              name: 'because it is inside a non-package folder',
            }),
          },
        },
      },

      '.ignore': {
        ignoreme: {
          'package.json': JSON.stringify({
            name: 'becasue it is in a dot folder',
          }),
        },
      },
    },

    ignoreme_pj_link: {
      foo: JSON.stringify({
        name: 'because package.json is a symlink',
      }),
      'package.json': t.fixture('symlink', 'foo'),
    },

    ignoreme_folder_link: t.fixture(
      'symlink',
      'node_modules/ignoreme',
    ),

    node_modules: {
      ignoreme: {
        'package.json': JSON.stringify({
          name: 'because it is in node_modules folder',
        }),
      },
    },
  })

  const { readProjectFolders } = await t.mockImport<
    typeof import('../src/read-project-folders.ts')
  >('../src/read-project-folders.ts', {
    'node:os': t.createMock(await import('node:os'), {
      homedir: () => dir,
    }),
  })

  const result = await readProjectFolders({
    scurry: new PathScurry(dir),
    userDefinedProjectPaths: [],
  })

  const expect = new Set([
    'web/includeme',
    'web/bar/baz/includeme',
    '_0/_1/_2/_3/_4/_5/_6/includeme',
  ])

  t.strictSame(new Set(result.map(r => r.relativePosix())), expect)

  const resultNotDefaultHome = await readProjectFolders({
    scurry: new PathScurry(dir),
    userDefinedProjectPaths: [dir],
  })
  t.strictSame(
    new Set(resultNotDefaultHome.map(r => r.relativePosix())),
    expect,
  )
})

t.test('read project folders with homedir error', async t => {
  const { readProjectFolders } = await t.mockImport<
    typeof import('../src/read-project-folders.ts')
  >('../src/read-project-folders.ts', {
    'node:os': t.createMock(await import('node:os'), {
      homedir: () => {
        throw new Error('Permission denied')
      },
    }),
  })

  const dir = t.testdir({
    web: {
      includeme: {
        'package.json': JSON.stringify({ name: 'foo' }),
      },
    },
  })

  // Should fall back to process.cwd() and still work
  const result = await readProjectFolders({
    scurry: new PathScurry(dir),
    userDefinedProjectPaths: [],
    path: dir,
  })

  t.ok(
    Array.isArray(result),
    'returns an array even with homedir error',
  )
})

t.test('read project folders with file access errors', async t => {
  const dir = t.testdir({
    web: {
      includeme: {
        'package.json': JSON.stringify({ name: 'foo' }),
      },
      restricted: {
        'package.json': JSON.stringify({ name: 'restricted' }),
      },
    },
  })

  // Create a custom PathScurry that throws errors for certain paths
  class TestPathScurry extends PathScurry {
    async lstat(path: string) {
      if (path.includes('restricted/package.json')) {
        throw new Error('Permission denied')
      }
      return super.lstat(path)
    }
  }

  const scurry = new TestPathScurry(dir) as PathScurry

  const { readProjectFolders } = await t.mockImport<
    typeof import('../src/read-project-folders.ts')
  >('../src/read-project-folders.ts', {
    'node:os': t.createMock(await import('node:os'), {
      homedir: () => dir,
    }),
  })

  // Should handle file access errors gracefully
  const result = await readProjectFolders({
    scurry,
    userDefinedProjectPaths: [],
  })

  t.ok(
    Array.isArray(result),
    'returns an array even with file access errors',
  )
  // Should still find the accessible project
  t.ok(
    result.some(r => r.name === 'includeme'),
    'finds accessible projects',
  )
  // Should not include the restricted project due to lstat error
  t.notOk(
    result.some(r => r.name === 'restricted'),
    'skips inaccessible projects',
  )
})

t.test(
  'read project folders with directory readdir errors',
  async t => {
    const dir = t.testdir({
      web: {
        includeme: {
          'package.json': JSON.stringify({ name: 'foo' }),
        },
      },
      restricted: {
        // This directory will throw an error when trying to read it
        somesubdir: {},
      },
    })

    // Create a custom PathScurry that throws errors when reading the root directory
    class TestPathScurry extends PathScurry {
      lstatSync(path: string) {
        const result = super.lstatSync(path)
        if (result && result.fullpath() === dir) {
          // Override readdir to throw an error for the root directory
          result.readdir = async () => {
            throw new Error('Permission denied')
          }
        }
        return result
      }
    }

    const scurry = new TestPathScurry(dir) as PathScurry

    const { readProjectFolders } = await t.mockImport<
      typeof import('../src/read-project-folders.ts')
    >('../src/read-project-folders.ts', {
      'node:os': t.createMock(await import('node:os'), {
        homedir: () => dir,
      }),
    })

    // Should handle directory read errors gracefully
    const result = await readProjectFolders({
      scurry,
      userDefinedProjectPaths: [],
    })

    t.ok(
      Array.isArray(result),
      'returns an array even with directory read errors',
    )
  },
)
