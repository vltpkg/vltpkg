import type { APIRoute } from 'astro'
import { toMarkdown } from '@/lib/to-markdown.ts'

/**
 * API endpoint for serving markdown versions of docs.
 * Usage: GET /api/markdown/path/to/doc
 *
 * Supports markdown content negotiation for AI agents:
 * - Returns markdown when Accept: text/markdown header is sent
 * - Returns 200 status with Content-Type: text/markdown
 *
 * Used by the copy-to-markdown button in the UI.
 */

// This route must be dynamic (not pre-rendered)
export const prerender = false

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const slug = params.slug
    console.log('[markdown API] Received slug:', slug)

    if (!slug) {
      console.error('[markdown API] Missing slug parameter')
      return new Response('Missing slug parameter', {
        status: 400,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
        },
      })
    }

    // Convert path like "cli/commands/install" to doc ID
    // In Starlight, the doc ID is the file path relative to src/content/docs
    const docId = slug.replace(/\/$/, '') // Remove trailing slash
    console.log('[markdown API] Using docId:', docId)

    // Convert to markdown
    const markdown = await toMarkdown({
      docId,
      request,
    })

    console.log(
      '[markdown API] Successfully converted to markdown:',
      markdown.length,
      'characters',
    )

    // Return with markdown content type
    return new Response(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error(
      '[markdown API] Error converting to markdown:',
      error,
    )

    const message =
      error instanceof Error ? error.message : 'Unknown error'

    return new Response(message, {
      status: 500,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    })
  }
}
