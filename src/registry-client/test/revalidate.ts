import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import t from 'tap'
import { __CODE_SPLIT_SCRIPT_NAME } from '../src/revalidate.ts'

const ENV = {
  NODE_OPTIONS: '--no-warnings --experimental-strip-types',
}

t.test('validate args', async t => {
  t.match(
    spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME], {
      input: '',
      stdio: ['pipe', 'inherit', 'inherit'],
      encoding: 'utf8',
      env: ENV,
    }),
    {
      status: 1,
    },
  )
  t.match(
    spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME, 'path'], {
      input: '',
      env: ENV,
    }),
    {
      status: 1,
    },
  )
  t.match(
    spawnSync(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, t.testdir()],
      {
        input: 'nope\0not valid\0no valid keys\0',
        env: ENV,
      },
    ),
    { status: 1 },
  )
})

t.test('revalidate a url', async t => {
  let requests = 0
  const server = createServer((req, res) => {
    t.equal(req.url, '/' + String(req.method))
    requests++
    req.resume()
    res.setHeader('connection', 'close')
    res.end('ok')
  })
  const PORT = Number(8080 + Number(process.env.TAP_CHILD_ID ?? '0'))
  const reg = `http://localhost:${PORT}`
  await new Promise<void>(res => server.listen(PORT, () => res()))

  const res = await new Promise<{
    status: number | null
    signal: NodeJS.Signals | null
  }>(res => {
    const cp = spawn(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, t.testdir({})],
      {
        stdio: ['pipe', 'inherit', 'inherit'],
        env: ENV,
      },
    )
    cp.stdin.write(`GET ${reg}/GET\0HEAD ${reg}/HEAD\0`, () => {
      cp.stdin.end()
    })
    cp.on('close', (status, signal) => {
      res({ status, signal })
    })
  })

  t.matchOnlyStrict(res, {
    status: 0,
    signal: null,
  })

  t.equal(requests, 2)
  server.closeAllConnections()
  server.close()
})
