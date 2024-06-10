import t from 'tap'

import { run } from './fixtures/run.js'

const { er, config, argv } = await run(t, 'vlix.js', ['as', 'df'], {
  '../../src/index.js': {},
})

t.equal(er, undefined)
t.equal(config.command, 'install-exec')
t.strictSame(argv, ['install-exec', 'as', 'df'])
