import { promiseSpawn } from '@vltpkg/promise-spawn'
import type { Manifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import t from 'tap'
import { exec, isRunResult, run } from '../src/index.ts'

const fixture = resolve(import.meta.dirname, 'fixtures/script.ts')

const NODE_OPTIONS = '--no-warnings --experimental-strip-types'

const node =
  process.execPath.includes(' ') ?
    '"' + process.execPath + '"'
  : process.execPath

t.test('run', async t => {
  const projectRoot = t.testdirName
  const cwd = resolve(projectRoot, 'src/abc')
  const fail =
    node +
    ' -e "' +
    'process.exitCode=1;' +
    'console.log(JSON.stringify(process.env.npm_lifecycle_event))' +
    '"'
  t.testdir({
    node_modules: { '.bin': {} },
    src: {
      abc: {
        node_modules: { '.bin': {} },
        'package.json': JSON.stringify({
          scripts: {
            bg:
              `${node} "${fixture}" child run ` +
              `${cwd} ${projectRoot} bg`,
            fg:
              `${node} "${fixture}" child runFG ` +
              `${cwd} ${projectRoot} fg`,
            fail,

            prefailpre: fail,
            failpre: 'echo {}',

            prepassprefailmain: 'echo {}',
            passprefailmain: fail,

            failpost: 'echo {}',
            postfailpost: fail,

            passprepost:
              `${node} "${fixture}" child run ` +
              `${cwd} ${projectRoot} passprepost`,

            prepassprepost: 'echo {}',
            postpassprepost: 'echo {}',
          },
        }),
      },
    },
  })

  t.test('bg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'run', cwd, projectRoot, 'bg'],
      { env: { NODE_OPTIONS } },
    )
    const command =
      `${node} "${fixture}" child run ` + `${cwd} ${projectRoot} bg`

    t.strictSame(JSON.parse(result.stdout), {
      command,
      args: [],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'run',
        args: [cwd, projectRoot, 'bg'],
        cwd,
        projectRoot,
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'bg',
          npm_lifecycle_script: command,
        },
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
    })
  })

  t.test('fg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'runFG', cwd, projectRoot, 'fg'],
      { env: { NODE_OPTIONS } },
    )
    const command =
      `${node} "${fixture}" child runFG ` + `${cwd} ${projectRoot} fg`

    t.strictSame(JSON.parse(result.stdout), [
      {
        fn: 'runFG',
        args: [cwd, projectRoot, 'fg'],
        cwd,
        projectRoot,
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'fg',
          npm_lifecycle_script: command,
        },
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      {
        command,
        args: [],
        cwd,
        stdout: null,
        stderr: null,
        status: 0,
        signal: null,
      },
    ])
  })

  t.test('fail pre', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'run', cwd, projectRoot, 'failpre'],
      { acceptFail: true, env: { NODE_OPTIONS } },
    )
    t.strictSame(JSON.parse(result.stdout), {
      command: fail,
      args: [],
      cwd,
      status: 1,
      signal: null,
      stdout: 'prefailpre',
      stderr: '',
    })
  })

  t.test('fail post', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'run', cwd, projectRoot, 'failpost'],
      { acceptFail: true, env: { NODE_OPTIONS } },
    )
    t.strictSame(JSON.parse(result.stdout), {
      command: 'echo {}',
      args: [],
      cwd,
      status: 1,
      signal: null,
      stdout: {},
      stderr: '',
      post: {
        command: fail,
        args: [],
        cwd,
        status: 1,
        signal: null,
        stdout: '"postfailpost"',
        stderr: '',
      },
    })
  })

  t.test('pass pre, fail main', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'run', cwd, projectRoot, 'passprefailmain'],
      { acceptFail: true, env: { NODE_OPTIONS } },
    )
    const command =
      node +
      ' -e "process.exitCode=1;console.log(JSON.stringify(process.env.npm_lifecycle_event))"'
    t.strictSame(JSON.parse(result.stdout), {
      command,
      args: [],
      cwd,
      status: 1,
      signal: null,
      stdout: 'passprefailmain',
      stderr: '',
      pre: {
        command: 'echo {}',
        args: [],
        cwd,
        status: 0,
        signal: null,
        stdout: '{}',
        stderr: '',
      },
    })
  })

  t.test('ignore missing', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'run', cwd, projectRoot, 'ignoremissing'],
      { acceptFail: true, env: { NODE_OPTIONS } },
    )
    const command = ''
    t.strictSame(JSON.parse(result.stdout), {
      command,
      args: [],
      cwd,
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
    })
  })

  t.test('ignore missing fg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'runFG', cwd, projectRoot, 'ignoremissing'],
      { acceptFail: true, env: { NODE_OPTIONS } },
    )
    const command = ''
    t.strictSame(JSON.parse(result.stdout), [
      {},
      {
        command,
        args: [],
        cwd,
        status: 0,
        signal: null,
        stdout: null,
        stderr: null,
      },
    ])
  })

  t.test('do not ignore missing', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'run', cwd, projectRoot, 'missing'],
      { acceptFail: true, env: { NODE_OPTIONS } },
    )
    t.match(result, {
      status: 1,
      signal: null,
      stderr: 'Script not defined in package.json',
    })
  })

  t.test('pass pre and post', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'run', cwd, projectRoot, 'passprepost'],
      { acceptFail: true, env: { NODE_OPTIONS } },
    )

    const command =
      `${node} "${fixture}" child run ` +
      `${cwd} ${projectRoot} passprepost`

    t.strictSame(JSON.parse(result.stdout), {
      command,
      args: [],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'run',
        args: [cwd, projectRoot, 'passprepost'],
        cwd,
        projectRoot,
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'passprepost',
          npm_lifecycle_script: command,
        },
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
      pre: {
        command: 'echo {}',
        args: [],
        cwd,
        status: 0,
        signal: null,
        stdout: '{}',
        stderr: '',
      },
      post: {
        command: 'echo {}',
        args: [],
        cwd,
        status: 0,
        signal: null,
        stdout: '{}',
        stderr: '',
      },
    })
  })
})

t.test('exec', async t => {
  const projectRoot = t.testdir({
    node_modules: { '.bin': {} },
    src: {
      abc: {
        node_modules: { '.bin': {} },
      },
    },
  })
  const cwd = resolve(projectRoot, 'src/abc')

  t.test('bg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'exec', cwd, projectRoot],
      { env: { NODE_OPTIONS } },
    )
    t.hasStrict(result, { status: 0, signal: null })
    t.strictSame(JSON.parse(result.stdout), {
      command: node,
      args: [fixture, 'child', 'exec', cwd, projectRoot],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'exec',
        args: [cwd, projectRoot],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
    })
  })

  t.test('bg with args', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'exec', cwd, projectRoot, 'a', 'b', 'c'],
      { env: { NODE_OPTIONS } },
    )
    t.hasStrict(result, { status: 0, signal: null })
    t.strictSame(JSON.parse(result.stdout), {
      command: node,
      args: [
        fixture,
        'child',
        'exec',
        cwd,
        projectRoot,
        'a',
        'b',
        'c',
      ],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'exec',
        args: [cwd, projectRoot, 'a', 'b', 'c'],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
    })
  })

  t.test('fg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'execFG', cwd, projectRoot],
      { env: { NODE_OPTIONS } },
    )
    t.strictSame(JSON.parse(result.stdout), [
      {
        fn: 'execFG',
        args: [cwd, projectRoot],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      {
        command: node,
        args: [fixture, 'child', 'execFG', cwd, projectRoot],
        cwd,
        stdout: null,
        stderr: null,
        status: 0,
        signal: null,
      },
    ])
  })

  t.test('fg with args', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'execFG', cwd, projectRoot, 'a', 'b', 'c'],
      { env: { NODE_OPTIONS } },
    )
    t.strictSame(JSON.parse(result.stdout), [
      {
        fn: 'execFG',
        args: [cwd, projectRoot, 'a', 'b', 'c'],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      {
        command: node,
        args: [
          fixture,
          'child',
          'execFG',
          cwd,
          projectRoot,
          'a',
          'b',
          'c',
        ],
        cwd,
        stdout: null,
        stderr: null,
        status: 0,
        signal: null,
      },
    ])
  })
})

t.test('runExec (exec)', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'root',
    }),
    node_modules: { '.bin': {} },
    src: {
      abc: {
        'package.json': JSON.stringify({
          name: 'abc',
        }),
        node_modules: { '.bin': {} },
      },
    },
  })
  const cwd = resolve(projectRoot, 'src/abc')

  t.test('bg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'runExec', cwd, projectRoot],
      { env: { NODE_OPTIONS } },
    )
    t.hasStrict(result, { status: 0, signal: null })
    t.strictSame(JSON.parse(result.stdout), {
      command: node,
      args: [fixture, 'child', 'runExec', cwd, projectRoot],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'runExec',
        args: [cwd, projectRoot],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
    })
  })

  t.test('bg with args', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [
        fixture,
        'parent',
        'runExec',
        cwd,
        projectRoot,
        node,
        'a',
        'b',
        'c',
      ],
      { env: { NODE_OPTIONS } },
    )
    t.hasStrict(result, { status: 0, signal: null })
    t.strictSame(JSON.parse(result.stdout), {
      command: node,
      args: [
        fixture,
        'child',
        'runExec',
        cwd,
        projectRoot,
        'a',
        'b',
        'c',
      ],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'runExec',
        args: [cwd, projectRoot, 'a', 'b', 'c'],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
    })
  })

  t.test('fg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [fixture, 'parent', 'runExecFG', cwd, projectRoot],
      { env: { NODE_OPTIONS } },
    )
    t.strictSame(JSON.parse(result.stdout), [
      {
        fn: 'runExecFG',
        args: [cwd, projectRoot],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      {
        command: node,
        args: [fixture, 'child', 'runExecFG', cwd, projectRoot],
        cwd,
        stdout: null,
        stderr: null,
        status: 0,
        signal: null,
      },
    ])
  })

  t.test('fg with args', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [
        fixture,
        'parent',
        'runExecFG',
        cwd,
        projectRoot,
        node,
        'a',
        'b',
        'c',
      ],
      { env: { NODE_OPTIONS } },
    )
    t.strictSame(JSON.parse(result.stdout), [
      {
        fn: 'runExecFG',
        args: [cwd, projectRoot, 'a', 'b', 'c'],
        cwd,
        projectRoot,
        env: {},
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      {
        command: node,
        args: [
          fixture,
          'child',
          'runExecFG',
          cwd,
          projectRoot,
          'a',
          'b',
          'c',
        ],
        cwd,
        stdout: null,
        stderr: null,
        status: 0,
        signal: null,
      },
    ])
  })
})

t.test('runExec (run)', async t => {
  const projectRoot = t.testdir({
    node_modules: { '.bin': {} },
    src: {
      abc: {
        'package.json': JSON.stringify({
          name: 'abc',
          scripts: { 'node-package-json-script': node },
        }),
        node_modules: { '.bin': {} },
      },
    },
  })
  const cwd = resolve(projectRoot, 'src/abc')

  t.test('bg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [
        fixture,
        'parent',
        'runExec',
        cwd,
        projectRoot,
        'node-package-json-script',
      ],
      {
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'node-package-json-script',
          npm_lifecycle_script: node,
          NODE_OPTIONS,
        },
      },
    )
    t.hasStrict(result, { status: 0, signal: null })
    t.strictSame(JSON.parse(result.stdout), {
      command: node,
      args: [fixture, 'child', 'runExec', cwd, projectRoot],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'runExec',
        args: [cwd, projectRoot],
        cwd,
        projectRoot,
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'node-package-json-script',
          npm_lifecycle_script: node,
        },
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
    })
  })

  t.test('bg with args', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [
        fixture,
        'parent',
        'runExec',
        cwd,
        projectRoot,
        'node-package-json-script',
        'a',
        'b',
        'c',
      ],
      { env: { NODE_OPTIONS } },
    )
    t.hasStrict(result, { status: 0, signal: null })
    t.strictSame(JSON.parse(result.stdout), {
      command: node,
      args: [
        fixture,
        'child',
        'runExec',
        cwd,
        projectRoot,
        'a',
        'b',
        'c',
      ],
      cwd,
      status: 0,
      signal: null,
      stdout: {
        fn: 'runExec',
        args: [cwd, projectRoot, 'a', 'b', 'c'],
        cwd,
        projectRoot,
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'node-package-json-script',
          npm_lifecycle_script: node,
        },
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      stderr: '',
    })
  })

  t.test('fg', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [
        fixture,
        'parent',
        'runExecFG',
        cwd,
        projectRoot,
        'node-package-json-script',
      ],
      { env: { NODE_OPTIONS } },
    )
    t.strictSame(JSON.parse(result.stdout), [
      {
        fn: 'runExecFG',
        args: [cwd, projectRoot],
        cwd,
        projectRoot,
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'node-package-json-script',
          npm_lifecycle_script: node,
        },
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      {
        command: node,
        args: [fixture, 'child', 'runExecFG', cwd, projectRoot],
        cwd,
        stdout: null,
        stderr: null,
        status: 0,
        signal: null,
      },
    ])
  })

  t.test('fg with args', async t => {
    const result = await promiseSpawn(
      process.execPath,
      [
        fixture,
        'parent',
        'runExecFG',
        cwd,
        projectRoot,
        'node-package-json-script',
        'a',
        'b',
        'c',
      ],
      {
        env: {
          npm_package_json: resolve(cwd, 'package.json'),
          npm_lifecycle_event: 'node-package-json-script',
          npm_lifecycle_script: node,
          NODE_OPTIONS,
        },
      },
    )
    t.strictSame(JSON.parse(result.stdout), [
      {
        fn: 'runExecFG',
        args: [cwd, projectRoot, 'a', 'b', 'c'],
        cwd,
        projectRoot,
        env: {
          npm_package_json: resolve(cwd, 'package.json'),

          npm_lifecycle_event: 'node-package-json-script',

          npm_lifecycle_script: node,
        },
        path: ['src/abc/node_modules/.bin', 'node_modules/.bin'],
      },
      {
        command: node,
        args: [
          fixture,
          'child',
          'runExecFG',
          cwd,
          projectRoot,
          'a',
          'b',
          'c',
        ],
        cwd,
        stdout: null,
        stderr: null,
        status: 0,
        signal: null,
      },
    ])
  })
})

t.test('is run reseult', async t => {
  t.equal(isRunResult({}), false)
  t.equal(isRunResult(null), false)
  t.equal(isRunResult([]), false)
  t.equal(
    isRunResult({
      stdout: null,
      stderr: null,
      signal: null,
      status: null,
    }),
    true,
  )
})

t.test('do not trust manifests npm mucks with', async t => {
  const cwd = t.testdir({
    'package.json': JSON.stringify({
      name: 'x',
      version: '1.2.3',
      scripts: { install: 'echo ok' },
    }),
  })
  // this one is a lie! read the actual package.json file
  const manifest: Manifest = {
    name: 'x',
    version: '1.2.3',
    gypfile: true,
    scripts: { install: 'node-gyp rebuild' },
  }
  const res = await run({
    cwd,
    manifest,
    arg0: 'install',
    projectRoot: cwd,
    color: true,
  })
  t.match(res, {
    command: 'echo ok',
    args: [],
    status: 0,
    signal: null,
    stdout: 'ok',
    stderr: '',
    pre: undefined,
  })
})

t.test('quote things properly only as needed', async t => {
  const manifest: Manifest = {
    name: 'x',
    version: '1.2.3',
    scripts: {
      // designed to upset shells if not quoted properly
      n: `${node} -p "'!(ok)' + process.argv.slice(1)"`,
    },
  }
  const cwd = t.testdir({
    'package.json': JSON.stringify(manifest),
  })

  const [runRes, execRes] = await Promise.all([
    run({
      cwd,
      manifest,
      arg0: 'n',
      args: ['yes', 'ok'],
      projectRoot: cwd,
    }),
    exec({
      arg0: process.execPath,
      args: ['-p', "'!(ok)' + process.argv.slice(1)", 'yes', 'ok'],
      cwd,
      projectRoot: cwd,
      color: true,
    }),
  ])

  t.matchStrict(runRes, {
    command: `${node} -p "'!(ok)' + process.argv.slice(1)"`,
    args: ['yes', 'ok'],
    status: 0,
    signal: null,
    stdout: '!(ok)yes,ok',
    stderr: '',
  })

  t.match(execRes, {
    args: ['-p', "'!(ok)' + process.argv.slice(1)", 'yes', 'ok'],
    status: 0,
    signal: null,
    stdout: '!(ok)yes,ok',
    stderr: '',
  })
})
