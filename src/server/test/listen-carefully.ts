import { createServer } from 'http'
import t from 'tap'
import { listenCarefully } from '../src/listen-carefully.ts'

t.test('run 10 servers', async t => {
  const servers = [
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
    createServer((_, res) => res.end('ok')),
  ]
  const ports = await Promise.all(
    servers.map(s => listenCarefully(s, 8000)),
  )
  t.strictSame(ports, [...new Set(ports)], 'all ports unique')
  const s = createServer((_, res) => res.end('ok'))
  await t.rejects(listenCarefully(s, 8000, 2), {
    code: 'EADDRINUSE',
  })
  for (const s of servers) {
    s.close()
  }
})

t.test('fail to open, in wierd way', async t => {
  const s = createServer((_, res) => res.end('ok'))
  s.listen = () => {
    s.emit('error', new Error('poop'))
    return s
  }
  await t.rejects(listenCarefully(s, 8000, 10), new Error('poop'))
})
