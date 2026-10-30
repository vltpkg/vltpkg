import { emitter, logRequest, graphStep } from '../src/index.ts'
import type { Events } from '../src/index.ts'

import t from 'tap'

t.test('output', async t => {
  const requests: Events['request'][] = []
  const steps: Events['graphStep'][] = []

  const reqHandler = (req: Events['request']) => requests.push(req)
  const stepHandler = (step: Events['graphStep']) => steps.push(step)

  emitter.on('request', reqHandler)
  emitter.on('graphStep', stepHandler)

  logRequest('https://example.com', 'start')
  logRequest('https://example.com', 'cache', { method: 'GET' })
  logRequest('https://example.com', 'store')
  logRequest('https://example.com', 'complete', {
    method: 'GET',
    statusCode: 200,
    durationMs: 12,
  })
  graphStep('build')()

  emitter.off('request', reqHandler)
  emitter.off('graphStep', stepHandler)

  logRequest('https://example.com', 'start')
  graphStep('build')()

  t.matchSnapshot(requests, 'requests')
  t.matchSnapshot(steps, 'steps')
})

t.test('logRequest and graphStep feed the tracer', async t => {
  const events: { ev: string; fields?: Record<string, unknown> }[] =
    []
  const marks: string[] = []
  const { logRequest, graphStep } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    '../src/trace.ts': {
      tracer: {
        file: 'x',
        trace: (ev: string, fields?: Record<string, unknown>) =>
          events.push({ ev, fields }),
        mark: (name: string) => marks.push(name),
      },
    },
  })
  logRequest(new URL('https://example.com/a'), 'complete', {
    statusCode: 200,
    durationMs: 3,
  })
  graphStep('reify')()
  t.strictSame(events, [
    {
      ev: 'request',
      fields: {
        statusCode: 200,
        durationMs: 3,
        url: 'https://example.com/a',
        state: 'complete',
      },
    },
  ])
  t.strictSame(marks, ['reify', 'reify:done'])
})
