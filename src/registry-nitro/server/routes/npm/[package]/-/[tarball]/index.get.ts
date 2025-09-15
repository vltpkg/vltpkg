import { getRouterParam, eventHandler, proxy } from 'h3'
// import { cachedEventHandler } from 'nitro/runtime'

export default eventHandler(
  async event => {
    const pkg = getRouterParam(event, 'package')!
    const tarball = getRouterParam(event, 'tarball')!
    console.log('tarball', tarball)
    return proxy(
      event,
      `https://registry.npmjs.org/${pkg}/-/${tarball}`,
    )
  },
  // {
  //   name: 'package',
  //   maxAge: 5 * 60,
  //   getKey: event => {
  //     const pkg = getRouterParam(event, 'package')!
  //     return `npm_${pkg}`
  //   },
  // },
)
