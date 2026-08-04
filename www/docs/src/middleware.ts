import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url

  // Redirect /migration/from-pnpm to /cli/migration/from-pnpm
  if (pathname === '/migration/from-pnpm') {
    return context.redirect('/cli/migration/from-pnpm', 301)
  }

  return next()
})
