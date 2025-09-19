import { H3 } from 'h3'
import {
  getPackageOrVersionHandler,
  getTarballHandler,
} from '../../src/handlers/npm.ts'

const app = new H3()
  .get('/', () => ({ ok: true }))
  .get('/npm', () => ({ ok: true }))
  .get('/npm/:param1', getPackageOrVersionHandler)
  .get('/npm/:param1/:param2', getPackageOrVersionHandler)
  .get('/npm/:param1/:param2/:param3', getPackageOrVersionHandler)
  .get('/npm/:param1/-/:tarball', getTarballHandler)
  .get('/npm/:param1/:param2/-/:tarball', getTarballHandler)

export default app.handler
