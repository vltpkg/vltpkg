import t from 'tap'
import { PackageJson } from '../src/index.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

t.test('successfully reads a valid package.json file', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  const pj = new PackageJson()
  t.match(
    pj.read(dir),
    { name: 'my-project', version: '1.0.0' },
    'should be able to read file and return parsed JSON',
  )
})

t.test('reads from a package.json path instead of dir', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  const pj = new PackageJson()
  t.match(
    pj.read(join(dir, 'package.json')),
    { name: 'my-project', version: '1.0.0' },
    'should be able to read file and return parsed JSON from its path',
  )
})

t.test('fails on missing package.json file', async t => {
  const dir = t.testdirName
  const pj = new PackageJson()
  try {
    pj.read(dir)
    t.fail('expected to throw')
  } catch (er) {
    try {
      pj.read(dir)
      t.fail('expected to throw')
    } catch (er2) {
      t.equal(
        (er as Error).cause,
        (er2 as Error).cause,
        'error was cached',
      )
    }
  }
  t.throws(
    () => pj.read(dir),
    {
      message: 'Could not read package.json file',
      cause: {
        path: join(dir, 'package.json'),
        cause: { code: 'ENOENT' },
      },
    },
    'should throw ENOENT error on missing package.json file',
  )
})

t.test('fails on malformed package.json file', async t => {
  const dir = t.testdir({
    'package.json': '{%',
  })
  const pj = new PackageJson()
  t.throws(
    () => pj.read(dir),
    {
      message: 'Could not read package.json file',
      cause: {
        path: join(dir, 'package.json'),
        cause: { name: 'JSONParseError' },
      },
    },
    'should throw JSON parser error on malformed package.json file',
  )
})

t.test('read subsequent calls from in-memory cache', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  const pj = new PackageJson()
  const pkg = pj.read(dir)
  const sameDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'swapped-under-your-feet',
      version: '2.0.0',
    }),
  })
  t.strictSame(
    pj.read(sameDir),
    pkg,
    'should run any subsequent call from local in-memory cache',
  )
  t.strictSame(
    JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name,
    'swapped-under-your-feet',
    'package.json on disk should be updated though',
  )
})

t.test('successfully writes a valid package.json file', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify(
      {
        name: 'my-project',
        version: '1.0.0',
      },
      null,
      8,
    ),
  })
  const pj = new PackageJson()
  const originalMani = pj.read(dir)
  originalMani.version = '1.0.1'
  pj.write(dir, originalMani)
  const mani = pj.read(dir)
  t.equal(
    mani.version,
    '1.0.1',
    'version should be updated on new manifest',
  )
  t.matchSnapshot(
    readFileSync(join(dir, 'package.json'), 'utf8'),
    'manifest should be read with original indent',
  )
})

t.test('writes to a package.json filepath', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify(
      {
        name: 'my-project',
        version: '1.0.0',
      },
      null,
      8,
    ),
  })
  const pj = new PackageJson()
  const originalMani = pj.read(dir)
  originalMani.version = '1.0.1'
  pj.write(join(dir, 'package.json'), originalMani)
  const mani = pj.read(dir)
  t.equal(
    mani.version,
    '1.0.1',
    'version should be updated on new manifest',
  )
  t.matchSnapshot(
    readFileSync(join(dir, 'package.json'), 'utf8'),
    'manifest should be read with original indent',
  )
})

t.test('fails on fs errors during write', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  const { PackageJson: MockedPackageJson } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    'node:fs': {
      ...(await import('node:fs')),
      writeFileSync: () => {
        throw new Error('yikes!')
      },
    },
  })
  const pj = new MockedPackageJson()
  const mani = pj.read(dir)
  t.throws(() => pj.write(dir, mani), {
    message: 'Could not write package.json file',
    cause: {
      path: join(dir, 'package.json'),
      cause: { message: 'yikes!' },
    },
  })
})

t.test('successfully saves a manifest', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify(
      {
        name: 'my-project',
        version: '1.0.0',
      },
      null,
      8,
    ),
  })
  const pj = new PackageJson()
  const mani = pj.read(dir)
  mani.version = '1.0.1'
  pj.save(mani)
  const rawMani = readFileSync(join(dir, 'package.json'), 'utf8')
  t.equal(
    JSON.parse(rawMani).version,
    '1.0.1',
    'version should be updated on new manifest',
  )
  t.matchSnapshot(
    rawMani,
    'manifest should be read with original indent',
  )
})

t.test(
  'fails saving a manifest that does not have a cached dir',
  async t => {
    t.testdir({
      'package.json': JSON.stringify(
        {
          name: 'my-project',
          version: '1.0.0',
        },
        null,
        8,
      ),
    })
    const pj = new PackageJson()
    const mani = { name: 'this is not a manifest' }
    t.throws(() => pj.save(mani), {
      message: 'Could not save manifest',
      cause: {
        manifest: mani,
      },
    })
  },
)

t.test(
  'should sort dependencies by name in memory manifest',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify(
        {
          name: 'my-project',
          version: '1.0.0',
          dependencies: {
            c: '1.0.0',
            d: '1.0.0',
            b: '1.0.0',
            a: '1.0.0',
          },
        },
        null,
        8,
      ),
    })
    const pj = new PackageJson()
    const mani = pj.read(dir)
    pj.fix(mani)
    t.matchSnapshot(
      mani.dependencies,
      'dependencies should be sorted by name',
    )
  },
)

t.test('should sort dependencies by name when saving', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify(
      {
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          c: '1.0.0',
          a: '1.0.0',
          d: '1.0.0',
          b: '1.0.0',
        },
      },
      null,
      8,
    ),
  })
  const pj = new PackageJson()
  const mani = pj.read(dir)
  pj.save(mani)
  t.matchSnapshot(
    readFileSync(join(dir, 'package.json'), 'utf8'),
    'saved manifest dependencies should be sorted by name',
  )
})

t.test('find method', async t => {
  // Create a deep nested fixture structure that simulates a realistic file system
  const testDir = t.testdir({
    home: {
      projects: {
        'my-project': {
          'package.json': JSON.stringify({
            name: 'my-project',
            version: '1.0.0',
          }),
          packages: {
            'my-workspace-a': {
              'package.json': JSON.stringify({
                name: 'my-workspace-a',
                version: '1.0.0',
              }),
              src: {
                'index.js': 'console.log("workspace a")',
              },
            },
            'my-workspace-b': {
              'package.json': JSON.stringify({
                name: 'my-workspace-b',
                version: '1.0.0',
              }),
            },
          },
        },
      },
      'other-stuff': {
        'file.txt': 'content',
      },
    },
  })

  const homePath = join(testDir, 'home')
  const pj = new PackageJson()

  await t.test('finds package.json in project root', async t => {
    const projectRoot = join(
      testDir,
      'home',
      'projects',
      'my-project',
    )
    const found = pj.find(projectRoot, homePath)
    t.equal(found, join(projectRoot, 'package.json'))
  })

  await t.test(
    'finds package.json in workspace directory',
    async t => {
      const workspaceA = join(
        testDir,
        'home',
        'projects',
        'my-project',
        'packages',
        'my-workspace-a',
      )
      const found = pj.find(workspaceA, homePath)
      t.equal(found, join(workspaceA, 'package.json'))
    },
  )

  await t.test(
    'finds nearest package.json from nested src directory',
    async t => {
      const srcDir = join(
        testDir,
        'home',
        'projects',
        'my-project',
        'packages',
        'my-workspace-a',
        'src',
      )
      const workspaceA = join(
        testDir,
        'home',
        'projects',
        'my-project',
        'packages',
        'my-workspace-a',
      )
      const found = pj.find(srcDir, homePath)
      t.equal(found, join(workspaceA, 'package.json'))
    },
  )

  await t.test(
    'returns undefined when no package.json found',
    async t => {
      const projectsDir = join(testDir, 'home', 'projects')
      const found = pj.find(projectsDir, homePath)
      t.equal(found, undefined)
    },
  )

  await t.test('stops at home directory', async t => {
    const otherStuff = join(testDir, 'home', 'other-stuff')
    const found = pj.find(otherStuff, homePath)
    t.equal(found, undefined)
  })

  await t.test(
    'prefers closer package.json over distant one',
    async t => {
      const workspaceB = join(
        testDir,
        'home',
        'projects',
        'my-project',
        'packages',
        'my-workspace-b',
      )
      const found = pj.find(workspaceB, homePath)
      t.equal(found, join(workspaceB, 'package.json'))
    },
  )

  await t.test(
    'walks up multiple levels to find package.json',
    async t => {
      // Create a deep structure without package.json until we reach the workspace
      const deepTestDir = t.testdir({
        home: {
          projects: {
            'deep-project': {
              'package.json': JSON.stringify({
                name: 'deep-project',
                version: '1.0.0',
              }),
              src: {
                components: {
                  ui: {
                    buttons: {
                      'button.js': 'export const Button = () => {}',
                    },
                  },
                },
              },
            },
          },
        },
      })

      const deepHome = join(deepTestDir, 'home')
      const deepPath = join(
        deepTestDir,
        'home',
        'projects',
        'deep-project',
        'src',
        'components',
        'ui',
        'buttons',
      )
      const projectRoot = join(
        deepTestDir,
        'home',
        'projects',
        'deep-project',
      )

      const found = pj.find(deepPath, deepHome)
      t.equal(found, join(projectRoot, 'package.json'))
    },
  )

  await t.test(
    'handles empty directories without package.json',
    async t => {
      const emptyTestDir = t.testdir({
        home: {
          empty: {
            'file.txt': 'just a file',
          },
        },
      })

      const emptyHome = join(emptyTestDir, 'home')
      const emptyDir = join(emptyTestDir, 'home', 'empty')

      const found = pj.find(emptyDir, emptyHome)
      t.equal(found, undefined)
    },
  )

  await t.test('uses custom cwd parameter correctly', async t => {
    // Test with different cwd values using the main fixture
    const customCwd = join(
      testDir,
      'home',
      'projects',
      'my-project',
      'packages',
    )
    const found = pj.find(customCwd, homePath)
    t.equal(
      found,
      join(testDir, 'home', 'projects', 'my-project', 'package.json'),
    )
  })

  t.test('respects custom home parameter', async t => {
    const customTestDir = t.testdir({
      'custom-home': {
        'package.json': JSON.stringify({ name: 'should-not-find' }),
      },
      project: {
        'package.json': JSON.stringify({ name: 'should-find' }),
        nested: {
          'file.txt': 'content',
        },
      },
    })

    const customHome = join(customTestDir, 'custom-home')
    const nestedDir = join(customTestDir, 'project', 'nested')
    const projectDir = join(customTestDir, 'project')

    const found = pj.find(nestedDir, customHome)
    t.equal(found, join(projectDir, 'package.json'))
  })
})
