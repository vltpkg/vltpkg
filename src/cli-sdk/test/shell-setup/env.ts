import { spawnSync } from 'node:child_process'
import type { StdioOptions } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import {
  envFile,
  envFishFile,
  renderEnv,
  renderEnvFish,
} from '../../src/shell-setup/env.ts'

const o = { home: '/home/me', platform: 'linux', env: {} } as const
const head =
  '# vlt global bin dir; sourced from the shell rc file. Edit with `vlt setup --path`.'
const fishHead =
  '# vlt global bin dir; sourced from fish config. Edit with `vlt setup --path`.'

t.test('files', async t => {
  t.equal(envFile('/g'), resolve('/g', 'env'))
  t.equal(envFishFile('/g'), resolve('/g', 'env.fish'))
})

t.test('renderEnv', async t => {
  t.equal(
    renderEnv('/home/me/.local/share/vlt/global/bin', o),
    [
      head,
      'case ":$PATH:" in',
      '  *:"$HOME/.local/share/vlt/global/bin":*) ;;',
      '  *) export PATH="$HOME/.local/share/vlt/global/bin:$PATH" ;;',
      'esac',
      '',
    ].join('\n'),
  )
  t.equal(
    renderEnv('/opt/vlt/bin', o).split('\n')[2],
    '  *:"/opt/vlt/bin":*) ;;',
    'outside home',
  )
  t.equal(
    renderEnv('/home/me/Library/Application Support/vlt/global/bin', {
      ...o,
      platform: 'darwin',
    }).split('\n')[3],
    '  *) export PATH="$HOME/Library/Application Support/vlt/global/bin:$PATH" ;;',
    'space',
  )
  t.equal(
    renderEnv('/x/a$b"c`d\\e', o).split('\n')[2],
    '  *:"/x/a\\$b\\"c\\`d\\\\e":*) ;;',
    'escaped',
  )
})

t.test('renderEnvFish', async t => {
  const line = (d: string) =>
    `contains -- ${d} $PATH; or set -gx PATH ${d} $PATH`
  t.equal(
    renderEnvFish('/home/me/.local/share/vlt/global/bin', o),
    `${fishHead}\n${line('"$HOME/.local/share/vlt/global/bin"')}\n`,
  )
  t.equal(
    renderEnvFish('/home/me/Library/Application Support/b', o).split(
      '\n',
    )[1],
    line('"$HOME/Library/Application Support/b"'),
  )
  t.equal(
    renderEnvFish('/x/a$b"c`d\\e', o).split('\n')[1],
    line('"/x/a\\$b\\"c`d\\\\e"'),
    'backtick literal',
  )
})

t.test(
  'adds the dir once in a real shell',
  { skip: process.platform === 'win32' },
  async t => {
    const cwd = t.testdir({})
    // socket stdin makes bash source ~/.bashrc
    const stdio: StdioOptions = ['ignore', 'pipe', 'pipe']
    const dir = resolve(cwd, 'a $b "c" `d`', 'bin')
    writeFileSync(
      resolve(cwd, 'env'),
      renderEnv(dir, { home: '/nowhere', env: {} }),
    )
    for (const sh of ['sh', 'bash']) {
      const res = spawnSync(
        sh,
        ['-c', '. ./env; . ./env; printf %s "$PATH"'],
        {
          cwd,
          env: { PATH: '/usr/bin:/bin' },
          encoding: 'utf8',
          stdio,
        },
      )
      t.equal(res.stdout, `${dir}:/usr/bin:/bin`, sh)
    }
    // late-bound $HOME
    const home = resolve(cwd, 'h')
    writeFileSync(
      resolve(cwd, 'env'),
      renderEnv(resolve(home, 'x y/bin'), { home, env: {} }),
    )
    const res = spawnSync(
      'sh',
      ['-c', '. ./env; . ./env; printf %s "$PATH"'],
      {
        cwd,
        env: { PATH: '/bin', HOME: home },
        encoding: 'utf8',
        stdio,
      },
    )
    t.equal(res.stdout, `${home}/x y/bin:/bin`, '$HOME')
  },
)
