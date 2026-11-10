import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import type { MultipleCommandOptions } from './fixtures/run.ts'
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

t.test(
  'setup --path, Windows user Path',
  // edits the runner's real user Path
  { skip: process.platform !== 'win32' || !process.env.CI },
  async t => {
    const reg = (a: string[]) =>
      execFileSync('reg', a, { encoding: 'utf8' })
    const read = () =>
      /^ {4}Path {4}(REG_\w+)(?: {4}(.*?))?\r?$/im.exec(
        reg(['query', 'HKCU\\Environment']),
      )
    const prev = read()
    t.teardown(() => {
      try {
        execFileSync(
          'reg',
          [
            'delete',
            'HKCU\\Environment',
            '/v',
            'VLT_PATH_REFRESH',
            '/f',
          ],
          { stdio: 'ignore' },
        )
      } catch {}
      if (prev) {
        reg([
          'add',
          'HKCU\\Environment',
          '/v',
          'Path',
          '/t',
          String(prev[1]),
          '/d',
          prev[2] ?? '',
          '/f',
        ])
      } else {
        reg(['delete', 'HKCU\\Environment', '/v', 'Path', '/f'])
      }
    })
    const env = {
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
    }
    const res = await runMultiple(t, args, {
      variants: ['Bundle'],
      match: ['status'],
      env,
      test: async ({ t, dirs, run, raw }) => {
        t.equal(status(raw.stdout), 'added')
        const { path } = JSON.parse(raw.stdout) as {
          path: { dir: string; files: unknown[] }
        }
        t.match(path.files, [
          {
            file: 'HKCU\\Environment',
            kind: 'registry',
            action: /^(prepend|create)$/,
          },
        ])
        t.equal(path.files.length, 1)
        const [first, ...rest] = (read()?.[2] ?? '').split(';')
        t.equal(first, path.dir, 'dir first')
        t.equal(rest.join(';'), prev?.[2] ?? '', 'rest kept')
        t.notMatch(
          reg(['query', 'HKCU\\Environment']),
          /^ {4}VLT_PATH_REFRESH /im,
          'broadcast var removed',
        )
        const backups = join(dirs.data, 'vlt', 'global', 'backups')
        if (prev) {
          const [b = ''] = readdirSync(backups)
          t.match(readdirSync(backups), [/^Path\..+\.bak$/])
          t.equal(
            readFileSync(join(backups, b), 'utf8'),
            prev[2] ?? '',
            'old Path backed up',
          )
        } else {
          t.notOk(existsSync(backups), 'nothing to back up')
        }

        const again = await run(args, { env })
        t.equal(again.status, 0)
        t.equal(status(again.stdout), 'unchanged')
      },
    })
    t.equal(res.status, 0)
  },
)

// no registry yet
const fresh = { VLT_REGISTRY: '', VLT_REGISTRIES: '' }

// answers each wizard prompt once, as it appears
const answer = (path: string): MultipleCommandOptions['onOutput'] => {
  // variants run in parallel
  const seen = new WeakMap<(d: string) => void, Set<string>>()
  return ({ output, write }) => {
    const done = seen.get(write) ?? new Set<string>()
    seen.set(write, done)
    for (const [q, a] of [
      ['Authenticate with your vlt.io account now?', 'n\r'],
      ['Add another registry alias?', '\r'],
      ['Setup PATH for global installs?', path],
    ] as const) {
      if (!done.has(q) && output.includes(q)) {
        done.add(q)
        write(a)
      }
    }
  }
}

t.test(
  'setup offers PATH setup',
  { skip: process.platform === 'win32' },
  async t => {
    const res = await runMultiple(t, ['setup', 'acme'], {
      tty: true,
      match: ['status'],
      env: { SHELL: '/bin/bash', ...fresh },
      onOutput: answer('\r'),
      test: async ({ t, dirs }) => {
        t.match(
          readFileSync(join(dirs.root, '.profile'), 'utf8'),
          '# vlt\n',
        )
        t.ok(existsSync(join(dirs.data, 'vlt', 'global', 'env')))
        t.match(
          readFileSync(join(dirs.config, 'vlt', 'vlt.json'), 'utf8'),
          /registry\.vlt\.io\/acme\/npm\/[\s\S]*registry\.vlt\.io\/acme\/main\//,
        )
      },
    })
    t.match(res.output, 'Setup PATH for global installs? (Y/n)')
    t.match(res.output, 'Added')
    t.equal(res.status, 0)
  },
)

t.test(
  'setup, PATH declined',
  { skip: process.platform === 'win32' },
  async t => {
    const res = await runMultiple(t, ['setup', 'acme'], {
      tty: true,
      match: ['status'],
      env: { SHELL: '/bin/bash', ...fresh },
      onOutput: answer('n\r'),
      test: async ({ t, dirs }) => {
        t.notOk(existsSync(join(dirs.root, '.profile')))
        t.notOk(existsSync(join(dirs.data, 'vlt', 'global', 'env')))
      },
    })
    t.match(res.output, 'Run `vlt setup --path` later')
    t.equal(res.status, 0)
  },
)

t.test('setup --yes never asks', async t => {
  const res = await runMultiple(
    t,
    ['setup', 'acme', '--yes', '--view=json'],
    {
      match: ['status'],
      env: fresh,
      test: async ({ t, dirs, raw }) => {
        t.match(raw.stdout, '"account": "acme"')
        t.notMatch(raw.stdout, '"path"')
        t.notOk(existsSync(join(dirs.root, '.profile')))
        t.notOk(existsSync(join(dirs.data, 'vlt', 'global', 'env')))
      },
    },
  )
  t.equal(res.status, 0)
})
