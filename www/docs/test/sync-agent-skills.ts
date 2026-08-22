import { join } from 'node:path'
import t from 'tap'
import {
  DEFAULT_SITE_URL,
  readSiteUrl,
} from '../scripts/sync-agent-skills.mts'

t.test('readSiteUrl', async t => {
  t.test('reads the site: value out of astro.config.mts', async t => {
    const dir = t.testdir({
      'astro.config.mts': [
        'export default {',
        "  site: 'https://example.com',",
        '}',
      ].join('\n'),
    })
    t.equal(
      readSiteUrl(join(dir, 'astro.config.mts')),
      'https://example.com',
    )
  })

  t.test(
    'falls back to the default when the file is missing',
    async t => {
      const dir = t.testdir({})
      t.equal(
        readSiteUrl(join(dir, 'does-not-exist.mts')),
        DEFAULT_SITE_URL,
      )
    },
  )

  t.test(
    'falls back to the default when site: is not present',
    async t => {
      const dir = t.testdir({
        'astro.config.mts': 'export default {}',
      })
      t.equal(
        readSiteUrl(join(dir, 'astro.config.mts')),
        DEFAULT_SITE_URL,
      )
    },
  )
})
