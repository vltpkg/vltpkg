import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import { makeTar } from '../../tar/test/fixtures/make-tar.ts'
import { createPkgExample } from '../src/pkg-example.ts'

const PREFIX = 'vltpkg-package-examples-abc1234'

const fakeRepoTar = () => {
  const pkgJson = JSON.stringify({ name: '@YOUR-ACCOUNT/my-package' })
  return makeTar([
    {
      path: `${PREFIX}/packages/vlt/package.json`,
      size: pkgJson.length,
    },
    pkgJson,
    { path: `${PREFIX}/packages/npm/package.json`, size: 2 },
    '{}',
  ])
}

t.test(
  'copies packages/vlt contents into an empty target directory',
  async t => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(fakeRepoTar())
    t.teardown(() => {
      globalThis.fetch = originalFetch
    })

    const dir = t.testdir()
    const target = resolve(dir, 'my-package')

    await createPkgExample(target)

    t.strictSame(
      JSON.parse(
        await readFile(resolve(target, 'package.json'), 'utf8'),
      ),
      { name: '@YOUR-ACCOUNT/my-package' },
      'vlt example package.json was copied into the target dir',
    )
    t.strictSame(
      await readdir(target),
      ['package.json'],
      'only the packages/vlt subset was copied, not other example packages',
    )
  },
)

t.test(
  'refuses to overwrite a non-empty target directory',
  async t => {
    const dir = t.testdir({
      'my-package': {
        'existing-file.txt': 'do not touch me',
      },
    })
    const target = resolve(dir, 'my-package')

    await t.rejects(
      createPkgExample(target),
      /already exists and is not empty/,
      'rejects before ever fetching or touching the filesystem',
    )
    t.strictSame(
      await readdir(target),
      ['existing-file.txt'],
      'existing contents are left untouched',
    )
  },
)
