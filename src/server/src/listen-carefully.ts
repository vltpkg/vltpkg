// TODO: this should maybe be a standalone package?
import type { Server } from 'node:http'

/**
 * Given a server and a starting port, keep listening on every port in
 * sequence until the first available one is found, and return it.
 *
 * If an available port cannot be found, then the last error will be raised.
 */
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
      /* c8 ignore start - error always set */
      const err = (er ??
        new Error('Unknown listening error')) as NodeJS.ErrnoException
      /* c8 ignore stop */
      if (
        port >= start + end ||
        !er ||
        typeof er !== 'object' ||
        err.code !== 'EADDRINUSE'
      ) {
        rej(err)
        return
      }
      port++
      server.listen(port)
    }

    server.on('error', onerr)
    server.listen(port)
  })
}
