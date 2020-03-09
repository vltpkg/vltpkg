const git = require('../lib/index.js')
const t = require('tap')
t.match(git, {
  clone: Function,
  revs: Function,
  spawn: Function,
  errors: {
    GitConnectionError: /GitConnectionError/,
    GitPathspecError: /GitPathspecError/,
    GitUnknownError: /GitUnknownError/,
  },
})
