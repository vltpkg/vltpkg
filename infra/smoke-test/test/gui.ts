import t from 'tap'
import { runMultiple } from './fixtures/run.ts'

t.test('can run gui', async t => {
  const urlMessage = /Please open http:\/\/localhost:[^\s]+ manually/
  const { status, signal, output } = await runMultiple(t, ['gui'], {
    // Don't check stdout/stderr since different print warnings about sqlite
    match: ['status', 'signal'],
    onOutput: ({ output, kill }) => {
      if (urlMessage.exec(output)) {
        return kill()
      }
    },
  })

  t.equal(status, null)
  t.equal(signal, 'SIGTERM')
  t.match(output, /vlt GUI running at http:\/\/localhost:\d+/)
  t.match(output, urlMessage)
})
