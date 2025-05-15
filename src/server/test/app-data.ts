import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'

const { AppDataManager, version } = await t.mockImport<
  typeof import('../src/app-data.ts')
>('../src/app-data.ts', {
  'package-json-from-dist': {
    loadPackageJson: () => ({ version: '1.2.3' }),
  },
})

t.equal(version, '1.2.3')

t.test('AppDataManager construction', async t => {
  const publicDir = t.testdirName
  const manager = new AppDataManager({ publicDir })
  t.equal(manager.version, '1.2.3')
  t.equal(manager.publicDir, publicDir)
})

t.test('update app data with existing file', async t => {
  const dir = t.testdir({
    public: {
      'app-data.json': JSON.stringify({
        buildVersion: 'old-version',
      }),
    },
  })
  const publicDir = resolve(dir, 'public')
  const manager = new AppDataManager({ publicDir })

  t.equal(await manager.update(), true)
  const appDataPath = resolve(dir, 'public/app-data.json')
  t.matchOnly(JSON.parse(readFileSync(appDataPath, 'utf8')), {
    buildVersion: '1.2.3',
  })
})
