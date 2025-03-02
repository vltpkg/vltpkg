/**
 * Given a server and a starting port, keep listening on every port in
 * sequence until the first available one is found, and return it.
 *
 * If an available port cannot be found, then the last error will be raised.
 */

import { Server } from 'node:http'

export const listenCarefully = async (
  server: Server,
  start: number,
  end = 1000,
): Promise<number> => {
  let port = start
  return new Promise<number>((res, rej) => {
    server.once('listening', () => {
      server.removeListener('error', onerr)
      res(port)
    })

    const onerr = (er: unknown) => {
      if (
        port >= start + end ||
        !er ||
        typeof er !== 'object' ||
        !(er instanceof Error) ||
        (er as NodeJS.ErrnoException).code !== 'EADDRINUSE'
      ) {
        rej(er)
        return
      }
      port ++
      server.listen(port)
    }

    server.on('error', onerr)
    server.listen(port)
  })
}
