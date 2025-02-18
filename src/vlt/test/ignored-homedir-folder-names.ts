import t from 'tap'

t.test('darwin', async t => {
  t.intercept(process, 'platform', { value: 'darwin' })
  const { ignoredHomedirFolderNames } = await t.mockImport<
    typeof import('../src/ignored-homedir-folder-names.ts')
  >('../src/ignored-homedir-folder-names.ts')
  t.matchSnapshot(
    ignoredHomedirFolderNames.sort((a, b) =>
      a.localeCompare(b, 'en'),
    ),
  )
})

t.test('win32', async t => {
  t.intercept(process, 'platform', { value: 'win32' })
  const { ignoredHomedirFolderNames } = await t.mockImport<
    typeof import('../src/ignored-homedir-folder-names.ts')
  >('../src/ignored-homedir-folder-names.ts')
  t.matchSnapshot(
    ignoredHomedirFolderNames.sort((a, b) =>
      a.localeCompare(b, 'en'),
    ),
  )
})

t.test('linux', async t => {
  t.intercept(process, 'platform', { value: 'linux' })
  const { ignoredHomedirFolderNames } = await t.mockImport<
    typeof import('../src/ignored-homedir-folder-names.ts')
  >('../src/ignored-homedir-folder-names.ts')
  t.matchSnapshot(
    ignoredHomedirFolderNames.sort((a, b) =>
      a.localeCompare(b, 'en'),
    ),
  )
})
