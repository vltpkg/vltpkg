import type { QueueBatch } from '../../types.ts'
import { createDatabaseOperations } from '../db/client.ts'
import {
  getUpstreamConfig,
  buildUpstreamUrl,
} from '../utils/upstream.ts'

/**
 * Queue handler for background cache refresh jobs
 *
 * Processes queue messages to refresh package and version cache data
 * from upstream registries. This runs in the background to keep
 * cached data fresh without blocking user requests.
 */
export async function queue(batch: QueueBatch, env: any) {
  const db = createDatabaseOperations(env.DB)

  for (const message of batch.messages) {
    try {
      const { type, packageName, spec, upstream, options } =
        message.body

      if (type === 'package_refresh' && packageName) {
        // Handle package refresh - refetch from upstream and cache
        const upstreamConfig = getUpstreamConfig(upstream)
        if (upstreamConfig) {
          const upstreamUrl = buildUpstreamUrl(
            upstreamConfig,
            packageName,
          )
          const response = await fetch(upstreamUrl, {
            headers: { Accept: 'application/json' },
          })

          if (response.ok) {
            const upstreamData = await response.json()

            // Cache the package metadata
            if (upstreamData['dist-tags']) {
              await db.upsertCachedPackage(
                packageName,
                upstreamData['dist-tags'],
                upstream,
                new Date().toISOString(),
              )
            }

            // Cache all versions
            if (upstreamData.versions) {
              const versionPromises = Object.entries(
                upstreamData.versions,
              ).map(async ([version, manifest]) => {
                try {
                  await db.upsertCachedVersion(
                    `${packageName}@${version}`,
                    manifest as any,
                    upstream,
                    (manifest as any)?.publishedAt ||
                      new Date().toISOString(),
                  )
                } catch (_error) {
                  // Silently fail individual versions
                }
              })
              await Promise.allSettled(versionPromises)
            }
          }
        }
      } else if (type === 'version_refresh' && spec) {
        // Handle version refresh - similar logic for individual versions
        // (This would be implemented if needed)
      }

      // Acknowledge successful processing
      message.ack()
    } catch (error) {
      // Retry failed messages
      console.error('Queue processing error:', error)
      message.retry()
    }
  }
}
