const t = require('tap')
const isGit = require('../lib/is.js')

t.test('a git index is git', t => t.resolveMatch(isGit({
  cwd: t.testdir({
    '.git': {
      index: 'a file',
    },
  }),
}), true))

t.test('no .git is not git', t => t.resolveMatch(isGit({ cwd: t.testdir({}) }), false))

t.test('.git non-dir might still be git', t => t.resolveMatch(isGit({
  cwd: t.testdir({
    '.git': 'i am a git i swear',
  }),
}), true))

t.test('any .git dir is a git', t => t.resolveMatch(isGit({
  cwd: t.testdir({
    '.git': {},
  }),
}), true))

t.test('default to cwd', t => {
  // this will fail if your tmpdir is in a git repo, I suppose
  const tmp = require('os').tmpdir()
  process.chdir(tmp)
  return t.resolveMatch(isGit(), false)
})
