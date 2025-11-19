import { H3, defineHandler } from 'nitro/h3'

const npm = new H3()
npm.get(
  '/:name',
  defineHandler(event => {
    const { name } = event.context.params ?? {}
    return { name }
  }),
)
npm.get(
  '/@:scope/:name',
  defineHandler(event => {
    const { scope, name } = event.context.params ?? {}
    return { scope: `@${scope}`, name }
  }),
)
npm.get(
  '/:name/:version',
  defineHandler(event => {
    const { name, version } = event.context.params ?? {}
    return { name, version }
  }),
)
npm.get(
  '/@:scope/:name/:version',
  defineHandler(event => {
    const { scope, name, version } = event.context.params ?? {}
    return { scope: `@${scope}`, name, version }
  }),
)
npm.get(
  '/:name/-/:tarball',
  defineHandler(event => {
    const { name, tarball } = event.context.params ?? {}
    return { name, tarball }
  }),
)
npm.get(
  '/@:scope/:name/-/:tarball',
  defineHandler(event => {
    const { scope, name, tarball } = event.context.params ?? {}
    return { scope: `@${scope}`, name, tarball }
  }),
)

const local = new H3()
local.get(
  '/:name',
  defineHandler(event => {
    const { name } = event.context.params ?? {}
    return { name }
  }),
)
local.get(
  '/@:scope/:name',
  defineHandler(event => {
    const { scope, name } = event.context.params ?? {}
    return { scope: `@${scope}`, name }
  }),
)
local.get(
  '/:name/:version',
  defineHandler(event => {
    const { name, version } = event.context.params ?? {}
    return { name, version }
  }),
)
local.get(
  '/@:scope/:name/:version',
  defineHandler(event => {
    const { scope, name, version } = event.context.params ?? {}
    return { scope: `@${scope}`, name, version }
  }),
)
local.get(
  '/:name/-/:tarball',
  defineHandler(event => {
    const { name, tarball } = event.context.params ?? {}
    return { name, tarball }
  }),
)
local.get(
  '/@:scope/:name/-/:tarball',
  defineHandler(event => {
    const { scope, name, tarball } = event.context.params ?? {}
    return { scope: `@${scope}`, name, tarball }
  }),
)

const app = new H3()
app.get('/', () => ({ ok: true }))
app.mount('/npm', npm)
app.mount('/local', local)

export default {
  async fetch(request: Request) {
    const url = new URL(request.url)

    // The npm CLI will sometimes use an encoded forward slash (%2F) so we
    // decode only that character into a new request so that our scoped handlers work
    // as expected.
    if (
      (url.pathname.startsWith('/npm/') ||
        url.pathname.startsWith('/local/')) &&
      (url.pathname.includes('%2F') || url.pathname.includes('%2f'))
    ) {
      url.pathname = url.pathname
        .replaceAll('%2F', '/')
        .replaceAll('%2f', '/')
      request = new Request(url.toString(), request)
    }

    return app.fetch(request)
  },
}
