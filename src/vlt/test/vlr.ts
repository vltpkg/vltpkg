import t from 'tap'

import { run } from './fixtures/run.js'

const { er, config, argv } = await run(t, 'vlr.js', ['as', 'df'], {
  '../../src/index.js': {},
})

t.equal(er, undefined)
t.equal(config.command, 'run')
t.strictSame(argv, ['run', 'as', 'df'])
