import { XDG } from '@vltpkg/xdg'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import {
  readInstallReceipt,
  receiptName,
  writeInstallReceipt,
} from '../src/install-receipt.ts'

const full = (binDir: string) => ({
  receiptVersion: 1,
  installer: { name: 'install.vlt.sh', version: '2026-10-14' },
  method: 'npm',
  version: '1.2.3',
  channel: 'latest',
  target: 'linux-x64',
  binDir,
  binaries: ['vlt', 'vlx'],
  modifiedPath: [],
  installedAt: '2026-10-14T16:10:00Z',
})

const json = (v: unknown) =>
  typeof v === 'string' ? v : JSON.stringify(v)

type Receipts = {
  config?: unknown
  local?: unknown
  parent?: unknown
}

// <root>/real/bin/vlt, <root>/link -> real, receipts as given
const setup = (t: Test, r: (root: string) => Receipts) => {
  const { config, local, parent } = r(t.testdirName)
  const root = t.testdir({
    real: {
      bin: {
        vlt: '',
        ...(local === undefined ?
          {}
        : { [receiptName]: json(local) }),
      },
      ...(parent === undefined ?
        {}
      : { [receiptName]: json(parent) }),
    },
    link: t.fixture('symlink', 'real'),
    config:
      config === undefined ? {} : { [receiptName]: json(config) },
  })
  return {
    root,
    found: resolve(root, 'real/bin/vlt'),
    configDir: resolve(root, 'config'),
  }
}

t.test('readInstallReceipt', async t => {
  t.test('config dir, binDir via a symlink', async t => {
    const { root, found, configDir } = setup(t, root => ({
      config: full(resolve(root, 'link/bin')),
    }))
    t.strictSame(await readInstallReceipt(found, configDir), {
      file: resolve(configDir, receiptName),
      data: full(resolve(root, 'link/bin')),
    })
  })

  t.test('next to vlt, minimal', async t => {
    const data = {
      receiptVersion: 1,
      method: 'standalone',
      binDir: '',
    }
    const { root, found, configDir } = setup(t, root => ({
      local: { ...data, binDir: resolve(root, 'real/bin') },
    }))
    t.strictSame(await readInstallReceipt(found, configDir), {
      file: resolve(root, 'real/bin', receiptName),
      data: { ...data, binDir: resolve(root, 'real/bin') },
    })
  })

  t.test('dir above vlt', async t => {
    const { root, found, configDir } = setup(t, root => ({
      parent: full(resolve(root, 'real/bin')),
    }))
    t.strictSame(await readInstallReceipt(found, configDir), {
      file: resolve(root, 'real', receiptName),
      data: full(resolve(root, 'real/bin')),
    })
  })

  t.test('config receipt for another vlt', async t => {
    const { root, found, configDir } = setup(t, root => ({
      config: full(resolve(root, 'config')),
      local: full(resolve(root, 'real/bin')),
    }))
    t.equal(
      (await readInstallReceipt(found, configDir))?.file,
      resolve(root, 'real/bin', receiptName),
    )
  })

  t.test('found in a missing dir', async t => {
    const { root, configDir } = setup(t, root => ({
      config: full(resolve(root, 'real/bin')),
    }))
    t.equal(
      await readInstallReceipt(resolve(root, 'gone/vlt'), configDir),
      undefined,
    )
  })

  const bad: [string, (bin: string) => unknown][] = [
    ['missing', () => undefined],
    ['bad json', () => '{'],
    ['array', bin => [full(bin)]],
    [
      'receiptVersion 2',
      bin => ({ ...full(bin), receiptVersion: 2 }),
    ],
    ['no method', bin => ({ ...full(bin), method: undefined })],
    ['empty method', bin => ({ ...full(bin), method: '' })],
    ['relative binDir', () => ({ ...full('x'), binDir: 'real/bin' })],
    ['installer string', bin => ({ ...full(bin), installer: 'x' })],
    [
      'installer.name number',
      bin => ({ ...full(bin), installer: { name: 1 } }),
    ],
    [
      'installer.version number',
      bin => ({ ...full(bin), installer: { version: 1 } }),
    ],
    ['version number', bin => ({ ...full(bin), version: 1 })],
    ['channel number', bin => ({ ...full(bin), channel: 1 })],
    ['target number', bin => ({ ...full(bin), target: 1 })],
    ['binaries string', bin => ({ ...full(bin), binaries: 'vlt' })],
    ['binaries number', bin => ({ ...full(bin), binaries: [1] })],
    [
      'modifiedPath number',
      bin => ({ ...full(bin), modifiedPath: [1] }),
    ],
    ['installedAt number', bin => ({ ...full(bin), installedAt: 1 })],
    ['binDir missing', bin => full(resolve(bin, 'gone'))],
  ]
  for (const [name, r] of bad) {
    t.test(name, async t => {
      const { found, configDir } = setup(t, root => ({
        config: r(resolve(root, 'real/bin')),
      }))
      t.equal(await readInstallReceipt(found, configDir), undefined)
    })
  }

  t.test('default config dir', async t => {
    const { root, found } = setup(t, root => ({
      config: full(resolve(root, 'real/bin')),
    }))
    const { readInstallReceipt } = await t.mockImport<
      typeof import('../src/install-receipt.ts')
    >('../src/install-receipt.ts', {
      '@vltpkg/xdg': {
        XDG: class extends XDG {
          base = {
            config: root,
            cache: root,
            data: root,
            state: root,
            runtime: root,
          }
          name = 'config'
        },
      },
    })
    t.equal(
      (await readInstallReceipt(found))?.file,
      resolve(root, 'config', receiptName),
    )
  })
})

t.test('writeInstallReceipt', async t => {
  const extra = { ...full('/x'), unknown: { a: 1 } }
  const dir = t.testdir({
    [receiptName]: JSON.stringify({
      ...extra,
      binDir: resolve('/x'),
    }),
    bad: JSON.stringify({ ...extra, receiptVersion: 2 }),
    json: '{',
  })
  const file = resolve(dir, receiptName)
  const read = () => JSON.parse(readFileSync(file, 'utf8')) as unknown

  await writeInstallReceipt(file, {
    version: '2.0.0',
    installedAt: '2026-10-15T00:00:00Z',
  })
  t.strictSame(read(), {
    ...extra,
    binDir: resolve('/x'),
    version: '2.0.0',
    installedAt: '2026-10-15T00:00:00Z',
  })
  t.strictSame(
    Object.keys(read() as object),
    Object.keys(extra),
    'key order kept',
  )

  await writeInstallReceipt(file, { version: '2.0.1' })
  const { version, installedAt } = read() as Record<string, string>
  t.equal(version, '2.0.1')
  t.match(installedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
  t.strictSame(
    readdirSync(dir).sort(),
    ['bad', receiptName, 'json'].sort(),
  )

  await t.rejects(
    writeInstallReceipt(resolve(dir, 'bad'), { version: '1' }),
    { message: 'Invalid install receipt' },
  )
  await t.rejects(
    writeInstallReceipt(resolve(dir, 'json'), { version: '1' }),
    { message: 'Invalid install receipt' },
  )
  await t.rejects(
    writeInstallReceipt(resolve(dir, 'missing'), { version: '1' }),
    { message: 'Invalid install receipt' },
  )
})
