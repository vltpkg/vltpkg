import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from 'node:fs'
import { join } from 'node:path'

const args = ['setup', '--path', '--yes', '--view=json']
const status = (stdout: string): unknown =>
  (JSON.parse(stdout) as { path: { status: string } }).path.status

t.test(
  'setup --path',
  { skip: process.platform === 'win32' },
  async t => {
    const res = await runMultiple(t, args, {
      match: ['status'],
      env: { SHELL: '/bin/bash' },
      root: { '.bashrc': '# mine\n' },
      test: async ({ t, dirs, run, raw }) => {
        t.equal(status(raw.stdout), 'added')
        const g = join(dirs.data, 'vlt', 'global')
        t.match(
          readFileSync(join(dirs.root, '.bashrc'), 'utf8'),
          /^# mine\n\n# vlt\nif \[ -f ".+" \]; then \. ".+"; fi\n# vlt end\n$/,
        )
        if (process.platform === 'darwin') {
          t.match(
            readFileSync(join(dirs.root, '.profile'), 'utf8'),
            /^# vlt\n/,
            'login bash reads .profile',
          )
        }
        t.ok(existsSync(join(g, 'env')), 'env written')
        const backups = readdirSync(join(g, 'backups'))
        t.match(backups, [/^bashrc\..+\.bak$/])
        t.equal(
          readFileSync(
            join(g, 'backups', String(backups[0])),
            'utf8',
          ),
          '# mine\n',
        )

        // a new shell has the bin dir in its PATH
        const PATH = execFileSync(
          'bash',
          ['-c', '. "$HOME/.bashrc"; printf %s "$PATH"'],
          {
            env: { HOME: dirs.root, PATH: '/usr/bin:/bin' },
            encoding: 'utf8',
          },
        )
        const bin = realpathSync(join(g, 'bin'))
        t.ok(
          PATH.split(':').some(
            p => existsSync(p) && realpathSync(p) === bin,
          ),
          'bin dir in PATH',
        )

        const again = await run(args, { env: { SHELL: '/bin/bash' } })
        t.equal(again.status, 0)
        t.equal(status(again.stdout), 'unchanged')

        const off = await run(args, {
          env: { SHELL: '/bin/bash', VLT_NO_MODIFY_PATH: 'true' },
        })
        t.equal(off.status, 0)
        t.equal(status(off.stdout), 'disabled')

        const nu = await run(args, { env: { SHELL: '/usr/bin/nu' } })
        t.equal(nu.status, 1)
        t.match(nu.output, "doesn't support nu")
      },
    })
    t.equal(res.status, 0)
  },
)
