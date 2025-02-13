import cp from 'child_process'
import spawk from 'spawk'
import t from 'tap'
import type * as PS from '../src/index.ts'
const mockCP = { ...cp }
// make spawk play nice with ESM
const { promiseSpawn } = await t.mockImport<
  typeof import('../src/index.ts')
>('../src/index.ts', {
  child_process: mockCP,
  spawk: await t.mockImport('spawk', { child_process: mockCP }),
})

spawk.preventUnmatched()
t.afterEach(() => {
  spawk.clean()
})

t.test('types', async () => {
  /* eslint-disable @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/no-unused-vars */
  // https://www.totaltypescript.com/how-to-test-your-types#rolling-your-own
  type Expect<T extends true> = T
  type Equal<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends (
      <T>() => T extends Y ? 1 : 2
    ) ?
      true
    : false
  type StringResult = PS.SpawnResultByOptions<
    PS.PromiseSpawnOptionsStderrString &
      PS.PromiseSpawnOptionsStdoutString
  >
  type a = Expect<Equal<StringResult['stderr'], string>>
  type b = Expect<Equal<StringResult['stdout'], string>>
  type c = Expect<
    Equal<PS.SpawnResultString['stdout'], string | null>
  >
  /* eslint-enable @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/no-unused-vars */
})

t.test('defaults to returning strings', async t => {
  const proc = spawk.spawn('pass', [], {}).stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [])
  t.hasStrict(result, {
    status: 0,
    signal: null,
    stdout: 'OK',
    stderr: '',
  })

  //@ts-expect-error - no extra props added
  result.extra
  //@ts-expect-error - it's a string by default
  result.stdout.byteLength
  // not null, no error here
  result.stdout.length
  //@ts-expect-error - it's a string by default
  result.stderr.byteLength
  // not null, no error here
  result.stderr.length

  t.ok(proc.called)
})

t.test('extra context is returned', async t => {
  const proc = spawk.spawn('pass', [], {}).stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn(
    'pass',
    [],
    {},
    { extra: 'property' },
  )
  t.hasStrict(result, {
    status: 0,
    signal: null,
    stdout: 'OK',
    stderr: '',
    extra: 'property',
  })

  // no error, property infered by TS
  result.extra = 'hello'
  //@ts-expect-error - only the listed properties added
  result.somethingElse = 'whatever'
  //@ts-expect-error - it's a string by default
  result.stdout.byteLength
  // not null, no error here
  result.stdout.length
  //@ts-expect-error - it's a string by default
  result.stderr.byteLength
  // not null, no error here
  result.stderr.length

  t.ok(proc.called)
})

t.test('stdioString false returns buffers', async t => {
  const proc = spawk.spawn('pass', [], {}).stdout(Buffer.from('OK\n'))

  const result = await promiseSpawn('pass', [], {
    stdioString: false,
  })
  t.hasStrict(result, {
    status: 0,
    signal: null,
    stdout: Buffer.from('OK\n'),
    stderr: Buffer.from(''),
  })

  //@ts-expect-error - no props added
  result.extra = 'hello'
  // inferred as Buffer
  result.stdout.byteLength
  // not null, no error here
  result.stdout.length
  // inferred as Buffer
  result.stderr.byteLength
  // not null, no error here
  result.stderr.length

  t.ok(proc.called)
})

t.test(
  'stdout and stderr are null when stdio is inherit',
  async t => {
    const proc = spawk
      .spawn('pass', [], { stdio: 'inherit' })
      .stdout(Buffer.from('OK\n'))

    const result = await promiseSpawn('pass', [], {
      stdio: 'inherit',
    })
    t.hasStrict(result, {
      status: 0,
      signal: null,
      stdout: null,
      stderr: null,
    })
    //@ts-expect-error - inferred as null
    result.stdout = 'hello'
    //@ts-expect-error - inferred as null
    result.stderr = 'hello'

    t.ok(proc.called)
  },
)

t.test(
  'stdout and stderr are null when stdio is inherit and stdioString is false',
  async t => {
    const proc = spawk
      .spawn('pass', [], { stdio: 'inherit' })
      .stdout(Buffer.from('OK\n'))

    const result = await promiseSpawn('pass', [], {
      stdio: 'inherit',
      stdioString: false,
    })
    t.hasStrict(result, {
      status: 0,
      signal: null,
      stdout: null,
      stderr: null,
    })

    //@ts-expect-error - inferred as null
    result.stdout = 'hello'
    //@ts-expect-error - inferred as null
    result.stderr = 'hello'

    t.ok(proc.called)
  },
)

t.test(
  'stdout is null when stdio is [pipe, inherit, pipe]',
  async t => {
    const proc = spawk
      .spawn('pass', [], { stdio: ['pipe', 'inherit', 'pipe'] })
      .stdout(Buffer.from('OK\n'))

    const p = promiseSpawn('pass', [], {
      stdio: ['pipe', 'inherit', 'pipe'] as [
        'pipe',
        'inherit',
        'pipe',
      ],
    })
    const result = await p
    t.hasStrict(result, {
      status: 0,
      signal: null,
      stdout: null,
      stderr: '',
    })

    const inNotNull: typeof p.stdin extends null ? true : false =
      false
    inNotNull

    //@ts-expect-error - inferred as null
    result.stdout = 'hello'
    // inferred as string
    result.stderr = 'hello'
    t.ok(proc.called)
  },
)

t.test(
  'stderr is null when stdio is [pipe, pipe, inherit]',
  async t => {
    const proc = spawk
      .spawn('pass', [], { stdio: ['pipe', 'pipe', 'inherit'] })
      .stdout(Buffer.from('OK\n'))

    const p = promiseSpawn('pass', [], {
      stdio: ['pipe', 'pipe', 'inherit'] as [
        'pipe',
        'pipe',
        'inherit',
      ],
    })
    const result = await p
    t.hasStrict(result, {
      status: 0,
      signal: null,
      stdout: 'OK',
      stderr: null,
    })

    const inNotNull: typeof p.stdin extends null ? true : false =
      false
    inNotNull

    //@ts-expect-error - inferred as null
    result.stderr = 'hello'
    // inferred as string
    result.stdout = 'hello'

    t.ok(proc.called)
  },
)

t.test('exposes stdin', async t => {
  const proc = spawk.spawn('stdin', [], {})
  const p = promiseSpawn('stdin', [])
  process.nextTick(() => {
    //@ts-expect-error
    p.process.stdin.pipe(p.process.stdout)
    p.stdin.end('hello')
  })

  const result = await p
  t.hasStrict(result, {
    status: 0,
    signal: null,
    stdout: 'hello',
    stderr: '',
  })

  t.ok(proc.called)
})

t.test('exposes process', async t => {
  const proc = spawk.spawn('proc', [], {}).exitOnSignal('SIGKILL')

  const p = promiseSpawn('proc', [])
  process.nextTick(() => p.process.kill('SIGKILL'))

  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        status: 1,
        signal: null,
        stdout: '',
        stderr: '',
      },
    })
  } else {
    await t.rejects(
      p,
      Object.assign(new Error('command failed'), {
        cause: {
          signal: 'SIGKILL',
          stdout: '',
          stderr: '',
        },
      }),
    )
  }

  t.ok(proc.called)
})

t.test('rejects when spawn errors', async t => {
  const proc = spawk
    .spawn('notfound', [], {})
    .spawnError(new Error('command not found'))

  await t.rejects(promiseSpawn('notfound', []), {
    message: 'command failed',
    cause: {
      stdout: '',
      stderr: '',
      command: 'notfound',
      args: [],
      cause: new Error('command not found'),
    },
  })

  t.ok(proc.called)
})

t.test('spawn error includes extra', async t => {
  const proc = spawk
    .spawn('notfound', [], {})
    .spawnError(new Error('command not found'))

  await t.rejects(
    promiseSpawn('notfound', [], {}, { extra: 'property' }),
    {
      message: 'command failed',
      cause: {
        stdout: '',
        stderr: '',
        extra: 'property',
        cause: new Error('command not found'),
      },
    },
  )

  t.ok(proc.called)
})

t.test('spawn error respects stdioString', async t => {
  const proc = spawk
    .spawn('notfound', [], {})
    .spawnError(new Error('command not found'))

  await t.rejects(
    promiseSpawn('notfound', [], { stdioString: false }),
    {
      message: 'command failed',
      cause: {
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        cause: new Error('command not found'),
      },
    },
  )

  t.ok(proc.called)
})

t.test('spawn error respects stdio as inherit', async t => {
  const proc = spawk
    .spawn('notfound', [], { stdio: 'inherit' })
    .spawnError(new Error('command not found'))

  await t.rejects(
    promiseSpawn('notfound', [], { stdio: 'inherit' }),
    {
      message: 'command failed',
      cause: {
        stdout: null,
        stderr: null,
        cause: new Error('command not found'),
      },
    },
  )

  t.ok(proc.called)
})

t.test('rejects when command fails', async t => {
  const proc = spawk
    .spawn('fail', [], {})
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(promiseSpawn('fail', []), {
    message: 'command failed',
    cause: {
      status: 1,
      stdout: '',
      stderr: 'Error!',
    },
  })

  t.ok(proc.called)
})

t.test(
  'does not rejects when command fails if acceptFail',
  async t => {
    const proc = spawk
      .spawn('fail', [], {})
      .stderr(Buffer.from('Error!\n'))
      .exit(1)

    t.strictSame(
      await promiseSpawn('fail', [], { acceptFail: true }),
      {
        command: 'fail',
        args: [],
        cwd: process.cwd(),
        status: 1,
        signal: null,
        stdout: '',
        stderr: 'Error!',
      },
    )

    t.ok(proc.called)
  },
)

t.test('failed command returns extra', async t => {
  const proc = spawk
    .spawn('fail', [], {})
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(
    promiseSpawn('fail', [], {}, { extra: 'property' }),
    {
      message: 'command failed',
      cause: {
        status: 1,
        stdout: '',
        stderr: 'Error!',
        extra: 'property',
      },
    },
  )

  t.ok(proc.called)
})

t.test('failed command respects stdioString', async t => {
  const proc = spawk
    .spawn('fail', [], {})
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(promiseSpawn('fail', [], { stdioString: false }), {
    message: 'command failed',
    cause: {
      status: 1,
      stdout: Buffer.from(''),
      stderr: Buffer.from('Error!\n'),
    },
  })

  t.ok(proc.called)
})

t.test('failed command respects stdio as inherit', async t => {
  const proc = spawk
    .spawn('fail', [], { stdio: 'inherit' })
    .stderr(Buffer.from('Error!\n'))
    .exit(1)

  await t.rejects(promiseSpawn('fail', [], { stdio: 'inherit' }), {
    message: 'command failed',
    cause: {
      status: 1,
      stdout: null,
      stderr: null,
    },
  })

  t.ok(proc.called)
})

t.test('rejects when signal kills child', async t => {
  const proc = spawk.spawn('signal', [], {}).signal('SIGFAKE')

  const p = promiseSpawn('signal', [])
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        status: 1,
        signal: null,
        stdout: '',
        stderr: '',
      },
    })
  } else {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        code: null,
        signal: 'SIGFAKE',
        stdout: '',
        stderr: '',
      },
    })
  }

  t.ok(proc.called)
})

t.test('signal death includes extra', async t => {
  const proc = spawk.spawn('signal', [], {}).signal('SIGFAKE')

  const p = promiseSpawn('signal', [], {}, { extra: 'property' })
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        status: 1,
        signal: null,
        stdout: '',
        stderr: '',
        extra: 'property',
      },
    })
  } else {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        code: null,
        signal: 'SIGFAKE',
        stdout: '',
        stderr: '',
        extra: 'property',
      },
    })
  }

  t.ok(proc.called)
})

t.test('signal death respects stdioString', async t => {
  const proc = spawk.spawn('signal', [], {}).signal('SIGFAKE')

  const p = promiseSpawn('signal', [], { stdioString: false })
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        status: 1,
        signal: null,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      },
    })
  } else {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        code: null,
        signal: 'SIGFAKE',
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      },
    })
  }

  t.ok(proc.called)
})

t.test('signal death respects stdio as inherit', async t => {
  const proc = spawk
    .spawn('signal', [], { stdio: 'inherit' })
    .signal('SIGFAKE')

  const p = promiseSpawn('signal', [], { stdio: 'inherit' })
  // there are no signals in windows, so we expect a different result
  if (process.platform === 'win32') {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        status: 1,
        signal: null,
        stdout: null,
        stderr: null,
      },
    })
  } else {
    await t.rejects(p, {
      message: 'command failed',
      cause: {
        code: null,
        signal: 'SIGFAKE',
        stdout: null,
        stderr: null,
      },
    })
  }

  t.ok(proc.called)
})

t.test('rejects when stdout errors', async t => {
  const proc = spawk.spawn('stdout-err', [], {})

  const p = promiseSpawn('stdout-err', [])
  process.nextTick(() =>
    p.process.stdout.emit('error', new Error('stdout err')),
  )

  await t.rejects(
    p,
    Object.assign(new Error('command failed'), {
      cause: {
        command: 'stdout-err',
        args: [],
        stdout: '',
        stderr: '',
        cause: new Error('stdout err'),
      },
    }),
  )

  t.ok(proc.called)
})

t.test('rejects when stderr errors', async t => {
  const proc = spawk.spawn('stderr-err', [], {})

  const p = promiseSpawn('stderr-err', [])
  process.nextTick(() =>
    p.process.stderr.emit('error', new Error('stderr err')),
  )

  await t.rejects(
    p,
    Object.assign(new Error('command failed'), {
      cause: {
        command: 'stderr-err',
        args: [],
        stdout: '',
        stderr: '',
        cause: new Error('stderr err'),
      },
    }),
  )

  t.ok(proc.called)
})
