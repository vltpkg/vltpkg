import t from 'tap'
import type { NormalizedManifest } from '@vltpkg/types'
import { getPublishConfig } from '../src/publish-config.ts'

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
