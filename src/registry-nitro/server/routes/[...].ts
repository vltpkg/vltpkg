import { H3 } from 'h3'
import * as npm from '../../src/handlers/npm.ts'
import * as local from '../../src/handlers/local.ts'
import { requireAuth } from '../../src/middleware/auth.ts'

const app = new H3()
  .get('/', () => ({ ok: true }))
  // npm (no auth required - public proxy)
  .get('/npm/:param1', npm.getPackageOrVersionHandler)
  .put('/npm/:param1', npm.putPackageHandler)
  .get('/npm/:param1/:param2', npm.getPackageOrVersionHandler)
  .put('/npm/:param1/:param2', npm.putPackageHandler)
  .get('/npm/:param1/:param2/:param3', npm.getPackageOrVersionHandler)
  .get('/npm/:param1/-/:tarball', npm.getTarballHandler)
  .get('/npm/:param1/:param2/-/:tarball', npm.getTarballHandler)
  .get('/npm/-/v1/search', npm.searchHandler)
  // local (auth required for PUT operations)
  .get('/local/:param1', local.getPackageOrVersionHandler)
  .put('/local/:param1', requireAuth(local.putPackageHandler))
  .get('/local/:param1/:param2', local.getPackageOrVersionHandler)
  .put('/local/:param1/:param2', requireAuth(local.putPackageHandler))
  .get(
    '/local/:param1/:param2/:param3',
    local.getPackageOrVersionHandler,
  )
  .get('/local/:param1/-/:tarball', local.getTarballHandler)
  .get('/local/:param1/:param2/-/:tarball', local.getTarballHandler)
  .get('/-/v1/search', local.searchHandler)
  // default (must come last) - auth required for PUT operations
  .get('/:param1', local.getPackageOrVersionHandler)
  .put('/:param1', requireAuth(local.putPackageHandler))
  .get('/:param1/:param2', local.getPackageOrVersionHandler)
  .put('/:param1/:param2', requireAuth(local.putPackageHandler))
  .get('/:param1/:param2/:param3', local.getPackageOrVersionHandler)
  .get('/:param1/-/:tarball', local.getTarballHandler)
  .get('/:param1/:param2/-/:tarball', local.getTarballHandler)
  .get('/-/v1/search', npm.searchHandler) // TODO: change this to local search

export default app.handler
