import { getRouterParam } from 'h3'
import { cachedEventHandler } from 'nitro/runtime'

export default cachedEventHandler(
  async event => {
    const scope = getRouterParam(event, 'scope')!
    const pkg = getRouterParam(event, 'package')!
    const version = getRouterParam(event, 'version')!
    const x = await $fetch(
      `https://registry.npmjs.org/@${scope}/${pkg}/${version}`,
    )
    return x
  },
  {
    name: 'scoped_package_version',
    maxAge: 5 * 60,
    getKey: event => {
      const scope = getRouterParam(event, 'scope')!
      const pkg = getRouterParam(event, 'package')!
      const version = getRouterParam(event, 'version')!
      return `npm_scoped_${scope}_${pkg}_${version}`
    },
  },
)
