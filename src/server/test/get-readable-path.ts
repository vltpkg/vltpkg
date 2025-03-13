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
