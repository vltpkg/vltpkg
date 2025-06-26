import t from 'tap'
import { resolve } from 'node:path'
import { packTarball } from '../src/pack-tarball.ts'

t.test('packTarball', async t => {
  const testDir = t.testdir({
    'test-package': {
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for pack functionality',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
      'test.js': '// test file',
      '.gitignore': 'node_modules',
      'node_modules': {
        'some-dep': {
          'index.js': '// should be excluded',
        },
      },
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

  t.test('handles scoped package names correctly', async t => {
    const scopedDir = t.testdir({
      'scoped-package': {
        'package.json': JSON.stringify({
          name: '@myorg/my-package',
          version: '2.0.0',
        }),
      },
    })
    
    const result = await packTarball(resolve(scopedDir, 'scoped-package'))
    t.equal(result.filename, 'myorg-my-package-2.0.0.tgz')
  })

  t.test('uses projectRoot option when provided', async t => {
    const result = await packTarball('test-package', {
      projectRoot: testDir,
    })
    
    t.equal(result.manifest.name, '@test/package')
    t.equal(result.manifest.version, '1.2.3')
  })
})