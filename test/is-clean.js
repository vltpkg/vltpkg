const isClean = require('../lib/is-clean.js')
const spawn = require('../lib/spawn.js')
const t = require('tap')

const repo = t.testdir()
const { resolve } = require('path')
const { promisify } = require('util')
const writeFile = promisify(require('fs').writeFile)
const write = (file, data) => writeFile(resolve(repo, file), data)

t.test('create git repo', () =>
  spawn(['init'], { cwd: repo })
    .then(() => spawn(['config', 'user.name', 'pacotedev'], { cwd: repo }))
    .then(() => spawn(['config', 'user.email', 'i+pacotedev@izs.me'], { cwd: repo }))
    .then(() => write('hello', 'world')))

t.test('dir is clean, just one unknown file', t =>
  t.resolveMatch(isClean({ cwd: repo }), true))

t.test('add the file, no longer clean', t =>
  spawn(['add', 'hello'], { cwd: repo })
    .then(() => t.resolveMatch(isClean({ cwd: repo }), false)))

t.test('commit the file, clean again', t =>
  spawn(['commit', '-m', 'x'], { cwd: repo })
    .then(() => t.resolveMatch(isClean({ cwd: repo }), true)))

t.test('edit the file, unclean again', t =>
  write('hello', 'goodbye')
    .then(() => t.resolveMatch(isClean({ cwd: repo }), false)))

t.test('default to repo', t => {
  const cwd = process.cwd()
  t.teardown(() => process.chdir(cwd))
  process.chdir(repo)
  return t.resolveMatch(isClean(), false)
})
