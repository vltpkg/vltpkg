import { llms } from 'fumadocs-core/source'
import { source } from '@/lib/source'

// drop typedoc's `_media` README copies, which the sidebar hides too
export const GET = async () =>
  new Response(
    (await llms(source).index())
      .split('\n')
      .filter(line => !line.includes('_media'))
      .join('\n'),
  )
