import EventEmitter from 'events'
import t from 'tap'

t.test('run the remover', async t => {
  const mockStdin = new EventEmitter()
  t.intercept(process, 'stdin', { value: mockStdin })
  t.chdir(
    t.testdir({
      a: {
        b: '',
        c: '',
      },
      d: {
        e: '',
        f: '',
      },
    }),
  )
  const rms: string[] = []
  await t.mockImport('../src/remove.js', {
    rimraf: {
      rimraf: (paths: string[]) => rms.push(...paths),
    },
  })
  // verify that it works if it's all chunked weird
  const message = Buffer.from('a/b\x00./d\x00')
  for (let i = 0; i < message.length; i += 2) {
    mockStdin.emit('data', message.subarray(i, i + 2))
  }
  mockStdin.emit('end')
  t.strictSame(rms, ['a/b', './d'])
})
