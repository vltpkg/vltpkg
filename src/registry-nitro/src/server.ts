import { H3, defineMiddleware } from 'nitro/h3'
import { getDb } from './db/index.ts'
import {
  packumentHandler,
  versionHandler,
  tarballHandler,
} from './upstream/npm.ts'
import { initTelemetry } from './telemetry.ts'

// Ensure telemetry is initialized early
initTelemetry()

const app = new H3()
app.use(
  defineMiddleware(event => {
    event.context.db = getDb()
  }),
)
app.get('/', () => ({ ok: true }))

const npm = new H3()
npm.get('/:name', packumentHandler)
npm.get('/@:scope/:name', packumentHandler)
npm.get('/:name/:version', versionHandler)
npm.get('/@:scope/:name/:version', versionHandler)
npm.get('/:name/-/:tarball', tarballHandler)
npm.get('/@:scope/:name/-/:tarball', tarballHandler)
app.mount('/npm', npm)

export default {
  async fetch(request: Request) {
    const url = new URL(request.url)

    // The npm CLI will sometimes use an encoded forward slash (%2F) so we decode only that
    // character into a new request so that our scoped handlers work as expected.
    if (
      url.pathname.includes('%2F') ||
      url.pathname.includes('%2f')
    ) {
      url.pathname = url.pathname
        .replaceAll('%2F', '/')
        .replaceAll('%2f', '/')
      request = new Request(url.toString(), request)
    }

    return app.fetch(request)
  },
}
