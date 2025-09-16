import { dirname } from 'node:path'
import t from 'tap'

const mockOS = t.createMock(await import('node:os'), {
  homedir: () => '/x/y',
})
const { getReadablePath } = await t.mockImport<
  typeof import('../src/get-readable-path.ts')
>('../src/get-readable-path.ts', { os: mockOS })

t.equal(getReadablePath('/x/y/z'), '~/z')
t.equal(getReadablePath('/x/y'), '~')
t.equal(getReadablePath('/x/y/'), '~/')
t.equal(getReadablePath('/a/b/c'), '/a/b/c')

t.test('getReadablePath with homedir error', async t => {
  const { getReadablePath: getReadablePathWithError } =
    await t.mockImport<typeof import('../src/get-readable-path.ts')>(
      '../src/get-readable-path.ts',
      {
        'node:os': t.createMock(await import('node:os'), {
          homedir: () => {
            throw new Error('Permission denied')
          },
        }),
      },
    )

  // Should fall back to dirname(process.cwd()) and still work
  const cwd = dirname(process.cwd())
  t.equal(getReadablePathWithError(`${cwd}/test`), '~/test')
  t.equal(
    getReadablePathWithError('/some/other/path'),
    '/some/other/path',
  )
})
