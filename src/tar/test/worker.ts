import t from 'tap'
import { isResponseOK } from '../src/worker.ts'

t.equal(isResponseOK({ id: 1, ok: true }), true)
t.equal(isResponseOK({ id: 1, ok: false }), false)
t.equal(isResponseOK({ id: 1, error: 'nope' }), false)

let unpackCalled = false
let unpackThrow = false
const { Worker } = await t.mockImport<
  typeof import('../src/worker.ts')
>('../src/worker.ts', {
  '../src/unpack.js': {
    unpack: async () => {
      unpackCalled = true
      if (unpackThrow) throw new Error('unpack fail')
    },
  },
})

t.test('worker that works', t => {
  const w = new Worker(msg => {
    t.equal(unpackCalled, true)
    t.strictSame(msg, {
      id: 1,
      ok: true,
    })
    t.end()
  })

  unpackCalled = false
  unpackThrow = false
  void w.process({
    id: 1,
    tarData: Buffer.alloc(0),
    target: '',
    resolve: () => {},
    reject: () => {},
    promise: new Promise(() => {}),
  })
})

t.test('worker that fails', t => {
  const w = new Worker(msg => {
    t.strictSame(msg, {
      id: 1,
      error: new Error('unpack fail'),
    })
    t.end()
  })

  unpackCalled = false
  unpackThrow = true
  void w.process({
    id: 1,
    tarData: Buffer.alloc(0),
    target: '',
    resolve: () => {},
    reject: () => {},
    promise: new Promise(() => {}),
  })
})
