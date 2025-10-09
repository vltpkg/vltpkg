import { H3 } from 'h3'
import * as npm from '../../src/handlers/npm.ts'
import * as local from '../../src/handlers/local.ts'

const app = new H3()
  .get('/', () => ({ ok: true }))
  // npm
  .get('/npm', () => ({ ok: true }))
  .get('/npm/:param1', npm.getPackageOrVersionHandler)
  .put('/npm/:param1', npm.putPackageHandler)
  .get('/npm/:param1/:param2', npm.getPackageOrVersionHandler)
  .put('/npm/:param1/:param2', npm.putPackageHandler)
  .get('/npm/:param1/:param2/:param3', npm.getPackageOrVersionHandler)
  .get('/npm/:param1/-/:tarball', npm.getTarballHandler)
  .get('/npm/:param1/:param2/-/:tarball', npm.getTarballHandler)
  // local
  .get('/local/:param1', local.getPackageOrVersionHandler)
  .get('/local/:param1/:param2', local.getPackageOrVersionHandler)
  .put('/local/:param1/:param2', local.getPackageOrVersionHandler)
  .get(
    '/local/:param1/:param2/:param3',
    local.getPackageOrVersionHandler,
  )
  .get('/local/:param1/-/:tarball', local.getTarballHandler)
  .get('/local/:param1/:param2/-/:tarball', local.getTarballHandler)
  // default (must come last)
  .get('/:param1', npm.getPackageOrVersionHandler)
  .get('/:param1/:param2', local.getPackageOrVersionHandler)
  .put('/:param1/:param2', local.getPackageOrVersionHandler)
  .get('/:param1/:param2/:param3', local.getPackageOrVersionHandler)
  .get('/:param1/-/:tarball', local.getTarballHandler)
  .get('/:param1/:param2/-/:tarball', local.getTarballHandler)

export default app.handler
