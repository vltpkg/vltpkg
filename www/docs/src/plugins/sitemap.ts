import { copyFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

export const sitemapAlias = (): AstroIntegration => ({
  name: 'vlt-sitemap-alias',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const destDir = fileURLToPath(dir)
      const indexFile = `${destDir}/sitemap-index.xml`
      const targetFile = `${destDir}/sitemap.xml`

      const xml = await readFile(indexFile, 'utf8')
      await copyFile(indexFile, targetFile)
      logger.info(`published /sitemap.xml (${xml.length} bytes)`)
    },
  },
})
