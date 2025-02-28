import type { IncomingMessage, ServerResponse } from 'http'

export const read = <T>(req: IncomingMessage) =>
  new Promise<T>(resolve => {
    req.setEncoding('utf8')
    let json = ''
    req.on('data', (d: string) => (json += d))
    req.on('end', () => resolve(JSON.parse(json) as T))
  })

export const error = (
  res: ServerResponse,
  errType: string,
  err: unknown,
  code: number = 500,
) => {
  console.error(err)
  res.statusCode = code
  res.end(JSON.stringify(`${errType}\n${err}`))
}

export const ok = (res: ServerResponse, result: string) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(result))
}
