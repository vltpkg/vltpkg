import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'

t.test(
  'extracts packages/vlt from package-examples into an empty target directory',
  async t => {
    let versionChecked = false
    let extractedSpec: unknown
    let extractedTarget: unknown
    const { createPkgExample } = await t.mockImport<
      typeof import('../src/pkg-example.ts')
    >('../src/pkg-example.ts', {
      '@vltpkg/git': {
        spawn: async (args: string[]) => {
          t.strictSame(args, ['--version'])
          versionChecked = true
          return {}
        },
      },
      '@vltpkg/package-info': {
        PackageInfoClient: class {
          async extract(spec: unknown, target: unknown) {
            extractedSpec = spec
            extractedTarget = target
          }
        },
      },
    })

    const dir = t.testdir()
    const target = resolve(dir, 'my-package')

    await createPkgExample(target)

    t.equal(versionChecked, true, 'checked for a working git binary')
    t.equal(
      extractedSpec,
      'pkg-example@git+https://github.com/vltpkg/package-examples.git#main::path:packages/vlt',
      'resolved the packages/vlt subpath from package-examples',
    )
    t.equal(extractedTarget, target)
  },
)

t.test('throws a clear error when git is not available', async t => {
  const { createPkgExample } = await t.mockImport<
    typeof import('../src/pkg-example.ts')
  >('../src/pkg-example.ts', {
    '@vltpkg/git': {
      spawn: async () => {
        throw new Error('spawn git ENOENT')
      },
    },
    '@vltpkg/package-info': {
      PackageInfoClient: class {
        async extract() {
          throw new Error('should not be called')
        }
      },
    },
  })

  const dir = t.testdir()
  const target = resolve(dir, 'my-package')

  await t.rejects(
    createPkgExample(target),
    /git is required to scaffold this example/,
    'rejects with a tutorial-specific error instead of the raw spawn failure',
  )
})

t.test(
  'refuses to overwrite a non-empty target directory',
  async t => {
    const { createPkgExample } = await t.mockImport<
      typeof import('../src/pkg-example.ts')
    >('../src/pkg-example.ts', {
      '@vltpkg/git': {
        spawn: async () => {
          throw new Error('should not be called')
        },
      },
      '@vltpkg/package-info': {
        PackageInfoClient: class {
          async extract() {
            throw new Error('should not be called')
          }
        },
      },
    })

    const dir = t.testdir({
      'my-package': {
        'existing-file.txt': 'do not touch me',
      },
    })
    const target = resolve(dir, 'my-package')

    await t.rejects(
      createPkgExample(target),
      /already exists and is not empty/,
      'rejects before ever checking git or touching the filesystem',
    )
    t.strictSame(
      await readdir(target),
      ['existing-file.txt'],
      'existing contents are left untouched',
    )
  },
)
