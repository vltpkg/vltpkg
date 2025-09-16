import { getRouterParam, proxy } from 'h3'
import { cachedEventHandler } from 'nitro/runtime'

export default cachedEventHandler(
  async event => {
    const pkg = getRouterParam(event, 'package')!
    const tarball = getRouterParam(event, 'tarball')!
    console.log(pkg, tarball)
    return proxy(
      event,
      `https://registry.npmjs.org/${pkg}/-/${tarball}`,
    )
  },
  {
    base: 'tarballs',
    maxAge: 5 * 60,
    getKey: event => {
      const pkg = getRouterParam(event, 'package')!
      const tarball = getRouterParam(event, 'tarball')!
      return `npm_${pkg}_${tarball}`
    },
  },
)
