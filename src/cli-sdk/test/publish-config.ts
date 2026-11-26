import t from 'tap'
import { PackageJson } from '@vltpkg/package-json'
import type { NormalizedManifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import type { LoadedConfig } from '../src/config/index.ts'
import {
  getPublishConfig,
  getPublishDirectory,
  localPublishRegistry,
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

t.test('localPublishRegistry', async t => {
  const conf = {
    options: { packageJson: new PackageJson() },
  } as unknown as LoadedConfig
  const registry = 'https://r.example.com/'

  t.test('no package.json', async t => {
    const none = {
      options: { packageJson: { find: () => undefined } },
    } as unknown as LoadedConfig
    t.equal(localPublishRegistry(none), undefined)
  })

  t.test('no publishConfig', async t => {
    t.chdir(t.testdir({ 'package.json': '{"name":"a"}' }))
    t.equal(localPublishRegistry(conf), undefined)
  })

  t.test('publishConfig.registry', async t => {
    t.chdir(
      t.testdir({
        'package.json': JSON.stringify({
          name: 'a',
          publishConfig: { registry },
        }),
      }),
    )
    t.equal(localPublishRegistry(conf), registry, 'any package')
    t.equal(localPublishRegistry(conf, 'a'), registry, 'same name')
    t.equal(localPublishRegistry(conf, 'b'), undefined, 'other name')
  })
})
