import t from 'tap'
import { resolve } from 'node:path'
import { readFile, access } from 'node:fs/promises'
import { command, views, usage } from '../../src/commands/pack.ts'
import type { CommandResultSingle } from '../../src/commands/pack.ts'
import { PackageJson } from '@vltpkg/package-json'

const makeTestConfig = (config: any) => ({
  ...config,
  get: (key: string) => config.values?.[key],
})

t.test('usage', async t => {
  t.matchSnapshot(usage().usage())
})

t.test('command', async t => {
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
      'vlt.json': '{}',
    })
    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    const result = (await command(config)) as CommandResultSingle

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

    const tarballPath = resolve(dir, result.filename)
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
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    const result = (await command(config)) as CommandResultSingle

    t.equal(result.name, 'current-package')
    t.equal(result.version, '2.0.0')
    t.equal(result.filename, 'current-package-2.0.0.tgz')

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
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    const result = (await command(config)) as CommandResultSingle

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
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['pack'],
    })

    const result = (await command(config)) as CommandResultSingle

    t.equal(result.name, 'minimal-package')
    t.equal(result.version, '1.0.0')
    t.ok(result.size > 0, 'size should be positive')
    t.ok(
      result.unpackedSize >= 0,
      'unpacked size should be non-negative',
    )

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
      'vlt.json': '{}',
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

    const result = (await command(config)) as CommandResultSingle

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

    await t.rejects(
      access(resolve(dir, result.filename)),
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
      t.match(output, /📦 Package: test@1\.0\.0/)
      t.match(output, /📄 File: test-1\.0\.0\.tgz/)
      t.match(output, /📁 3 Files/)
      t.match(output, /package\.json/)
      t.match(output, /index\.js/)
      t.match(output, /README\.md/)
      t.match(output, /📊 Package Size: 1\.02 kB/)
      t.match(output, /📂 Unpacked Size: 2\.56 kB/)
      t.match(
        output,
        /🔒 Shasum: abc123def456abc123def456abc123def456abc123/,
      )
      t.match(output, /🔐 Integrity: sha512-xyz789/)
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
