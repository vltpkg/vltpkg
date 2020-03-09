const t = require('tap')
const gitOpts = require('../lib/opts.js')

t.test('defaults', t => {
  const { GIT_ASKPASS, GIT_SSH_COMMAND } = process.env
  t.teardown(() => {
    process.env.GIT_ASKPASS = GIT_ASKPASS
    process.env.GIT_SSH_COMMAND = GIT_SSH_COMMAND
  })
  delete process.env.GIT_ASKPASS
  delete process.env.GIT_SSH_COMMAND
  t.match(gitOpts().env, {
    GIT_ASKPASS: 'echo',
    GIT_SSH_COMMAND: 'ssh -oStrictHostKeyChecking=accept-new',
  }, 'got the git defaults we want')
  t.equal(gitOpts().shell, false, 'shell defaults to false')
  t.equal(gitOpts({ shell: '/bin/bash' }).shell, false, 'shell cannot be overridden')
  t.end()
})

t.test('does not override', t => {
  const { GIT_ASKPASS, GIT_SSH_COMMAND } = process.env
  t.teardown(() => {
    process.env.GIT_ASKPASS = GIT_ASKPASS
    process.env.GIT_SSH_COMMAND = GIT_SSH_COMMAND
  })
  process.env.GIT_ASKPASS = 'test_askpass'
  process.env.GIT_SSH_COMMAND = 'test_ssh_command'
  t.match(gitOpts().env, {
    GIT_ASKPASS: 'test_askpass',
    GIT_SSH_COMMAND: 'test_ssh_command',
  }, 'values already in process.env remain')
  t.end()
})

t.test('as non-root', t => {
  process.getuid = () => 999
  t.match(gitOpts({
    foo: 'bar',
    env: { override: 'for some reason' },
  }, {
    uid: 420,
    gid: 69,
    abc: 'def',
  }), {
    foo: 'bar',
    env: { override: 'for some reason' },
    uid: undefined,
    gid: undefined,
    abc: undefined,
  }, 'do not set uid/gid as non-root')
  t.end()
})
