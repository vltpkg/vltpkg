import { Spec } from '@vltpkg/spec'
import { Readable } from 'node:stream'
import { setTimeout as sleep } from 'node:timers/promises'
import t from 'tap'
import type { Test } from 'tap'
import type { Asker } from '../src/git-host.ts'

const hosted = Spec.parse('x', 'github:o/r#main')
const cloned = Spec.parse('x', 'git+https://example.com/o/r.git#main')

const load = async (
  t: Test,
  revs: (repo: string, opts: object) => Promise<unknown>,
) =>
  t.mockImport<typeof import('../src/git-host.ts')>(
    '../src/git-host.ts',
    { '@vltpkg/git': { ...(await import('@vltpkg/git')), revs } },
  )

t.test('gitHost', async t => {
  const { gitHost } = await import('../src/git-host.ts')
  t.equal(gitHost(hosted), 'https://codeload.github.com')
  t.equal(gitHost(cloned), 'git+https://example.com/o/r.git')
  t.equal(
    gitHost(Spec.parse('x', 'github:o/r#main::path:p')),
    'https://codeload.github.com',
    '::path: from the archive too',
  )
  t.equal(
    gitHost(Spec.parse('x', 'github:o/r#semver:^1')),
    'git+ssh://git@github.com:o/r.git',
    '#semver: tags from the remote',
  )
})

t.test(
  'an archive host: any answer to a HEAD of its root',
  async t => {
    const { gitHostAnswers } = await load(t, async () => {
      throw new Error('no git for an archive')
    })
    const asked: [string, object][] = []
    const rc: Asker = {
      requestStream: async (url, opts) => {
        asked.push([String(url), opts ?? {}])
        // an empty gzip body errors: dropped
        const body = new Readable({ read() {} })
        setImmediate(() => body.destroy(new Error('empty gzip')))
        return { statusCode: 404, body }
      },
    }
    await gitHostAnswers(hosted, 2000, async () => rc)
    t.strictSame(asked, [
      [
        'https://codeload.github.com/',
        {
          method: 'HEAD',
          connectTimeout: 2000,
          headersTimeout: 2000,
        },
      ],
    ])
    // let the body error land on its handler
    await sleep(10)
  },
)

t.test('a remote: its refs, given the time', async t => {
  const asked: [string, object][] = []
  const { gitHostAnswers } = await load(t, async (repo, opts) => {
    asked.push([repo, opts])
    return { refs: {}, shas: {} }
  })
  await gitHostAnswers(cloned, 2000, async () => {
    throw new Error('no registry client for a clone')
  })
  t.strictSame(asked, [
    [
      'git+https://example.com/o/r.git',
      { timeout: 2000, noGitRevCache: true },
    ],
  ])
})

t.test('one that fails in time: left to the fetch', async t => {
  const { gitHostAnswers } = await load(t, async () => {
    throw new Error('An unknown git error occurred')
  })
  await gitHostAnswers(hosted, 2000, async () => ({
    requestStream: async () => {
      throw Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      })
    },
  }))
  await gitHostAnswers(cloned, 2000, async () => {
    throw new Error('unused')
  })
  t.pass('not thrown')
})

t.test('one that does not answer in time', async t => {
  const late = async () => {
    await sleep(40)
    throw new Error('timed out')
  }
  const { gitHostAnswers } = await load(t, late)
  await t.rejects(
    gitHostAnswers(hosted, 20, async () => ({ requestStream: late })),
    {
      message:
        'https://codeload.github.com did not answer within 0.02s',
      cause: { cause: { message: 'timed out' } },
    },
  )
  await t.rejects(
    gitHostAnswers(cloned, 20, async () => {
      throw new Error('unused')
    }),
    {
      message:
        'git+https://example.com/o/r.git did not answer within 0.02s',
    },
  )
})

t.test('no host to ask', async t => {
  const { gitHostAnswers } = await load(t, async () => {
    throw new Error('unused')
  })
  await gitHostAnswers({ final: {} } as Spec, 20, async () => {
    throw new Error('unused')
  })
  t.pass('nothing asked')
})

t.test('a local remote, for real: its refs cached', async t => {
  const { gitHostAnswers } = await import('../src/git-host.ts')
  const { revs, spawn } = await import('@vltpkg/git')
  const { rmSync } = await import('node:fs')
  const { pathToFileURL } = await import('node:url')
  const repo = t.testdir({
    'package.json': '{"name":"x","version":"1.0.0"}',
  })
  for (const cmd of [
    ['init', '-b', 'main'],
    ['config', 'user.name', 'vltdev'],
    ['config', 'user.email', 'vltdev@vlt.sh'],
    ['config', 'commit.gpgSign', 'false'],
    ['add', '.'],
    ['commit', '-m', 'x'],
  ]) {
    await spawn(cmd, { cwd: repo })
  }
  const remote = `git+${pathToFileURL(repo)}`
  await gitHostAnswers(
    Spec.parse('x', `${remote}#main`),
    10_000,
    () => {
      throw new Error('no registry client for a clone')
    },
  )
  rmSync(repo, { recursive: true, force: true })
  t.ok(
    (await revs(remote))?.refs.main,
    'the clone after it reads them back',
  )
})
