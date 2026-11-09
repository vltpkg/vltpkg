import t from 'tap'
import type { NormalizedManifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import type { LoadedConfig } from '../src/config/index.ts'
import {
  getPublishConfig,
  getPublishDirectory,
} from '../src/publish-config.ts'

const pc = (publishConfig: unknown) =>
  getPublishConfig({ publishConfig } as NormalizedManifest)

t.test('object returned as-is', async t => {
  const publishConfig = { registry: 'https://r.example.com/' }
  t.equal(pc(publishConfig), publishConfig)
})

t.test('missing or non-object → undefined', async t => {
  t.equal(getPublishConfig({}), undefined)
  t.equal(pc(null), undefined)
  t.equal(pc('x'), undefined)
})

t.test('getPublishDirectory', async t => {
  const conf = (cli?: string) =>
    ({
      get: (key: string) =>
        key === 'publish-directory' ? cli : undefined,
    }) as LoadedConfig
  const withDir = {
    publishConfig: { directory: 'dist' },
  } as NormalizedManifest
  const dir = resolve('/pkg')
  t.equal(getPublishDirectory({}, dir, conf()), undefined)
  t.equal(
    getPublishDirectory(withDir, dir, conf()),
    resolve(dir, 'dist'),
    'publishConfig.directory is relative to the package',
  )
  t.equal(
    getPublishDirectory(withDir, dir, conf('/out')),
    '/out',
    'the flag wins, used as-is',
  )
})
