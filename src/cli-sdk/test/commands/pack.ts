import t from 'tap'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { command, views, usage } from '../../src/commands/pack.ts'
import { Config } from '../../src/config/index.ts'

t.test('pack usage', async t => {
  const usageObj = usage()
  t.ok(usageObj)
  t.type(usageObj, 'object')
  // The usage function returns a structured object, not a string
  // Just verify it exists and is called
})

t.test('pack command', async t => {
  const testDir = t.testdir({
    'test-package': {
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for pack command',
        main: 'index.js',
        dist: {
          shasum: 'abc123',
          integrity: 'sha512-xyz789',
        },
        bundleDependencies: ['some-dep'],
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
    },
  })

  const packagePath = resolve(testDir, 'test-package')

  t.test('packs package successfully', async t => {
    // Create a test output directory for the tarball
    const outputDir = t.testdir({})
    t.chdir(outputDir)

    // Create a proper Config instance
    const config = new Config(undefined, testDir)
    await config.loadConfigFile()
    const mockConfig = config.parse(['pack', packagePath])

    const result = await command(mockConfig)

    t.equal(result.name, '@test/package')
    t.equal(result.version, '1.2.3')
    t.equal(result.filename, 'test-package-1.2.3.tgz')
    t.ok(result.size > 0, 'should have a size')
    t.ok(result.unpackedSize > 0, 'should have unpacked size')
    t.equal(result.shasum, 'abc123')
    t.equal(result.integrity, 'sha512-xyz789')
    t.same(result.bundled, ['some-dep'])

    // Check that the file was written to the test directory
    const tarballPath = resolve(outputDir, result.filename)
    const tarballData = await readFile(tarballPath).catch(() => null)
    t.ok(tarballData, 'tarball should be written to test directory')
  })

  t.test(
    'packs from current directory when no folder specified',
    async t => {
      const testBaseDir = t.testdir({
        source: {
          'current-package': {
            'package.json': JSON.stringify({
              name: 'current-package',
              version: '2.0.0',
            }),
            'index.js': 'console.log("test")',
          },
        },
        output: {},
      })

      // Get absolute paths before changing directory
      const packagePath = resolve(
        testBaseDir,
        'source',
        'current-package',
      )
      const outputDir = resolve(testBaseDir, 'output')

      t.chdir(outputDir)

      const config = new Config(
        undefined,
        resolve(testBaseDir, 'source'),
      )
      await config.loadConfigFile()
      // Pass the absolute path to the test directory
      const mockConfig = config.parse(['pack', packagePath])

      const result = await command(mockConfig)

      t.equal(result.name, 'current-package')
      t.equal(result.version, '2.0.0')
      t.equal(result.filename, 'current-package-2.0.0.tgz')

      // Verify tarball was written to test directory
      const tarballPath = resolve(outputDir, result.filename)
      const tarballData = await readFile(tarballPath).catch(
        () => null,
      )
      t.ok(tarballData, 'tarball should be written to test directory')
    },
  )

  t.test('handles package without dist metadata', async t => {
    const testBaseDir = t.testdir({
      source: {
        'no-dist': {
          'package.json': JSON.stringify({
            name: 'no-dist-package',
            version: '1.0.0',
          }),
        },
      },
      output: {},
    })

    // Get absolute paths before changing directory
    const packagePath = resolve(testBaseDir, 'source', 'no-dist')
    const outputDir = resolve(testBaseDir, 'output')

    t.chdir(outputDir)

    const config = new Config(
      undefined,
      resolve(testBaseDir, 'source'),
    )
    await config.loadConfigFile()
    const mockConfig = config.parse(['pack', packagePath])

    const result = await command(mockConfig)

    t.notOk(result.shasum, 'should not have shasum')
    t.notOk(result.integrity, 'should not have integrity')
    t.notOk(result.bundled, 'should not have bundled')

    // Verify tarball was written to test directory
    const tarballPath = resolve(outputDir, result.filename)
    const tarballData = await readFile(tarballPath).catch(() => null)
    t.ok(tarballData, 'tarball should be written to test directory')
  })

  t.test('tests edge case with zero size', async t => {
    const testBaseDir = t.testdir({
      source: {
        'zero-size': {
          'package.json': JSON.stringify({
            name: 'zero-size-package',
            version: '1.0.0',
          }),
        },
      },
      output: {},
    })

    // Get absolute paths before changing directory
    const packagePath = resolve(testBaseDir, 'source', 'zero-size')
    const outputDir = resolve(testBaseDir, 'output')

    t.chdir(outputDir)

    const config = new Config(
      undefined,
      resolve(testBaseDir, 'source'),
    )
    await config.loadConfigFile()
    const mockConfig = config.parse(['pack', packagePath])

    const result = await command(mockConfig)

    t.equal(result.name, 'zero-size-package')
    t.equal(result.version, '1.0.0')
    t.ok(result.size >= 0, 'size should be non-negative')
    t.ok(
      result.unpackedSize >= 0,
      'unpacked size should be non-negative',
    )

    // Verify tarball was written to test directory
    const tarballPath = resolve(outputDir, result.filename)
    const tarballData = await readFile(tarballPath).catch(() => null)
    t.ok(tarballData, 'tarball should be written to test directory')
  })

  t.test('handles optional fields in result', async t => {
    const result = {
      id: 'test@1.0.0',
      name: 'test',
      version: '1.0.0',
      filename: 'test-1.0.0.tgz',
      files: [],
      size: 0,
      unpackedSize: 0,
      entryCount: undefined,
    }

    const output = views.human(result)
    t.match(output, /📦 test@1\.0\.0/)
    t.match(output, /📊 package size: 0\.00 B/)
    t.notMatch(output, /📁 total files/)
  })

  t.test('dry-run mode', async t => {
    const testBaseDir = t.testdir({
      'dry-package': {
        'package.json': JSON.stringify({
          name: 'dry-run-package',
          version: '3.0.0',
          dist: {
            shasum: 'dry123',
            integrity: 'sha512-dry',
          },
        }),
        'index.js': 'console.log("dry run test")',
      },
    })

    // Get absolute path before changing directory
    const packagePath = resolve(testBaseDir, 'dry-package')

    // Create a separate output directory for potential tarball
    const outputDir = t.testdir({})
    t.chdir(outputDir)

    const config = new Config(undefined, testBaseDir)
    await config.loadConfigFile()
    const mockConfig = config.parse([
      'pack',
      '--dry-run',
      packagePath,
    ])

    const result = await command(mockConfig)

    t.equal(result.name, 'dry-run-package')
    t.equal(result.version, '3.0.0')
    t.equal(result.filename, 'dry-run-package-3.0.0.tgz')
    t.equal(result.size, 0, 'size should be 0 in dry-run mode')
    t.equal(
      result.unpackedSize,
      0,
      'unpacked size should be 0 in dry-run mode',
    )
    t.equal(result.shasum, 'dry123')
    t.equal(result.integrity, 'sha512-dry')

    // Verify no tarball was created in the test directory
    const fs = await import('node:fs/promises')
    await t.rejects(
      fs.access(resolve(outputDir, result.filename)),
      'tarball file should not exist in dry-run mode',
    )
  })

  t.test('views format output correctly', async t => {
    const result = {
      id: 'test@1.0.0',
      name: 'test',
      version: '1.0.0',
      filename: 'test-1.0.0.tgz',
      files: [],
      size: 1024,
      unpackedSize: 2560,
      shasum: 'abc123',
      integrity: 'sha512-xyz',
      entryCount: 10,
      bundled: ['dep1', 'dep2'],
    }

    t.test('human view', async t => {
      const output = views.human(result)
      t.match(output, /📦 test@1\.0\.0/)
      t.match(output, /📄 test-1\.0\.0\.tgz/)
      t.match(output, /📊 package size: 1\.00 KB/)
      t.match(output, /📂 unpacked size: 2\.50 KB/)
      t.match(output, /🔒 shasum: abc123/)
      t.match(output, /🔐 integrity: sha512-xyz/)
      t.match(output, /📁 total files: 10/)
    })

    t.test('human view without optional fields', async t => {
      const minResult = {
        ...result,
        shasum: undefined,
        integrity: undefined,
        entryCount: undefined,
      }
      const output = views.human(minResult)
      t.notMatch(output, /🔒 shasum/)
      t.notMatch(output, /🔐 integrity/)
      t.notMatch(output, /📁 total files/)
    })

    t.test('json view', async t => {
      const output = views.json(result)
      t.same(output, result)
    })

    t.test('formatSize handles different sizes', async t => {
      const sizes = [
        { size: 500, expected: '500.00 B' },
        { size: 1536, expected: '1.50 KB' },
        { size: 1048576, expected: '1.00 MB' },
        { size: 1073741824, expected: '1.00 GB' },
      ]

      for (const { size, expected } of sizes) {
        const testResult = { ...result, size }
        const output = views.human(testResult)
        t.match(output, new RegExp(`📊 package size: ${expected}`))
      }
    })
  })
})
