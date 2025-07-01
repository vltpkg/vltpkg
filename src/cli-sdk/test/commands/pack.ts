import t from 'tap'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { command, views, usage } from '../../src/commands/pack.ts'
import { PackageJson } from '@vltpkg/package-json'

const makeTestConfig = (config: any) => ({
  ...config,
  get: (key: string) => config.values?.[key],
})

t.test('pack usage', async t => {
  const usageObj = usage()
  t.ok(usageObj)
  t.type(usageObj, 'object')
  // The usage function returns a structured object, not a string
  // Just verify it exists and is called
})

t.test('pack command', async t => {
  t.test('packs package successfully', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for pack command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
    })

    const outputDir = t.testdir({})
    t.chdir(outputDir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    const result = await command(config)

    t.equal(result.name, '@test/package')
    t.equal(result.version, '1.2.3')
    t.equal(result.filename, 'test-package-1.2.3.tgz')
    t.ok(result.size > 0, 'should have a size')
    t.ok(result.unpackedSize >= 0, 'should have unpacked size')
    t.ok(result.shasum, 'should have computed shasum')
    t.ok(result.integrity, 'should have computed integrity')
    t.match(
      result.shasum,
      /^[a-f0-9]{40}$/,
      'shasum should be valid SHA1',
    )
    t.match(
      result.integrity,
      /^sha512-/,
      'integrity should be sha512',
    )
    t.ok(Array.isArray(result.files), 'should have files array')
    t.ok(result.files.length >= 0, 'should have files array')

    // Check that the file was written to the current directory (outputDir)
    const tarballPath = resolve(outputDir, result.filename)
    const tarballData = await readFile(tarballPath).catch(() => null)
    t.ok(
      tarballData,
      'tarball should be written to current directory',
    )
  })

  t.test('packs from current directory', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'current-package',
        version: '2.0.0',
      }),
      'index.js': 'console.log("test")',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    const result = await command(config)

    t.equal(result.name, 'current-package')
    t.equal(result.version, '2.0.0')
    t.equal(result.filename, 'current-package-2.0.0.tgz')

    // Verify tarball was written to current directory
    const tarballPath = resolve(dir, result.filename)
    const tarballData = await readFile(tarballPath).catch(() => null)
    t.ok(
      tarballData,
      'tarball should be written to current directory',
    )
  })

  t.test('handles package with computed hashes', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'hash-package',
        version: '1.0.0',
      }),
      'index.js': 'console.log("test");',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    const result = await command(config)

    t.ok(result.shasum, 'should have computed shasum')
    t.ok(result.integrity, 'should have computed integrity')
    t.match(
      result.shasum,
      /^[a-f0-9]{40}$/,
      'shasum should be valid SHA1',
    )
    t.match(
      result.integrity,
      /^sha512-/,
      'integrity should be sha512',
    )

    // Verify tarball was written to current directory
    const tarballPath = resolve(dir, result.filename)
    const tarballData = await readFile(tarballPath).catch(() => null)
    t.ok(
      tarballData,
      'tarball should be written to current directory',
    )
  })

  t.test('handles package with minimal content', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'minimal-package',
        version: '1.0.0',
      }),
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    const result = await command(config)

    t.equal(result.name, 'minimal-package')
    t.equal(result.version, '1.0.0')
    t.ok(result.size > 0, 'size should be positive')
    t.ok(
      result.unpackedSize >= 0,
      'unpacked size should be non-negative',
    )

    // Verify tarball was written to current directory
    const tarballPath = resolve(dir, result.filename)
    const tarballData = await readFile(tarballPath).catch(() => null)
    t.ok(
      tarballData,
      'tarball should be written to current directory',
    )
  })

  t.test('dry-run mode', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'dry-run-package',
        version: '3.0.0',
      }),
      'index.js': 'console.log("dry run test")',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        'dry-run': true,
      },
      positionals: ['pack'],
      values: { 'dry-run': true },
    })

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    // Mock packageJson.find to return the test directory's package.json
    config.options.packageJson.find = () =>
      resolve(dir, 'package.json')

    const result = await command(config)

    t.equal(result.name, 'dry-run-package')
    t.equal(result.version, '3.0.0')
    t.equal(result.filename, 'dry-run-package-3.0.0.tgz')
    // In dry-run mode, we still compute size and hashes but don't write file
    t.ok(
      result.size > 0,
      'size should be computed even in dry-run mode',
    )
    t.ok(result.unpackedSize >= 0, 'unpacked size should be computed')
    t.ok(result.shasum, 'shasum should be computed')
    t.ok(result.integrity, 'integrity should be computed')

    // Verify no tarball was created in the directory
    const fs = await import('node:fs/promises')
    await t.rejects(
      fs.access(resolve(dir, result.filename)),
      'tarball file should not exist in dry-run mode',
    )
  })

  t.test('views format output correctly', async t => {
    const result = {
      id: 'test@1.0.0',
      name: 'test',
      version: '1.0.0',
      filename: 'test-1.0.0.tgz',
      files: ['package.json', 'index.js', 'README.md'],
      size: 1024,
      unpackedSize: 2560,
      shasum: 'abc123def456abc123def456abc123def456abc123',
      integrity: 'sha512-xyz789',
    }

    t.test('human view', async t => {
      const output = views.human(result)
      t.match(output, /📦 test@1\.0\.0/)
      t.match(output, /📄 test-1\.0\.0\.tgz/)
      t.match(output, /📁 3 files/)
      t.match(output, /package\.json/)
      t.match(output, /index\.js/)
      t.match(output, /README\.md/)
      t.match(output, /📊 package size: 1\.02 kB/)
      t.match(output, /📂 unpacked size: 2\.56 kB/)
      t.match(
        output,
        /🔒 shasum: abc123def456abc123def456abc123def456abc123/,
      )
      t.match(output, /🔐 integrity: sha512-xyz789/)
    })

    t.test('human view without optional fields', async t => {
      const minResult = {
        ...result,
        shasum: undefined,
        integrity: undefined,
      }
      const output = views.human(minResult)
      t.notMatch(output, /🔒 shasum/)
      t.notMatch(output, /🔐 integrity/)
    })

    t.test('json view', async t => {
      const output = views.json(result)
      t.same(output, result)
    })
  })
})
