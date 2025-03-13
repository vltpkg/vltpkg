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
