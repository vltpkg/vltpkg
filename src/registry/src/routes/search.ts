import type { HonoContext } from '../../types.ts'

/**
 * Search for packages by text query
 */
export async function searchPackages(c: HonoContext) {
  try {
    const text = c.req.query('text')
    
    if (!text) {
      return c.json({
        error: 'Missing required parameter "text"'
      }, 400)
    }

    // Use the existing database search function
    const results = await c.get('db').searchPackages(text)

    return c.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return c.json({
      error: 'Internal server error'
    }, 500)
  }
}
