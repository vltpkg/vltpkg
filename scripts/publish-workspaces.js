import { spawnSync as spawnSync_ } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import * as semver from 'semver'
import assert from 'node:assert'
import { parseArgs } from 'node:util'
import { read } from 'read'

const SRC = 'src'
const DATE_ID = `${Date.now()}`
const ROOT = join(import.meta.dirname, '..')
const TOKEN_NAME = 'SOME_ARBITRARY_TOKEN_NAME'
const OP_TOKEN_KEY = 'global'
const COMMIT_MESSAGE = 'chore: publish all workspaces'
const NPM_USER = 'vltops'

const { forReal: FOR_REAL, filter: FILTER } = parseArgs({
  options: {
    forReal: { type: 'boolean' },
    filter: { type: 'string', default: `./${SRC}/*` },
  },
}).values

const cleanup = (() => {
  let i = 0
  const fns = new Map()
  const onExit = maybeErr => {
    if (maybeErr instanceof Error) {
      console.error(maybeErr)
      process.exitCode = 1
    }
    if (fns.size) {
      console.log(`cleaning up ${fns.size} commands`)
      const tasks = [...fns.values()].reverse()
      tasks.forEach(fn => fn())
      fns.clear()
    }
  }
  process.on('exit', onExit)
  process.on('SIGINT', onExit)
  process.on('uncaughtException', onExit)
  process.on('unhandledRejection', onExit)
  return {
    add: (fn, { keepOnSuccess = false } = {}) =>
      fns.set(`${keepOnSuccess}_${i++}`, fn),
    success: () => {
      if (!FOR_REAL) {
        // If we didn't really publish then everything gets
        // rolled back. Otherwise we remove the tasks that
        // should be kept on success.
        return
      }
      for (const key of fns.keys()) {
        if (key.startsWith('true_')) {
          fns.delete(key)
        }
      }
    },
  }
})()

const spawnSync = (cmd, args, { token, ...opts } = {}) => {
  const res = spawnSync_(cmd, args, {
    ...opts,
    env: {
      ...process.env,
      ...opts.env,
      ...(typeof token === 'string' ? { [TOKEN_NAME]: token } : {}),
    },
    encoding: 'utf8',
    shell: true,
    cwd: ROOT,
  })
  res.stdout = res.stdout.trim()
  return res
}

const git = arg => spawnSync('git', arg).stdout

const gitClean = () => {
  const status = git(['status', '--porcelain=v1', '-u'])
    .split('\n')
    .map(l => l.trim().split(' ').slice(1).join(' '))
    .filter(Boolean)
    // allow changes to scripts/ directory so we can iterate on
    // this script and still use it to publish. Also allow changes
    // to .npmrc because that is how the token is read temporarily
    .filter(l => l.split(sep)[0] !== 'scripts' && l !== '.npmrc')
  assert(
    !status.length,
    new Error(`cannot publish workspaces when git is not clean`, {
      cause: {
        found: status,
      },
    }),
  )
}

const pnpm = (args, { token = '', ...opts } = {}) => {
  const res = spawnSync('pnpm', args, {
    stdio: 'inherit',
    token,
    ...opts,
  })
  assert(
    res.status === 0,
    new Error('pnpm command failed', { cause: { args } }),
  )
  return res
}

const getToken = () => {
  const config = method => [
    'config',
    method,
    '//registry.npmjs.org/:_authToken',
    ...(method === 'set' ? ['"\\${' + TOKEN_NAME + '}"'] : []),
    '--location=project',
  ]
  pnpm(config('set'))
  cleanup.add(() => pnpm(config('delete')))
  const { sections, fields } = JSON.parse(
    spawnSync('op', [
      'item',
      'get',
      '"npm - Ops Account"',
      '--format=json',
      '--account=vltpkg.1password.com',
    ]).stdout,
  )
  const section = sections?.find(s => s.label === 'tokens')?.id
  const token = fields?.find(
    f => f.section?.id === section && f.label === OP_TOKEN_KEY,
  )?.value
  assert(typeof token === 'string', 'token')
  return token
}

const main = async () => {
  gitClean()

  const token = getToken()
  const whoami = spawnSync('npm', ['whoami'], { token }).stdout
  assert(
    whoami === NPM_USER,
    new Error('npm whoami user is invalid', {
      found: whoami,
      wanted: NPM_USER,
    }),
  )

  const changes = pnpm(
    [
      '--shell-mode',
      `--filter="${FILTER}"`,
      'exec',
      'echo',
      '"\\$(pwd)"',
    ],
    { stdio: 'pipe' },
  )
    .stdout.split('\n')
    .map(dir => {
      const path = join(dir, 'package.json')
      const pj = JSON.parse(readFileSync(path, 'utf8'))

      if (pj.private) {
        return
      }

      const current = pj.version
      const version = semver.parse(current)
      version.prerelease = [version.prerelease[0], DATE_ID]
      pj.version = version.format()

      writeFileSync(path, JSON.stringify(pj, null, 2) + '\n')
      cleanup.add(
        () => git(['checkout', `"${relative(ROOT, path)}"`]),
        { keepOnSuccess: true },
      )

      return [pj.name, { current, update: pj.version }]
    })
    .filter(Boolean)

  const amend = git(['log', '-1', '--pretty=%B']) === COMMIT_MESSAGE
  git(['add', `"${SRC}/*/package.json"`])
  git([
    'commit',
    ...(amend ?
      ['--amend', '--no-edit']
    : ['-m', `"${COMMIT_MESSAGE}"`]),
  ])
  cleanup.add(() => git(['reset', 'HEAD~']), { keepOnSuccess: true })

  gitClean()

  console.table(Object.fromEntries(changes))
  console.log(`whoami:${whoami} dry-run:${!FOR_REAL}`)
  assert(
    await read({
      prompt: `Ok to continue?`,
      default: 'y',
    }).then(r => r.trim().toLowerCase() === 'y'),
    new Error('canceled'),
  )

  pnpm(
    [
      `--filter="${FILTER}"`,
      'publish',
      '--access=public',
      '--no-git-checks',
      ...(FOR_REAL ? [] : ['--dry-run']),
    ],
    { token },
  )

  cleanup.success()
}

main()
