import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { AccessResult } from '../../src/commands/access.ts'

type RequestLog = {
  url: string
  method?: string
  body?: string
  otp?: string
}

const makeRequestLog = () => {
  const log: RequestLog[] = []
  return { log }
}

const makeMockModule = (
  log: RequestLog[],
  responseData: Record<string, unknown> = {},
) => ({
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async request(
        url: string | URL,
        opts?: {
          method?: string
          body?: string
          otp?: string
          useCache?: false
        },
      ) {
        log.push({
          url: String(url),
          method: opts?.method,
          body: opts?.body,
          otp: opts?.otp,
        })
        return {
          json: () => responseData,
        }
      }
    },
  },
})

const makeConfig = (
  positionals: string[],
  overrides: Partial<{
    registry: string
    otp: string
    access: string
    packageJson: {
      maybeRead: (root: string) => { name: string } | undefined
    }
    projectRoot: string
  }> = {},
): LoadedConfig =>
  ({
    positionals,
    projectRoot: overrides.projectRoot ?? '/test',
    options: {
      registry: overrides.registry ?? 'https://registry.npmjs.org/',
      otp: overrides.otp,
      access: overrides.access,
      packageJson: overrides.packageJson ?? {
        maybeRead: () => ({ name: '@scope/my-pkg' }),
      },
    },
    get: (key: string) => {
      if (key === 'access') return overrides.access
      return undefined
    },
  }) as unknown as LoadedConfig

t.test('usage', async t => {
  const { usage } = await t.mockImport<
    typeof import('../../src/commands/access.ts')
  >('../../src/commands/access.ts', makeMockModule([]))
  t.matchSnapshot(usage().usageMarkdown())
})

t.test('invalid subcommand', async t => {
  const { command } = await t.mockImport<
    typeof import('../../src/commands/access.ts')
  >('../../src/commands/access.ts', makeMockModule([]))
  await t.rejects(command(makeConfig(['invalid'])), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('missing subcommand', async t => {
  const { command } = await t.mockImport<
    typeof import('../../src/commands/access.ts')
  >('../../src/commands/access.ts', makeMockModule([]))
  await t.rejects(command(makeConfig([])), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('list packages', async t => {
  t.test('with explicit entity', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >(
      '../../src/commands/access.ts',
      makeMockModule(log, {
        '@scope/pkg-a': 'read-write',
        '@scope/pkg-b': 'read-only',
      }),
    )
    const result = await command(
      makeConfig(['list', 'packages', '@scope']),
    )
    t.strictSame(result, {
      packages: {
        '@scope/pkg-a': 'read-write',
        '@scope/pkg-b': 'read-only',
      },
    })
    t.equal(log.length, 1)
    t.equal(
      log[0]!.url,
      'https://registry.npmjs.org/-/org/%40scope/package',
    )
  })

  t.test('falls back to scope from package.json', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log, {}))
    const result = await command(makeConfig(['list', 'packages']))
    t.strictSame(result, { packages: {} })
    t.equal(log.length, 1)
    t.equal(
      log[0]!.url,
      'https://registry.npmjs.org/-/org/%40scope/package',
    )
  })

  t.test('errors when no scope available', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(
        makeConfig(['list', 'packages'], {
          packageJson: {
            maybeRead: () => ({ name: 'unscoped-pkg' }),
          },
        }),
      ),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors when package.json has no name', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(
        makeConfig(['list', 'packages'], {
          packageJson: { maybeRead: () => undefined },
        }),
      ),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors with wrong keyword', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['list', 'wrong'])), {
      cause: { code: 'EUSAGE' },
    })
  })
})

t.test('get status', async t => {
  t.test('gets status of a package', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >(
      '../../src/commands/access.ts',
      makeMockModule(log, { access: 'public' }),
    )
    const result = await command(
      makeConfig(['get', 'status', '@scope/my-pkg']),
    )
    t.strictSame(result, {
      package: '@scope/my-pkg',
      access: 'public',
    })
    t.equal(log.length, 1)
    t.equal(
      log[0]!.url,
      'https://registry.npmjs.org/-/package/@scope%2Fmy-pkg/access',
    )
  })

  t.test('errors with wrong keyword', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['get', 'wrong', 'pkg'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('errors without package name', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['get', 'status'])), {
      cause: { code: 'EUSAGE' },
    })
  })
})

t.test('set status', async t => {
  t.test('sets package to public', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    const result = await command(
      makeConfig(['set', 'status=public', '@scope/my-pkg']),
    )
    t.strictSame(result, {
      package: '@scope/my-pkg',
      access: 'public',
    })
    t.equal(log.length, 1)
    t.equal(log[0]!.method, 'PUT')
    t.equal(log[0]!.body, JSON.stringify({ access: 'public' }))
  })

  t.test('sets package to restricted', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    const result = await command(
      makeConfig(['set', 'status=restricted', '@scope/my-pkg']),
    )
    t.strictSame(result, {
      package: '@scope/my-pkg',
      access: 'restricted',
    })
  })

  t.test('passes otp when provided', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    await command(
      makeConfig(['set', 'status=public', '@scope/my-pkg'], {
        otp: '123456',
      }),
    )
    t.equal(log[0]!.otp, '123456')
  })

  t.test('errors with invalid access level', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(makeConfig(['set', 'status=invalid', '@scope/my-pkg'])),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors without status= prefix', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(makeConfig(['set', 'public', '@scope/my-pkg'])),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors without package name', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['set', 'status=public'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('errors with no args', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['set'])), {
      cause: { code: 'EUSAGE' },
    })
  })
})

t.test('grant', async t => {
  t.test(
    'grants read-write to a team with explicit package',
    async t => {
      const { log } = makeRequestLog()
      const { command } = await t.mockImport<
        typeof import('../../src/commands/access.ts')
      >('../../src/commands/access.ts', makeMockModule(log))
      const result = await command(
        makeConfig([
          'grant',
          'read-write',
          'myorg:myteam',
          '@scope/my-pkg',
        ]),
      )
      t.strictSame(result, {
        granted: {
          team: 'myorg:myteam',
          permissions: 'read-write',
        },
      })
      t.equal(log.length, 1)
      t.equal(log[0]!.method, 'PUT')
      t.equal(
        log[0]!.url,
        'https://registry.npmjs.org/-/team/myorg/myteam/package',
      )
      t.equal(
        log[0]!.body,
        JSON.stringify({
          package: '@scope/my-pkg',
          permissions: 'read-write',
        }),
      )
    },
  )

  t.test('grants read-only to a team', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    const result = await command(
      makeConfig([
        'grant',
        'read-only',
        'myorg:myteam',
        '@scope/my-pkg',
      ]),
    )
    t.strictSame(result, {
      granted: {
        team: 'myorg:myteam',
        permissions: 'read-only',
      },
    })
  })

  t.test('falls back to package.json name', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    const result = await command(
      makeConfig(['grant', 'read-write', 'myorg:myteam']),
    )
    t.strictSame(result, {
      granted: {
        team: 'myorg:myteam',
        permissions: 'read-write',
      },
    })
    t.equal(
      log[0]!.body,
      JSON.stringify({
        package: '@scope/my-pkg',
        permissions: 'read-write',
      }),
    )
  })

  t.test('errors with invalid permissions', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(
        makeConfig([
          'grant',
          'invalid',
          'myorg:myteam',
          '@scope/my-pkg',
        ]),
      ),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors without team', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['grant', 'read-write'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('errors with malformed team (no colon)', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(makeConfig(['grant', 'read-write', 'badteam', 'pkg'])),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors with malformed team (empty parts)', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(makeConfig(['grant', 'read-write', ':team', 'pkg'])),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors when no package name available', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(
        makeConfig(['grant', 'read-write', 'myorg:myteam'], {
          packageJson: { maybeRead: () => undefined },
        }),
      ),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('passes otp when provided', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    await command(
      makeConfig(
        ['grant', 'read-write', 'myorg:myteam', '@scope/my-pkg'],
        { otp: '654321' },
      ),
    )
    t.equal(log[0]!.otp, '654321')
  })
})

t.test('revoke', async t => {
  t.test('revokes team access with explicit package', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    const result = await command(
      makeConfig(['revoke', 'myorg:myteam', '@scope/my-pkg']),
    )
    t.strictSame(result, {
      revoked: { team: 'myorg:myteam' },
    })
    t.equal(log.length, 1)
    t.equal(log[0]!.method, 'DELETE')
    t.equal(
      log[0]!.url,
      'https://registry.npmjs.org/-/team/myorg/myteam/package',
    )
    t.equal(
      log[0]!.body,
      JSON.stringify({ package: '@scope/my-pkg' }),
    )
  })

  t.test('falls back to package.json name', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    const result = await command(
      makeConfig(['revoke', 'myorg:myteam']),
    )
    t.strictSame(result, {
      revoked: { team: 'myorg:myteam' },
    })
    t.equal(
      log[0]!.body,
      JSON.stringify({ package: '@scope/my-pkg' }),
    )
  })

  t.test('errors without team', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['revoke'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('errors with malformed team (no colon)', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(makeConfig(['revoke', 'badteam', 'pkg'])),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('errors with malformed team (empty scope)', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(command(makeConfig(['revoke', ':team', 'pkg'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('errors when no package name available', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule([]))
    await t.rejects(
      command(
        makeConfig(['revoke', 'myorg:myteam'], {
          packageJson: { maybeRead: () => undefined },
        }),
      ),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('passes otp when provided', async t => {
    const { log } = makeRequestLog()
    const { command } = await t.mockImport<
      typeof import('../../src/commands/access.ts')
    >('../../src/commands/access.ts', makeMockModule(log))
    await command(
      makeConfig(['revoke', 'myorg:myteam', '@scope/my-pkg'], {
        otp: '999999',
      }),
    )
    t.equal(log[0]!.otp, '999999')
  })
})

t.test('views', async t => {
  const { views } = await t.mockImport<
    typeof import('../../src/commands/access.ts')
  >('../../src/commands/access.ts', makeMockModule([]))

  t.test('human view - packages list', async t => {
    const result: AccessResult = {
      packages: {
        '@scope/pkg-a': 'read-write',
        '@scope/pkg-b': 'read-only',
      },
    }
    const output = views.human(result)
    t.equal(
      output,
      '@scope/pkg-a: read-write\n@scope/pkg-b: read-only',
    )
  })

  t.test('human view - empty packages list', async t => {
    const result: AccessResult = { packages: {} }
    const output = views.human(result)
    t.equal(output, 'No packages found.')
  })

  t.test('human view - granted', async t => {
    const result: AccessResult = {
      granted: {
        team: 'myorg:myteam',
        permissions: 'read-write',
      },
    }
    const output = views.human(result)
    t.equal(output, 'Granted read-write access to myorg:myteam.')
  })

  t.test('human view - revoked', async t => {
    const result: AccessResult = {
      revoked: { team: 'myorg:myteam' },
    }
    const output = views.human(result)
    t.equal(output, 'Revoked access from myorg:myteam.')
  })

  t.test('human view - package status', async t => {
    const result: AccessResult = {
      package: '@scope/my-pkg',
      access: 'public',
    }
    const output = views.human(result)
    t.equal(output, '@scope/my-pkg: public')
  })

  t.test('json view', async t => {
    const result: AccessResult = {
      package: '@scope/my-pkg',
      access: 'public',
    }
    t.strictSame(views.json(result), result)
  })
})

t.test('get status - unscoped package', async t => {
  const { log } = makeRequestLog()
  const { command } = await t.mockImport<
    typeof import('../../src/commands/access.ts')
  >(
    '../../src/commands/access.ts',
    makeMockModule(log, { access: 'restricted' }),
  )
  const result = await command(
    makeConfig(['get', 'status', 'unscoped-pkg']),
  )
  t.strictSame(result, {
    package: 'unscoped-pkg',
    access: 'restricted',
  })
  t.equal(
    log[0]!.url,
    'https://registry.npmjs.org/-/package/unscoped-pkg/access',
  )
})

t.test('set status - unscoped package', async t => {
  const { log } = makeRequestLog()
  const { command } = await t.mockImport<
    typeof import('../../src/commands/access.ts')
  >('../../src/commands/access.ts', makeMockModule(log))
  const result = await command(
    makeConfig(['set', 'status=public', 'unscoped-pkg']),
  )
  t.strictSame(result, {
    package: 'unscoped-pkg',
    access: 'public',
  })
  t.equal(
    log[0]!.url,
    'https://registry.npmjs.org/-/package/unscoped-pkg/access',
  )
})
