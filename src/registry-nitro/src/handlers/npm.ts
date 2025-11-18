import { cachedEventHandler } from 'nitro/runtime'
import {
  getRouterParam,
  proxyRequest,
  eventHandler,
  getQuery,
} from 'h3'
import type { HTTPEvent, H3Event, EventHandler } from 'h3'
import assert from 'node:assert'
import type { CachedEventHandlerOptions } from 'nitro/types'

const CACHE_MANIFESTS = process.env.VSR_NO_CACHE_MANIFESTS !== '1'
const CACHE_TARBALLS = process.env.VSR_NO_CACHE_TARBALLS !== '1'

const assertParam = (event: HTTPEvent, name: string) => {
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

const proxyToNpm = (event: H3Event, url: string) => {
  return proxyRequest(event, `https://registry.npmjs.org${url}`, {
    onResponse: (event, response) => {
      event.res.status = response.status
      event.res.statusText = response.statusText
    },
  })
}

const packageOrVersionOptions: CachedEventHandlerOptions = {
  base: 'packages',
  integrity: 'packages.1',
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
}

const packageOrVersionHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  const param3 = getRouterParam(event, 'param3')
  return proxyToNpm(
    event,
    `/${joinParams('/', param1, param2, param3)}`,
  )
}

export const getPackageOrVersionHandler =
  CACHE_MANIFESTS ?
    cachedEventHandler(
      packageOrVersionHandler,
      packageOrVersionOptions,
    )
  : eventHandler(packageOrVersionHandler)

const tarballOptions: CachedEventHandlerOptions = {
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
}

const tarballHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  const tarball = assertParam(event, 'tarball')
  return proxyToNpm(
    event,
    `/${joinParams('/', param1, param2)}/-/${tarball}`,
  )
}

export const getTarballHandler =
  CACHE_TARBALLS ?
    cachedEventHandler(tarballHandler, tarballOptions)
  : eventHandler(tarballHandler)

export const putPackageHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  return proxyToNpm(event, `/${joinParams('/', param1, param2)}`)
}

export const searchHandler: EventHandler = async event => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({
    // Default values from npm/cli. Might not be needed but let's default to them
    // so the GUI doesn't need to set these.
    quality: '0.65',
    popularity: '0.98',
    maintenance: '0.5',
    ...getQuery(event),
  })) {
    if (value) {
      params.set(key, value)
    }
  }
  return proxyToNpm(
    event,
    `/${joinParams('/', '-', 'v1', 'search')}?${params.toString()}`,
  )
}
