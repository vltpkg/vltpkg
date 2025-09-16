import { getRouterParam } from 'h3'
import { cachedEventHandler } from 'nitro/runtime'

export default cachedEventHandler(
  async event => {
    const pkg = getRouterParam(event, 'package')!
    const x = await $fetch(`https://registry.npmjs.org/${pkg}`)
    return x
  },
  {
    base: 'packages',
    maxAge: 5 * 60,
    getKey: event => {
      const pkg = getRouterParam(event, 'package')!
      return `npm_${pkg}`
    },
  },
)
