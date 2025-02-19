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
  graphStep('build')()

  emitter.off('request', reqHandler)
  emitter.off('graphStep', stepHandler)

  logRequest('https://example.com', 'start')
  graphStep('build')()

  t.matchSnapshot(requests, 'requests')
  t.matchSnapshot(steps, 'steps')
})
