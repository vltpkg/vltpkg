import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const mockCommand = (t: Test, mocks?: Record<string, any>) =>
  t.mockImport<typeof import('../../src/commands/config.ts')>(
    '../../src/commands/config.ts',
    mocks,
  )

// Mock the config functions to focus on CLI routing
const mockConfigFunctions = {
  get: async () => 'mocked-get-result',
  set: async () => undefined,
  edit: async () => undefined,
  list: () => ['color=auto', 'registry=https://registry.npmjs.org/'],
  del: async () => undefined,
}

class MockConfig {
  values: Record<string, any>
  positionals: string[]

  constructor(positionals: string[], values: Record<string, any>) {
    this.positionals = positionals
    this.values = values
    this.values.packageJson = new PackageJson()
    this.values.scurry = new PathScurry(t.testdirName)
    // Set default config option to 'all' to match the new default
    if (!this.values.config) {
      this.values.config = 'all'
    }
  }
  get options() {
    return this.values
  }
  get(key: string) {
    return this.values[key]
  }
}

const run = async (
  t: Test,
  positionals: string[],
  values: Record<string, any> = {},
) => {
  const conf = new MockConfig(positionals, values)
  const cmd = await mockCommand(t, {
    '@vltpkg/config': mockConfigFunctions,
    '@vltpkg/vlt-json': {
      load: () => ({}),
      find: (which: 'user' | 'project') =>
        which === 'user' ?
          '/home/user/.config/vlt/vlt.json'
        : '/project/vlt.json',
    },
  })
  return cmd.command(conf as unknown as LoadedConfig)
}

const USAGE = await mockCommand(t).then(C => C.usage().usage())

t.matchSnapshot(USAGE, 'usage')

t.test('command routing', async t => {
  t.test('get command', async t => {
    const result = await run(t, ['get', 'registry'])
    // With default --config=all, should return merged config value
    t.equal(result, 'mocked-get-result')
  })

  t.test('set command', async t => {
    const result = await run(t, ['set', 'registry=example.com'])
    t.equal(result, undefined)
  })

  t.test('list command', async t => {
    const result = await run(t, ['list'])
    t.strictSame(result, [
      'color=auto',
      'registry=https://registry.npmjs.org/',
    ])
  })

  t.test('ls alias', async t => {
    const result = await run(t, ['ls'])
    t.strictSame(result, [
      'color=auto',
      'registry=https://registry.npmjs.org/',
    ])
  })

  t.test('edit command', async t => {
    const result = await run(t, ['edit'])
    t.equal(result, undefined)
  })

  t.test('del command', async t => {
    const result = await run(t, ['del', 'registry'])
    t.equal(result, undefined)
  })

  t.test('delete command', async t => {
    const result = await run(t, ['delete', 'registry'])
    t.equal(result, undefined)
  })

  t.test('rm alias', async t => {
    const result = await run(t, ['rm', 'registry'])
    t.equal(result, undefined)
  })

  t.test('pick command', async t => {
    const result = await run(t, ['pick'])
    // Should return a JSON object (merged config) when no args provided
    t.type(result, 'object')
    t.ok(result && typeof result === 'object')
    // Check that it has the expected config property
    if (result && typeof result === 'object' && 'config' in result) {
      t.equal((result as any).config, 'all')
    }
  })

  t.test('no subcommand shows help', async t => {
    await t.rejects(run(t, []), {
      message: 'config command requires a subcommand',
      cause: {
        found: undefined,
        validOptions: [
          'get',
          'pick',
          'set',
          'delete',
          'list',
          'edit',
          'location',
        ],
      },
    })
  })

  t.test('location command', async t => {
    const result = await run(t, ['location'])
    t.type(result, 'string')
    t.match(result, /vlt\.json$/)
    t.equal(result, '/project/vlt.json')
  })

  t.test('location command with --config=user', async t => {
    const result = await run(t, ['location'], { config: 'user' })
    t.equal(result, '/home/user/.config/vlt/vlt.json')
  })

  t.test('location command with --config=project', async t => {
    const result = await run(t, ['location'], { config: 'project' })
    t.equal(result, '/project/vlt.json')
  })

  t.test(
    'location command with --config=all defaults to project',
    async t => {
      const result = await run(t, ['location'], { config: 'all' })
      t.equal(result, '/project/vlt.json')
    },
  )

  t.test('invalid command', async t => {
    await t.rejects(run(t, ['invalid']), {
      message: 'Unrecognized config command',
      cause: {
        found: 'invalid',
        validOptions: [
          'get',
          'pick',
          'set',
          'delete',
          'list',
          'edit',
          'location',
        ],
      },
    })
  })
})

t.test('enhanced get functionality', async t => {
  t.test('get with no args falls back to pick', async t => {
    const result = await run(t, ['get'])
    // Should return a JSON object (merged config) when no args provided
    t.type(result, 'object')
    t.ok(result && typeof result === 'object')
    // Check that it has the expected config property
    if (result && typeof result === 'object' && 'config' in result) {
      t.equal((result as any).config, 'all')
    }
  })

  t.test(
    'get with single arg and --config=all returns merged config value',
    async t => {
      const result = await run(t, ['get', 'color'], { config: 'all' })
      // Should return the merged config value (same as original get behavior)
      t.equal(result, 'mocked-get-result')
    },
  )

  t.test(
    'get with single arg and --config=user returns JSON value',
    async t => {
      const result = await run(t, ['get', 'registry'], {
        config: 'user',
      })
      // Should return undefined (no user config in test environment) which gets JSON.stringify'd
      t.equal(result, undefined)
    },
  )

  t.test(
    'get with single arg and --config=project returns JSON value',
    async t => {
      const result = await run(t, ['get', 'registry'], {
        config: 'project',
      })
      // Should return undefined (no project config in test environment) which gets JSON.stringify'd
      t.equal(result, undefined)
    },
  )

  t.test('get with multiple args uses pick behavior', async t => {
    const result = await run(t, ['get', 'registry', 'color'])
    // Should return an object with the requested keys
    t.type(result, 'object')
    t.ok(result && typeof result === 'object')
  })
})

t.test('pick command functionality', async t => {
  t.test('pick with no args and --config=all', async t => {
    const result = await run(t, ['pick'], { config: 'all' })
    // Should return merged config object
    t.type(result, 'object')
    t.ok(result && typeof result === 'object')
  })

  t.test('pick with no args and --config=user', async t => {
    const result = await run(t, ['pick'], { config: 'user' })
    // Should return user config object (empty in test environment)
    t.type(result, 'object')
    t.equal(JSON.stringify(result), '{}')
  })

  t.test('pick with no args and --config=project', async t => {
    const result = await run(t, ['pick'], { config: 'project' })
    // Should return project config object (empty in test environment)
    t.type(result, 'object')
    t.equal(JSON.stringify(result), '{}')
  })

  t.test('pick with specific keys', async t => {
    const result = await run(t, ['pick', 'registry', 'color'])
    // Should return an object with the requested keys
    t.type(result, 'object')
    t.ok(result && typeof result === 'object')
  })

  t.test('pick with specific keys and --config=user', async t => {
    const result = await run(t, ['pick', 'registry'], {
      config: 'user',
    })
    // Should return an object with the requested key from user config
    t.type(result, 'object')
    t.ok(result && typeof result === 'object')
    if (
      result &&
      typeof result === 'object' &&
      'registry' in result
    ) {
      t.equal((result as any).registry, undefined)
    }
  })
})

t.test('list command functionality', async t => {
  t.test('list with --config=all', async t => {
    const result = await run(t, ['list'], { config: 'all' })
    // Should return array of strings in key=value format
    t.type(result, 'object')
  })

  t.test('list with --config=user', async t => {
    const result = await run(t, ['list'], { config: 'user' })
    // Should return array of strings from user config (empty in test environment)
    t.type(result, 'object')
    if (Array.isArray(result)) {
      t.equal(result.length, 0)
    }
  })

  t.test('list with --config=project', async t => {
    const result = await run(t, ['list'], { config: 'project' })
    // Should return array of strings from project config (empty in test environment)
    t.type(result, 'object')
    if (Array.isArray(result)) {
      t.equal(result.length, 0)
    }
  })
})

t.test('error handling', async t => {
  t.test('get with empty key should throw error', async t => {
    // This tests the error case where key is empty
    await t.rejects(run(t, ['get', '']), {
      message: 'Key is required',
      cause: { code: 'EUSAGE' },
    })
  })
})

t.test('views functionality', async t => {
  const cmd = await mockCommand(t)

  // Type assertion to access views as an object with human property
  const views = cmd.views as { human: (results: unknown) => string }

  t.test('views.human with string array', async t => {
    const result = views.human(['key1=value1', 'key2=value2'])
    t.equal(result, 'key1=value1\nkey2=value2')
  })

  t.test('views.human with object', async t => {
    const result = views.human({
      key: 'value',
      nested: { prop: 'test' },
    })
    t.equal(
      result,
      JSON.stringify(
        { key: 'value', nested: { prop: 'test' } },
        null,
        2,
      ),
    )
  })

  t.test('views.human with primitive', async t => {
    const result = views.human('simple string')
    t.equal(result, JSON.stringify('simple string', null, 2))
  })
})

t.test('config helper functions with actual data', async t => {
  // Mock with actual config data to test helper functions
  const mockWithData = {
    '@vltpkg/config': mockConfigFunctions,
    '@vltpkg/vlt-json': {
      load: (
        field: string,
        validator: any,
        which: 'user' | 'project',
      ) => {
        if (field !== 'config') return undefined

        const data =
          which === 'user' ?
            { registry: 'https://user-registry.com', color: 'always' }
          : {
              registry: 'https://project-registry.com',
              tag: 'latest',
              nested: { prop: 'value' },
              arrayProp: ['item1', 'item2'],
            }

        // Call validator to test error paths
        validator(data, `/test/${which}/vlt.json`)

        return data
      },
      find: (which: 'user' | 'project') =>
        which === 'user' ?
          '/home/user/.config/vlt/vlt.json'
        : '/project/vlt.json',
    },
  }

  const runWithData = async (
    positionals: string[],
    values: Record<string, any> = {},
  ) => {
    const conf = new MockConfig(positionals, values)
    const cmd = await mockCommand(t, mockWithData)
    return cmd.command(conf as unknown as LoadedConfig)
  }

  t.test(
    'get with --config=user returns user config value',
    async t => {
      const result = await runWithData(['get', 'registry'], {
        config: 'user',
      })
      t.equal(result, 'https://user-registry.com')
    },
  )

  t.test(
    'get with --config=project returns project config value',
    async t => {
      const result = await runWithData(['get', 'registry'], {
        config: 'project',
      })
      t.equal(result, 'https://project-registry.com')
    },
  )

  t.test('get with dot notation from user config', async t => {
    const result = await runWithData(['get', 'nested.prop'], {
      config: 'project',
    })
    t.equal(result, 'value')
  })

  t.test('pick with specific keys from user config', async t => {
    const result = await runWithData(['pick', 'registry', 'color'], {
      config: 'user',
    })
    t.type(result, 'object')
    if (result && typeof result === 'object') {
      t.equal((result as any).registry, 'https://user-registry.com')
      t.equal((result as any).color, 'always')
    }
  })

  t.test('pick with specific keys from project config', async t => {
    const result = await runWithData(['pick', 'registry', 'tag'], {
      config: 'project',
    })
    t.type(result, 'object')
    if (result && typeof result === 'object') {
      t.equal(
        (result as any).registry,
        'https://project-registry.com',
      )
      t.equal((result as any).tag, 'latest')
    }
  })

  t.test(
    'list with --config=user returns formatted strings',
    async t => {
      const result = await runWithData(['list'], { config: 'user' })
      t.type(result, 'object')
      if (Array.isArray(result)) {
        t.ok(result.includes('color=always'))
        t.ok(result.includes('registry=https://user-registry.com'))
      }
    },
  )

  t.test(
    'list with --config=project returns formatted strings with complex data',
    async t => {
      const result = await runWithData(['list'], {
        config: 'project',
      })
      t.type(result, 'object')
      if (Array.isArray(result)) {
        t.ok(
          result.some(item =>
            item.includes('registry=https://project-registry.com'),
          ),
        )
        t.ok(result.some(item => item.includes('tag=latest')))
        t.ok(result.some(item => item.includes('nested.prop=value')))
        t.ok(result.some(item => item.includes('arrayProp=item1')))
        t.ok(result.some(item => item.includes('arrayProp=item2')))
      }
    },
  )
})

t.test('config helper functions error handling', async t => {
  // Mock with invalid data to test error paths
  const mockWithInvalidData = {
    '@vltpkg/config': mockConfigFunctions,
    '@vltpkg/vlt-json': {
      load: (
        field: string,
        validator: any,
        which: 'user' | 'project',
      ) => {
        if (field !== 'config') return undefined

        // Return invalid data (not an object) to trigger validator error
        const invalidData = 'invalid-config-data'

        validator(invalidData, `/test/${which}/vlt.json`)

        return invalidData
      },
      find: (which: 'user' | 'project') =>
        which === 'user' ?
          '/home/user/.config/vlt/vlt.json'
        : '/project/vlt.json',
    },
  }

  const runWithInvalidData = async (
    positionals: string[],
    values: Record<string, any> = {},
  ) => {
    const conf = new MockConfig(positionals, values)
    const cmd = await mockCommand(t, mockWithInvalidData)
    return cmd.command(conf as unknown as LoadedConfig)
  }

  t.test(
    'get with invalid user config handles error gracefully',
    async t => {
      const result = await runWithInvalidData(['get', 'registry'], {
        config: 'user',
      })
      t.equal(result, undefined)
    },
  )

  t.test(
    'get with invalid project config handles error gracefully',
    async t => {
      const result = await runWithInvalidData(['get', 'registry'], {
        config: 'project',
      })
      t.equal(result, undefined)
    },
  )

  t.test(
    'list with invalid user config handles error gracefully',
    async t => {
      const result = await runWithInvalidData(['list'], {
        config: 'user',
      })
      t.type(result, 'object')
      if (Array.isArray(result)) {
        t.equal(result.length, 0)
      }
    },
  )

  t.test(
    'list with invalid project config handles error gracefully',
    async t => {
      const result = await runWithInvalidData(['list'], {
        config: 'project',
      })
      t.type(result, 'object')
      if (Array.isArray(result)) {
        t.equal(result.length, 0)
      }
    },
  )
})

t.test('fallback cases', async t => {
  t.test(
    'configGet with invalid config option falls back to merged config',
    async t => {
      const result = await run(t, ['get', 'registry'], {
        config: 'invalid' as any,
      })
      t.equal(result, 'mocked-get-result')
    },
  )

  t.test(
    'configList with invalid config option falls back to merged config',
    async t => {
      const result = await run(t, ['list'], {
        config: 'invalid' as any,
      })
      t.strictSame(result, [
        'color=auto',
        'registry=https://registry.npmjs.org/',
      ])
    },
  )
})

t.test('delete command aliases', async t => {
  t.test('remove alias', async t => {
    const result = await run(t, ['remove', 'registry'])
    t.equal(result, undefined)
  })

  t.test('unset alias', async t => {
    const result = await run(t, ['unset', 'registry'])
    t.equal(result, undefined)
  })
})

t.test('configToStringArray edge cases', async t => {
  // Test the configToStringArray function with various data types
  const mockWithComplexData = {
    '@vltpkg/config': mockConfigFunctions,
    '@vltpkg/vlt-json': {
      load: (
        field: string,
        validator: any,
        which: 'user' | 'project',
      ) => {
        if (field !== 'config') return undefined

        const complexData = {
          stringValue: 'test',
          numberValue: 42,
          booleanValue: true,
          nullValue: null,
          undefinedValue: undefined,
          arrayValue: ['item1', 'item2'],
          objectValue: { nested: 'value', deep: { prop: 'test' } },
          emptyArray: [],
          emptyObject: {},
          // Add edge cases to cover uncovered lines
          // For line 298: object that should be JSON stringified (not nested)
          simpleObject: { key: 'value' }, // This will be JSON stringified as a primitive
          symbolValue: Symbol('test'), // This will trigger the [object] fallback
          functionValue: () => 'test', // This will also trigger the [object] fallback
        }

        validator(complexData, `/test/${which}/vlt.json`)
        return complexData
      },
      find: (which: 'user' | 'project') =>
        which === 'user' ?
          '/home/user/.config/vlt/vlt.json'
        : '/project/vlt.json',
    },
  }

  const runWithComplexData = async (
    positionals: string[],
    values: Record<string, any> = {},
  ) => {
    const conf = new MockConfig(positionals, values)
    const cmd = await mockCommand(t, mockWithComplexData)
    return cmd.command(conf as unknown as LoadedConfig)
  }

  t.test('list with complex data types', async t => {
    const result = await runWithComplexData(['list'], {
      config: 'project',
    })
    t.type(result, 'object')
    if (Array.isArray(result)) {
      // Check that different data types are handled correctly
      t.ok(result.some(item => item.includes('stringValue=test')))
      t.ok(result.some(item => item.includes('numberValue=42')))
      t.ok(result.some(item => item.includes('booleanValue=true')))
      t.ok(result.some(item => item.includes('arrayValue=item1')))
      t.ok(result.some(item => item.includes('arrayValue=item2')))
      t.ok(
        result.some(item =>
          item.includes('objectValue.nested=value'),
        ),
      )
      // Check for nested object handling - the deep object becomes [object Object]
      t.ok(
        result.some(item =>
          item.includes('objectValue.deep=[object Object]'),
        ),
      )
      // Check for primitive object JSON stringification (line 298)
      t.ok(
        result.some(item => item.includes('simpleObject.key=value')),
      )
      // Check for [object] fallback for non-standard types (lines 307-308)
      t.ok(result.some(item => item.includes('symbolValue=[object]')))
      t.ok(
        result.some(item => item.includes('functionValue=[object]')),
      )
      // null and undefined values should be skipped
      t.notOk(result.some(item => item.includes('nullValue=')))
      t.notOk(result.some(item => item.includes('undefinedValue=')))
    }
  })
})

t.test('write operation wrapper functions', async t => {
  // Test the wrapper functions to cover the originalGet.call logic
  const mockForWrappers = {
    '@vltpkg/config': {
      ...mockConfigFunctions,
      set: async (conf: any) => {
        // Test that the wrapper correctly modifies conf.get
        const configValue = conf.get('config')
        t.equal(
          configValue,
          'user',
          'set wrapper should pass through user config',
        )
        // Test the originalGet.call path by accessing a non-config key
        const otherValue = conf.get('registry')
        t.equal(
          otherValue,
          'test-registry',
          'should call original get for non-config keys',
        )
        return 'set-result'
      },
      del: async (conf: any) => {
        // Test that the wrapper correctly modifies conf.get
        const configValue = conf.get('config')
        t.equal(
          configValue,
          'project',
          'delete wrapper should default all to project',
        )
        // Test the originalGet.call path by accessing a non-config key
        const otherValue = conf.get('registry')
        t.equal(
          otherValue,
          'test-registry',
          'should call original get for non-config keys',
        )
        return 'delete-result'
      },
      edit: async (conf: any) => {
        // Test that the wrapper correctly modifies conf.get
        const configValue = conf.get('config')
        t.equal(
          configValue,
          'user',
          'edit wrapper should pass through user config',
        )
        // Test the originalGet.call path by accessing a non-config key
        const otherValue = conf.get('registry')
        t.equal(
          otherValue,
          'test-registry',
          'should call original get for non-config keys',
        )
        return 'edit-result'
      },
    },
    '@vltpkg/vlt-json': {
      load: () => ({}),
      find: (which: 'user' | 'project') =>
        which === 'user' ?
          '/home/user/.config/vlt/vlt.json'
        : '/project/vlt.json',
    },
  }

  const runWithWrappers = async (
    positionals: string[],
    values: Record<string, any> = {},
  ) => {
    const conf = new MockConfig(positionals, values)
    // Add a registry value to test the originalGet.call path
    conf.values.registry = 'test-registry'
    const cmd = await mockCommand(t, mockForWrappers)
    return cmd.command(conf as unknown as LoadedConfig)
  }

  t.test('set wrapper with --config=user', async t => {
    const result = await runWithWrappers(['set', 'key=value'], {
      config: 'user',
    })
    t.equal(result, 'set-result')
  })

  t.test(
    'delete wrapper with --config=all (defaults to project)',
    async t => {
      const result = await runWithWrappers(['delete', 'key'], {
        config: 'all',
      })
      t.equal(result, 'delete-result')
    },
  )

  t.test('edit wrapper with --config=user', async t => {
    const result = await runWithWrappers(['edit'], { config: 'user' })
    t.equal(result, 'edit-result')
  })
})

t.test('getWriteConfigOption edge cases', async t => {
  // Test the return statement when config is not 'all' (lines 457-458)
  const mockForConfigOption = {
    '@vltpkg/config': {
      ...mockConfigFunctions,
      set: async (conf: any) => {
        // This will test the non-'all' path in getWriteConfigOption
        const configValue = conf.get('config')
        t.equal(
          configValue,
          'user',
          'should return user when config is user',
        )
        return 'set-with-user'
      },
    },
    '@vltpkg/vlt-json': {
      load: () => ({}),
      find: (which: 'user' | 'project') =>
        which === 'user' ?
          '/home/user/.config/vlt/vlt.json'
        : '/project/vlt.json',
    },
  }

  const runWithConfigOption = async (
    positionals: string[],
    values: Record<string, any> = {},
  ) => {
    const conf = new MockConfig(positionals, values)
    const cmd = await mockCommand(t, mockForConfigOption)
    return cmd.command(conf as unknown as LoadedConfig)
  }

  t.test('set with --config=user (non-all path)', async t => {
    const result = await runWithConfigOption(['set', 'key=value'], {
      config: 'user',
    })
    t.equal(result, 'set-with-user')
  })
})
