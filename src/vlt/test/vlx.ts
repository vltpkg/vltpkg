import t from 'tap'

import { run } from './fixtures/run.js'

const { er, config, argv } = await run(t, 'vlx.js', ['as', 'df'], {
  '../../src/index.js': {},
})

t.equal(er, undefined)
t.equal(config.command, 'exec')
t.strictSame(argv, ['exec', 'as', 'df'])
