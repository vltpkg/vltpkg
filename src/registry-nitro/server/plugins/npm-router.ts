import { cachedEventHandler, defineNitroPlugin } from 'nitro/runtime'
import { getRouterParam, proxyRequest } from 'h3'
import type { HTTPEvent, EventHandlerRequest, H3Event } from 'h3'
import assert from 'node:assert'

const assertParam = (
  event: HTTPEvent<EventHandlerRequest>,
  name: string,
) => {
  const param = getRouterParam(event, name)
  assert(param, `${name} parameter is required`)
  return param
}

const joinParams = (
  sep: string,
  ...params: (string | undefined)[]
) => {
  return params.filter(Boolean).join(sep)
}

const proxyToNpm = (
  event: H3Event<EventHandlerRequest>,
  url: string,
) => {
  return proxyRequest(event, `https://registry.npmjs.org${url}`, {
    onResponse: (event, response) => {
      event.res.status = response.status
      event.res.statusText = response.statusText
    },
  })
}

const getPackageOrVersionHandler = cachedEventHandler(
  async event => {
    const param1 = assertParam(event, 'param1')
    const param2 = getRouterParam(event, 'param2')
    const param3 = getRouterParam(event, 'param3')
    return proxyToNpm(
      event,
      `/${joinParams('/', param1, param2, param3)}`,
    )
  },
  {
    base: 'packages',
    integrity: 'packages.0',
    // @ts-expect-error - Patched Nitro to support streaming mode
    streaming: true,
    // TODO: If Nitro could make this take a function with the same event signature
    // then we could have different max ages for packages vs versions. Ideally packages
    // should be cached for a short time (5m) and versions for a long time, maybe even forever
    // like tarballs.
    maxAge: 60 * 5,
    getKey: event => {
      const param1 = assertParam(event, 'param1')
      const param2 = getRouterParam(event, 'param2')
      const param3 = getRouterParam(event, 'param3')

      let type: string
      if (!param2 && !param3) {
        type = 'package'
      } else if (param2 && !param3) {
        type = param1.startsWith('@') ? 'package' : 'version'
      } else {
        type = 'version'
      }

      return `npm___${type}___${joinParams('_', param1, param2, param3)}`
    },
  },
)

const getTarballHandler = cachedEventHandler(
  async event => {
    const param1 = assertParam(event, 'param1')
    const param2 = getRouterParam(event, 'param2')
    const tarball = assertParam(event, 'tarball')
    return proxyToNpm(
      event,
      `/${joinParams('/', param1, param2)}/-/${tarball}`,
    )
  },
  {
    base: 'tarballs',
    integrity: 'tarballs.0',
    maxAge: 60 * 60 * 24 * 365 * 100,
    // @ts-expect-error - Patched Nitro to support streaming mode
    streaming: true,
    getKey: event => {
      const param1 = assertParam(event, 'param1')
      const param2 = getRouterParam(event, 'param2')
      const tarball = assertParam(event, 'tarball')
      return `npm___tarball___${joinParams('_', param1, param2, tarball)}`
    },
  },
)

export default defineNitroPlugin(nitroApp => {
  const { _h3: h3 } = nitroApp
  assert(h3, 'h3 is not available')

  h3.get('/', () => ({ ok: true }))
  h3.get('/npm', () => ({ ok: true }))
  h3.get('/npm/:param1', getPackageOrVersionHandler)
  h3.get('/npm/:param1/:param2', getPackageOrVersionHandler)
  h3.get('/npm/:param1/:param2/:param3', getPackageOrVersionHandler)
  h3.get('/npm/:param1/-/:tarball', getTarballHandler)
  h3.get('/npm/:param1/:param2/-/:tarball', getTarballHandler)
})
