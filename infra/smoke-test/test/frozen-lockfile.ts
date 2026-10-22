import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'

t.test('frozen + warm cache: no registry requests', async t => {
  const npm = 'https://registry.npmjs.org/'
  const seen: string[] = []
  // logs every request, proxies to npm w/ tarball urls rewritten
  const server = createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`)
    fetch(new URL(req.url ?? '/', npm), {
      headers: { accept: req.headers.accept ?? '*/*' },
    })
      .then(async r => {
        const type = r.headers.get('content-type') ?? ''
        let body = Buffer.from(await r.arrayBuffer())
        if (type.includes('json')) {
          body = Buffer.from(body.toString().replaceAll(npm, reg))
        }
        res.writeHead(r.status, { 'content-type': type })
        res.end(body)
      })
      .catch(() => {
        res.statusCode = 502
        res.end()
      })
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  t.teardown(() => {
    server.closeAllConnections()
    server.close()
  })
  const { port } = server.address() as AddressInfo
  const reg = `http://127.0.0.1:${port}/`

  const { status } = await runMultiple(t, ['install'], {
    packageJson: { name: 'x', dependencies: { debug: '4' } },
    env: {
      VLT_REGISTRY: reg,
      VLT_REGISTRIES: `npm=${reg}`,
      DO_NOT_TRACK: '1',
    },
    match: ['status'],
    test: async ({ t, status, dirs, run }) => {
      t.equal(status, 0)
      t.not(seen.length, 0, 'populated through proxy')
      seen.length = 0
      const lock = readFileSync(
        join(dirs.project, 'vlt-lock.json'),
        'utf8',
      )
      t.notMatch(lock, npm, 'lockfile points at proxy')
      const nm = join(dirs.project, 'node_modules')
      const pj = join(nm, 'debug/package.json')

      rmSync(nm, { recursive: true, force: true, maxRetries: 5 })
      const bare = await run(['install', '--frozen-lockfile'])
      t.equal(bare.status, 0)
      t.strictSame(seen, [], 'no requests w/o node_modules')
      t.ok(existsSync(pj))

      seen.length = 0
      const again = await run(['install', '--frozen-lockfile'])
      t.equal(again.status, 0)
      t.strictSame(seen, [], 'no requests w/ node_modules')
    },
  })
  t.equal(status, 0)
})
