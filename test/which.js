const t = require('tap')
const mungePath = process.argv[2] === 'mungePath'

if (mungePath) {
  // munge path so git env is not found
  process.env.PATH = __dirname
}

const er = {
  message: 'No git binary found in $PATH',
  code: 'ENOGIT',
}

const whichGit = require('../lib/which.js')
t.equal(whichGit({ git: 'foo' }), 'foo')
if (mungePath) {
  t.match(whichGit(), er)
} else {
  const which = require('which')
  t.equal(whichGit(), which.sync('git'))
  t.match(whichGit({ git: false }), er)
  t.spawn(process.execPath, [__filename, 'mungePath'])
}
