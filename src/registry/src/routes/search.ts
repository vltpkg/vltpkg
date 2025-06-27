import type { HonoContext } from '../../types.ts'

export async function searchPackages(c: HonoContext) {
  try {
    const query = c.req.query('text') || ''
    const scope = c.req.query('scope')

    if (!query.trim()) {
      return c.json({ objects: [], total: 0 }, 200)
    }

    const results = await c.db.searchPackages(query, scope)

    return c.json({
      objects: results.map(pkg => ({
        package: {
          name: pkg.name,
          scope: pkg.name.startsWith('@') ? pkg.name.split('/')[0] : 'unscoped',
          version: pkg.version || '1.0.0',
          description: pkg.description || '',
          keywords: pkg.keywords || [],
          date: pkg.lastUpdated || new Date().toISOString(),
          links: {
            npm: `https://www.npmjs.com/package/${pkg.name}`,
            homepage: pkg.homepage,
            repository: pkg.repository,
            bugs: pkg.bugs
          },
          author: pkg.author,
          publisher: pkg.publisher,
          maintainers: pkg.maintainers || []
        },
        score: {
          final: 1.0,
          detail: {
            quality: 1.0,
            popularity: 1.0,
            maintenance: 1.0
          }
        },
        searchScore: 1.0
      })),
      total: results.length,
      time: new Date().toISOString()
    })
  } catch (error) {
    console.error('[SEARCH ERROR]', error)
    return c.json({ error: 'Search failed' }, 500)
  }
}
