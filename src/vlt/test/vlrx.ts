import t from 'tap'

import { run } from './fixtures/run.js'

const { er, config, argv } = await run(t, 'vlrx.js', ['as', 'df'], {
  '../../src/index.js': {},
})

t.equal(er, undefined)
t.equal(config.command, 'run-exec')
t.strictSame(argv, ['run-exec', 'as', 'df'])
