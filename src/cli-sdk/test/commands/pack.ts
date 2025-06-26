import t from 'tap'
import { resolve } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { PackageJson } from '@vltpkg/package-json'
import { packTarball } from '../../src/commands/pack.ts'

t.test('packTarball', async t => {
  const testDir = t.testdir({
    'test-package': {
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for pack command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
    },
  })

  const packagePath = resolve(testDir, 'test-package')

  t.test('creates tarball with correct filename', async t => {
    const result = await packTarball(packagePath)
    
    t.equal(result.manifest.name, '@test/package')
    t.equal(result.manifest.version, '1.2.3')
    t.equal(result.filename, 'test-package-1.2.3.tgz')
    t.ok(result.tarballData, 'should have tarball data')
    t.ok(result.tarballData!.length > 0, 'tarball should not be empty')
  })

  t.test('dry run does not create tarball', async t => {
    const result = await packTarball(packagePath, { dry: true })
    
    t.equal(result.manifest.name, '@test/package')
    t.equal(result.manifest.version, '1.2.3')
    t.equal(result.filename, 'test-package-1.2.3.tgz')
    t.notOk(result.tarballData, 'should not have tarball data in dry run')
  })

  t.test('throws error if package.json missing name', async t => {
    const badDir = t.testdir({
      'bad-package': {
        'package.json': JSON.stringify({
          version: '1.0.0',
        }),
      },
    })
    
    await t.rejects(
      packTarball(resolve(badDir, 'bad-package')),
      /Package must have a name and version/,
    )
  })

  t.test('throws error if package.json missing version', async t => {
    const badDir = t.testdir({
      'bad-package': {
        'package.json': JSON.stringify({
          name: 'bad-package',
        }),
      },
    })
    
    await t.rejects(
      packTarball(resolve(badDir, 'bad-package')),
      /Package must have a name and version/,
    )
  })
})