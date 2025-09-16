import { cachedEventHandler, defineNitroPlugin } from 'nitro/runtime'
import { getRouterParam, proxy } from 'h3'
import type { HTTPEvent, EventHandlerRequest } from 'h3'
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

const getPackageOrVersionHandler = cachedEventHandler(
  async event => {
    const param1 = assertParam(event, 'param1')
    const param2 = getRouterParam(event, 'param2')
    const param3 = getRouterParam(event, 'param3')
    const resp = await $fetch(
      `https://registry.npmjs.org/${joinParams('/', param1, param2, param3)}`,
    )
    console.log('fetched resp for', param1, param2, param3)
    return resp
  },
  {
    base: 'packages',
    integrity: 'packages.0',
    maxAge: 60 * 60,
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
    const param2 = assertParam(event, 'param2')
    const tarball = assertParam(event, 'tarball')
    console.log('fetched tarball for', param1, param2, tarball)
    return proxy(
      event,
      `https://registry.npmjs.org/${joinParams('/', param1, param2)}/-/${tarball}`,
    )
  },
  {
    base: 'tarballs',
    integrity: 'tarballs.0',
    maxAge: 5 * 60,
    getKey: event => {
      const param1 = assertParam(event, 'param1')
      const param2 = assertParam(event, 'param2')
      const tarball = assertParam(event, 'tarball')
      return `npm___tarball___${joinParams('_', param1, param2, tarball)}`
    },
  },
)

export default defineNitroPlugin(nitroApp => {
  const { _h3: h3 } = nitroApp
  assert(h3, 'h3 is not available')

  h3.get('/npm', () => ({}))
  h3.get('/npm/:param1', getPackageOrVersionHandler)
  h3.get('/npm/:param1/:param2', getPackageOrVersionHandler)
  h3.get('/npm/:param1/:param2/:param3', getPackageOrVersionHandler)
  h3.get('/npm/:param1/-/:tarball', getTarballHandler)
  h3.get('/npm/:param1/:param2/-/:tarball', getTarballHandler)
})
