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

      const xml = await readFile(indexFile, 'utf8').catch(() => null)
      if (!xml) {
        logger.warn(
          `sitemap-index.xml not found; skipping /sitemap.xml alias. ` +
            `Ensure @astrojs/sitemap runs before this integration.`,
        )
        return
      }

      await copyFile(indexFile, targetFile)
      logger.info(`published /sitemap.xml (${xml.length} bytes)`)
    },
  },
})
