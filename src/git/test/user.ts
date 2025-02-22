import t from 'tap'

t.test('find both name and email', async t => {
  const { getUser } = await t.mockImport<
    typeof import('../src/user.ts')
  >('../src/user.ts', {
    '../src/spawn.ts': {
      spawn: async (args: string[]) => {
        if (args[2] === 'user.name') return { stdout: 'Ruy Adorno' }
        if (args[2] === 'user.email')
          return { stdout: 'ruy@example.com' }
        else
          return {
            status: 1,
          }
      },
    },
  })
  t.strictSame(
    await getUser(),
    {
      name: 'Ruy Adorno',
      email: 'ruy@example.com',
    },
    'should return both name and email',
  )
})

t.test('find both name and email from fallback', async t => {
  const { getUser } = await t.mockImport<
    typeof import('../src/user.ts')
  >('../src/user.ts', {
    '../src/spawn.ts': {
      spawn: async (args: string[]) => {
        if (args[1] === '--get') return { status: 1 }
        if (args[2] === 'user.name') return { stdout: 'Ruy Adorno' }
        if (args[2] === 'user.email')
          return { stdout: 'ruy@example.com' }
        else
          return {
            status: 1,
          }
      },
    },
  })
  t.strictSame(
    await getUser(),
    {
      name: 'Ruy Adorno',
      email: 'ruy@example.com',
    },
    'should return both name and email from the new (fallback) method',
  )
})

t.test('find name only', async t => {
  const { getUser } = await t.mockImport<
    typeof import('../src/user.ts')
  >('../src/user.ts', {
    '../src/spawn.ts': {
      spawn: async (args: string[]) => {
        if (args[2] === 'user.name') return { stdout: 'Ruy Adorno' }
        else
          return {
            status: 1,
          }
      },
    },
  })
  t.strictSame(
    await getUser(),
    {
      name: 'Ruy Adorno',
      email: '',
    },
    'should return name only',
  )
})

t.test('find email only', async t => {
  const { getUser } = await t.mockImport<
    typeof import('../src/user.ts')
  >('../src/user.ts', {
    '../src/spawn.ts': {
      spawn: async (args: string[]) => {
        if (args[2] === 'user.email')
          return { stdout: 'ruy@example.com' }
        else
          return {
            status: 1,
          }
      },
    },
  })
  t.strictSame(
    await getUser(),
    {
      name: '',
      email: 'ruy@example.com',
    },
    'should return email only',
  )
})

t.test('find email only signal', async t => {
  const { getUser } = await t.mockImport<
    typeof import('../src/user.ts')
  >('../src/user.ts', {
    '../src/spawn.ts': {
      spawn: async (args: string[]) => {
        if (args[2] === 'user.email')
          return { stdout: 'ruy@example.com' }
        else
          return {
            signal: 'SIGTERM',
          }
      },
    },
  })
  t.strictSame(
    await getUser(),
    {
      name: '',
      email: 'ruy@example.com',
    },
    'should return email only from signal',
  )
})

t.test('find nothing', async t => {
  const { getUser } = await t.mockImport<
    typeof import('../src/user.ts')
  >('../src/user.ts', {
    '../src/spawn.ts': {
      spawn: async () => {
        return {
          status: 1,
        }
      },
    },
  })
  t.strictSame(await getUser(), undefined, 'should return undefined')
})
