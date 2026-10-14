import * as fsp from 'node:fs/promises'
import { statSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import t from 'tap'
import {
  blockEnd,
  blockStart,
  findBlock,
  planEnvFile,
  planRcFile,
  rcFiles,
  renderBlock,
} from '../../src/shell-setup/posix.ts'

const linux = { home: '/home/me', platform: 'linux' } as const
const block = '# vlt\nline\n# vlt end'

t.test('rcFiles', async t => {
  t.test('zsh', async t => {
    const z = (ZDOTDIR?: string) =>
      rcFiles('zsh', { ...linux, env: { ZDOTDIR } })
    t.strictSame(z('/z'), [resolve('/z', '.zshrc')])
    t.strictSame(
      z('rel'),
      [resolve('/home/me', '.zshrc')],
      'relative',
    )
    t.strictSame(z(), [resolve('/home/me', '.zshrc')])
    t.strictSame(rcFiles('zsh', { env: {} }), [
      resolve(homedir(), '.zshrc'),
    ])
  })

  t.test('fish', async t => {
    const f = (XDG_CONFIG_HOME?: string) =>
      rcFiles('fish', { ...linux, env: { XDG_CONFIG_HOME } })
    t.strictSame(f('/x'), [resolve('/x', 'fish/conf.d/vlt.fish')])
    t.strictSame(f('x'), [
      resolve('/home/me', '.config/fish/conf.d/vlt.fish'),
    ])
    t.strictSame(f(), [
      resolve('/home/me', '.config/fish/conf.d/vlt.fish'),
    ])
  })

  t.test('sh', async t => {
    const s = (ENV?: string) =>
      rcFiles('sh', { ...linux, env: { ENV } })
    t.strictSame(s('/e/.shrc'), [resolve('/e/.shrc')])
    t.strictSame(s('$HOME/.shrc'), [resolve('/home/me', '.profile')])
    t.strictSame(s(), [resolve('/home/me', '.profile')])
  })

  t.test('bash', async t => {
    const b = (
      files: string[],
      platform: NodeJS.Platform = 'linux',
    ): string[] => {
      const home = t.testdir(
        Object.fromEntries(files.map(f => [f, ''])),
      )
      return rcFiles('bash', { home, platform, env: {} }).map(f =>
        f.slice(home.length + 1),
      )
    }
    t.strictSame(b([]), ['.profile'], 'none')
    t.strictSame(b(['.bashrc']), ['.bashrc'])
    t.strictSame(
      b(['.bash_profile', '.bash_login', '.bashrc', '.profile']),
      ['.bash_profile', '.bash_login', '.bashrc'],
    )
    t.strictSame(b(['.profile']), ['.profile'], '.profile only')
    t.strictSame(b([], 'darwin'), ['.profile'], 'darwin none')
    t.strictSame(
      b(['.bashrc'], 'darwin'),
      ['.bashrc', '.profile'],
      'darwin: login bash skips .bashrc',
    )
    t.strictSame(b(['.bash_login', '.bashrc'], 'darwin'), [
      '.bash_login',
      '.bashrc',
    ])
    t.strictSame(b(['.bash_profile'], 'darwin'), ['.bash_profile'])
  })

  t.test('defaults', async t => {
    t.intercept(process, 'env', { value: { ZDOTDIR: '/zd' } })
    t.strictSame(rcFiles('zsh'), [resolve('/zd', '.zshrc')])
  })
})

t.test('renderBlock', async t => {
  t.equal(blockStart, '# vlt')
  t.equal(blockEnd, '# vlt end')
  // env files are resolved: native home and platform
  const o = { home: resolve('/home/me'), platform: process.platform }
  const g = resolve(o.home, '.local/share/vlt/global')
  t.equal(
    renderBlock('zsh', g, o),
    [
      '# vlt',
      'if [ -f "$HOME/.local/share/vlt/global/env" ]; then . "$HOME/.local/share/vlt/global/env"; fi',
      '# vlt end',
    ].join('\n'),
  )
  t.equal(
    renderBlock('fish', resolve(o.home, 'a b'), o),
    [
      '# vlt',
      'test -f "$HOME/a b/env.fish"; and source "$HOME/a b/env.fish"',
      '# vlt end',
    ].join('\n'),
  )
  t.match(renderBlock('sh', '/g'), /^# vlt\nif \[ -f "/)
})

t.test('findBlock', async t => {
  t.equal(findBlock(''), undefined, 'empty')
  t.equal(findBlock('a\nb\n'), undefined, 'none')
  const one = `a\n${block}\nb\n`
  t.strictSame(findBlock(one), {
    start: 2,
    end: 2 + block.length,
    text: block,
  })
  const crlf = 'a\r\n# vlt \r\nline\t\r\n# vlt end  \r\nb\r\n'
  const c = findBlock(crlf)
  t.equal(c?.text, block, 'CRLF and trailing spaces')
  t.equal(
    crlf.slice(c?.start, c?.end),
    '# vlt \r\nline\t\r\n# vlt end',
  )
  const stray = `# vlt\nmine\n${block}\n`
  t.strictSame(
    findBlock(stray),
    { start: 11, end: 11 + block.length, text: block },
    'latest start wins',
  )
  t.equal(findBlock('# vlt end\nx\n'), undefined, 'end without start')
  t.equal(findBlock('# vlt\nx\n'), undefined, 'start without end')
  const two = `${block}\n# vlt\nother\n# vlt end\n# vlt\n`
  t.equal(
    findBlock(two)?.text,
    '# vlt\nother\n# vlt end',
    'last block',
  )
  t.equal(findBlock(`  ${block}`), undefined, 'indented start')
})

t.test('planEnvFile', async t => {
  const dir = t.testdir({ same: 'x', other: 'y', d: {} })
  t.strictSame(await planEnvFile(resolve(dir, 'new'), 'x'), {
    file: resolve(dir, 'new'),
    kind: 'env',
    content: Buffer.from('x'),
    action: 'create',
  })
  t.equal(
    (await planEnvFile(resolve(dir, 'same'), 'x')).action,
    'unchanged',
  )
  t.equal(
    (await planEnvFile(resolve(dir, 'other'), 'x')).action,
    'replace',
  )
  await t.rejects(planEnvFile(resolve(dir, 'd'), 'x'), 'read error')
})

t.test('planRcFile', async t => {
  const dir = t.testdir({
    none: 'x',
    nl: 'x\n',
    empty: '',
    has: `a\n${block}\nb\n`,
    crlf: 'a\r\n# vlt\r\nline\r\n# vlt end\r\nb\r\n',
    diff: 'a\n# vlt\nold\n# vlt end\nb',
    target: 'x\n',
    link: t.fixture('symlink', 'target'),
  })
  const f = (n: string) => resolve(dir, n)
  const text = async (n: string) =>
    String((await planRcFile(f(n), block)).content)

  const dst = statSync(dir)
  t.strictSame(await planRcFile(f('new'), block), {
    file: f('new'),
    kind: 'rc',
    action: 'create',
    content: Buffer.from(block + '\n'),
    owner: { uid: dst.uid, gid: dst.gid },
  })
  t.match(
    await planRcFile(f('a/b/new'), block),
    { owner: { uid: dst.uid, gid: dst.gid } },
    'owner of the nearest existing dir',
  )

  const st = statSync(f('none'))
  t.strictSame(await planRcFile(f('none'), block), {
    file: f('none'),
    kind: 'rc',
    mode: st.mode & 0o7777,
    owner: { uid: st.uid, gid: st.gid },
    action: 'append',
    content: Buffer.from(`x\n\n${block}\n`),
    previous: Buffer.from('x'),
  })
  t.equal(await text('nl'), `x\n\n${block}\n`)
  t.equal(await text('empty'), `${block}\n`)

  for (const n of ['has', 'crlf']) {
    const c = await planRcFile(f(n), block)
    t.equal(c.action, 'unchanged', n)
    t.equal(c.previous, undefined)
  }

  const replaced = await planRcFile(f('diff'), block)
  t.equal(
    replaced.action,
    'replace',
    'a different section is replaced',
  )
  t.equal(String(replaced.content), `a\n${block}\nb`)
  t.equal(String(replaced.previous), 'a\n# vlt\nold\n# vlt end\nb')

  const target = await fsp.realpath(f('target'))
  t.match(
    await planRcFile(f('link'), block),
    { file: target, action: 'append' },
    'a symlink is followed to its target',
  )
  t.equal(await text('link'), `x\n\n${block}\n`)
})

t.test('planRcFile keeps non-UTF-8 bytes', async t => {
  const blk = '# vlt\nb\u00e9\n# vlt end'
  const latin = Buffer.from([0x61, 0xe9, 0x0a]) // 'a\xe9\n'
  const dir = t.testdir({
    a: latin,
    r: Buffer.concat([latin, Buffer.from('# vlt\nold\n# vlt end\n')]),
    u: Buffer.concat([latin, Buffer.from(blk + '\n')]),
  })
  const f = (n: string) => resolve(dir, n)
  const a = await planRcFile(f('a'), blk)
  t.strictSame(a.previous, latin)
  t.strictSame(
    a.content,
    Buffer.concat([latin, Buffer.from(`\n${blk}\n`)]),
  )
  const r = await planRcFile(f('r'), blk)
  t.strictSame(
    r.content,
    Buffer.concat([latin, Buffer.from(blk + '\n')]),
  )
  t.equal((await planRcFile(f('u'), blk)).action, 'unchanged')
})

t.test('planRcFile lstat error', async t => {
  const { planRcFile } = await t.mockImport<
    typeof import('../../src/shell-setup/posix.ts')
  >('../../src/shell-setup/posix.ts', {
    'node:fs/promises': t.createMock(fsp, {
      lstat: async () => {
        throw Object.assign(new Error('nope'), { code: 'EACCES' })
      },
    }),
  })
  await t.rejects(planRcFile('/x', block), {
    code: 'EACCES',
  })
})
