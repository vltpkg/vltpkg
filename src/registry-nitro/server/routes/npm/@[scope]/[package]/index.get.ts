import { getRouterParam } from 'h3'
import { cachedEventHandler } from 'nitro/runtime'

export default cachedEventHandler(
  async event => {
    const scope = getRouterParam(event, 'scope')!
    const pkg = getRouterParam(event, 'package')!
    const x = await $fetch(
      `https://registry.npmjs.org/@${scope}/${pkg}`,
    )
    return x
  },
  {
    name: 'scoped_package',
    maxAge: 5 * 60,
    getKey: event => {
      const scope = getRouterParam(event, 'scope')!
      const pkg = getRouterParam(event, 'package')!
      return `npm_scoped_${scope}_${pkg}`
    },
  },
)
