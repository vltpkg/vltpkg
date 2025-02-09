import { PassThrough } from 'stream'
import t from 'tap'
import { readPassword, type Streams } from '../src/read-password.ts'

type TestStreams = Streams & {
  stdin: PassThrough
  stdout: PassThrough
}

t.beforeEach(t => {
  const stdin = Object.assign(new PassThrough(), {
    setRawMode(mode: boolean) {
      t.context.setMode = mode
    },
  })
  const stdout = new PassThrough()
  t.context.streams = { stdin, stdout }
})

t.test('read a password', async t => {
  for (const endChar of ['\n', '\r', '\x04']) {
    t.test(`endChar = ${JSON.stringify(endChar)}`, async t => {
      const c = t.context as {
        streams: TestStreams
        setMode: boolean
      }
      const p = readPassword('hello', c.streams)
      t.equal(c.setMode, true)
      c.streams.stdin.write('world')
      c.streams.stdin.write('\x7f')
      c.streams.stdin.write('D')
      c.streams.stdin.write('\n')
      const result = await p
      const written = c.streams.stdout.read().toString()
      t.strictSame(
        { result, setMode: c.setMode, written },
        {
          result: 'worlD',
          setMode: false,
          written: 'hello*****\u001b[1D \u001b[1D*',
        },
      )
    })
  }
  t.end()
})

t.test('cancel reading', async t => {
  const c = t.context as { streams: TestStreams; setMode: boolean }
  const p = readPassword('hello', c.streams)
  t.equal(c.setMode, true)
  c.streams.stdin.write('world')
  c.streams.stdin.write('\x03')
  await t.rejects(p, {
    message: 'canceled',
    cause: { signal: 'SIGINT' },
  })
})
