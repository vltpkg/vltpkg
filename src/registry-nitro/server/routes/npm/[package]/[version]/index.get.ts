import { getRouterParam } from 'h3'
import { cachedEventHandler } from 'nitro/runtime'

export default cachedEventHandler(
  async event => {
    const pkg = getRouterParam(event, 'package')!
    const version = getRouterParam(event, 'version')!
    const x = await $fetch(
      `https://registry.npmjs.org/${pkg}/${version}`,
    )
    return x
  },
  {
    name: 'package_version',
    maxAge: 5 * 60,
    getKey: event => {
      const pkg = getRouterParam(event, 'package')!
      const version = getRouterParam(event, 'version')!
      return `npm_${pkg}_${version}`
    },
  },
)
