import t from 'tap'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { packTarball } from '../src/pack-tarball.ts'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import type { LoadedConfig } from '../src/config/index.ts'

// Helper to create a mock LoadedConfig for tests
const createMockConfig = (testdir: string): LoadedConfig => {
  const packageJson = new PackageJson()
  const scurry = new PathScurry(testdir)

  return {
    options: {
      monorepo: undefined,
      catalog: {},
      catalogs: {},
      packageJson,
      scurry,
      projectRoot: testdir,
      packageInfo: {} as any,
    },
    get: () => undefined,
    getRecord: () => ({}),
    jack: {} as any,
    values: {} as any,
    positionals: [],
    command: {} as any,
    commandValues: {},
  } as unknown as LoadedConfig
}

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
      node_modules: {
        'some-dep': {
          'index.js': '// should be excluded',
        },
      },
    },
  })

  const packagePath = resolve(testDir, 'test-package')
  const manifestContent = await readFile(
    resolve(packagePath, 'package.json'),
    'utf8',
  )
  const manifest = JSON.parse(manifestContent)
  const config = createMockConfig(testDir)

  t.test('creates tarball with correct filename', async t => {
    const result = await packTarball(manifest, packagePath, config)

    t.equal(result.name, '@test/package')
    t.equal(result.version, '1.2.3')
    t.equal(result.filename, 'test-package-1.2.3.tgz')
    t.ok(result.tarballData, 'should have tarball data')
    t.ok(result.tarballData.length > 0, 'tarball should not be empty')
    t.ok(result.unpackedSize >= 0, 'should have unpacked size')
    t.ok(Array.isArray(result.files), 'should have files array')
    t.ok(result.files.length >= 0, 'should have files array')
    t.ok(result.integrity, 'should have integrity hash')
    t.ok(result.shasum, 'should have shasum')
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
  })

  t.test('throws error if manifest missing name', async t => {
    const badManifest = { version: '1.0.0' }
    await t.rejects(
      packTarball(badManifest as any, packagePath, config),
      /Package must have a name and version/,
    )
  })

  t.test('throws error if manifest missing version', async t => {
    const badManifest = { name: 'bad-package' }
    await t.rejects(
      packTarball(badManifest as any, packagePath, config),
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
        'index.js': 'console.log("scoped");',
      },
    })

    const scopedPath = resolve(scopedDir, 'scoped-package')
    const scopedManifestContent = await readFile(
      resolve(scopedPath, 'package.json'),
      'utf8',
    )
    const scopedManifest = JSON.parse(scopedManifestContent)
    const scopedConfig = createMockConfig(scopedDir)

    const result = await packTarball(
      scopedManifest,
      scopedPath,
      scopedConfig,
    )
    t.equal(result.filename, 'myorg-my-package-2.0.0.tgz')
  })

  t.test('creates tarball with minimal files', async t => {
    // Create a minimal directory with just package.json
    const minimalDir = t.testdir({
      minimal: {
        'package.json': JSON.stringify({
          name: 'minimal-package',
          version: '1.0.0',
        }),
      },
    })

    const minimalPath = resolve(minimalDir, 'minimal')
    const minimalManifestContent = await readFile(
      resolve(minimalPath, 'package.json'),
      'utf8',
    )
    const minimalManifest = JSON.parse(minimalManifestContent)
    const minimalConfig = createMockConfig(minimalDir)

    const result = await packTarball(
      minimalManifest,
      minimalPath,
      minimalConfig,
    )
    t.ok(result.tarballData, 'should create tarball')
    t.ok(result.tarballData.length > 0, 'tarball should not be empty')
    t.ok(
      result.files.includes('package.json'),
      'should include package.json',
    )
  })

  t.test('filter excludes all patterns correctly', async t => {
    // Create a directory with all excluded file types
    const excludeDir = t.testdir({
      'exclude-test': {
        'package.json': JSON.stringify({
          name: 'exclude-test',
          version: '1.0.0',
        }),
        '.git': {
          config: 'git config',
        },
        node_modules: {
          dep: {
            'index.js': 'module',
          },
        },
        '.nyc_output': {
          'data.json': '{}',
        },
        coverage: {
          'lcov.info': 'coverage data',
        },
        '.vscode': {
          'settings.json': '{}',
        },
        '.idea': {
          'workspace.xml': '<xml/>',
        },
        '.DS_Store': 'mac file',
        '.gitignore': 'node_modules',
        '.npmignore': 'test',
        '.editorconfig': 'config',
        'backup~': 'backup',
        'file.swp': 'swap',
        'index.js': 'console.log("included")',
      },
    })

    const excludePath = resolve(excludeDir, 'exclude-test')
    const excludeManifestContent = await readFile(
      resolve(excludePath, 'package.json'),
      'utf8',
    )
    const excludeManifest = JSON.parse(excludeManifestContent)
    const excludeConfig = createMockConfig(excludeDir)

    const result = await packTarball(
      excludeManifest,
      excludePath,
      excludeConfig,
    )
    t.ok(result.tarballData, 'should create tarball')

    // Check files list directly from result
    const filesInTarball = result.files

    // Should include package.json and index.js
    t.ok(
      filesInTarball.includes('package.json'),
      'package.json included',
    )
    t.ok(filesInTarball.includes('index.js'), 'index.js included')

    // Should exclude all the patterns
    t.notOk(
      filesInTarball.some(f => f.startsWith('.git/')),
      '.git excluded',
    )
    t.notOk(
      filesInTarball.some(f => f.startsWith('node_modules/')),
      'node_modules excluded',
    )
    t.notOk(
      filesInTarball.some(f => f.startsWith('.nyc_output/')),
      '.nyc_output excluded',
    )
    t.notOk(
      filesInTarball.some(f => f.startsWith('coverage/')),
      'coverage excluded',
    )
    t.notOk(
      filesInTarball.some(f => f.startsWith('.vscode/')),
      '.vscode excluded',
    )
    t.notOk(
      filesInTarball.some(f => f.startsWith('.idea/')),
      '.idea excluded',
    )
    t.notOk(
      filesInTarball.includes('.DS_Store'),
      '.DS_Store excluded',
    )
    t.notOk(
      filesInTarball.includes('.gitignore'),
      '.gitignore excluded',
    )
    t.notOk(
      filesInTarball.includes('.npmignore'),
      '.npmignore excluded',
    )
    t.notOk(
      filesInTarball.includes('.editorconfig'),
      '.editorconfig excluded',
    )
    t.notOk(filesInTarball.includes('backup~'), 'backup~ excluded')
    t.notOk(filesInTarball.includes('file.swp'), 'file.swp excluded')
  })

  t.test('respects files field in package.json', async t => {
    // Create directory with files field
    const filesDir = t.testdir({
      'files-test': {
        'package.json': JSON.stringify({
          name: 'files-test',
          version: '1.0.0',
          files: ['lib/', 'bin/'],
        }),
        lib: {
          'index.js': 'console.log("lib");',
          'helper.js': 'console.log("helper");',
        },
        bin: {
          'cli.js': '#!/usr/bin/env node',
        },
        src: {
          'dev.js': 'console.log("dev");',
        },
        test: {
          'test.js': 'console.log("test");',
        },
      },
    })

    const filesPath = resolve(filesDir, 'files-test')
    const filesManifestContent = await readFile(
      resolve(filesPath, 'package.json'),
      'utf8',
    )
    const filesManifest = JSON.parse(filesManifestContent)
    const filesConfig = createMockConfig(filesDir)

    const result = await packTarball(
      filesManifest,
      filesPath,
      filesConfig,
    )
    t.ok(result.tarballData, 'should create tarball')

    const filesInTarball = result.files

    // Should include files from specified directories
    t.ok(
      filesInTarball.includes('package.json'),
      'package.json included',
    )
    t.ok(
      filesInTarball.some(f => f.startsWith('lib/')),
      'lib/ files included',
    )
    t.ok(
      filesInTarball.some(f => f.startsWith('bin/')),
      'bin/ files included',
    )

    // Should exclude files not in files field
    t.notOk(
      filesInTarball.some(f => f.startsWith('src/')),
      'src/ files excluded',
    )
    t.notOk(
      filesInTarball.some(f => f.startsWith('test/')),
      'test/ files excluded',
    )
  })

  t.test('handles empty files field', async t => {
    // Create directory with empty files field
    const emptyDir = t.testdir({
      'empty-files': {
        'package.json': JSON.stringify({
          name: 'empty-files',
          version: '1.0.0',
          files: [],
        }),
        'index.js': 'console.log("should be excluded");',
        'README.md': '# Should be included',
      },
    })

    const emptyPath = resolve(emptyDir, 'empty-files')
    const emptyManifestContent = await readFile(
      resolve(emptyPath, 'package.json'),
      'utf8',
    )
    const emptyManifest = JSON.parse(emptyManifestContent)
    const emptyConfig = createMockConfig(emptyDir)

    const result = await packTarball(
      emptyManifest,
      emptyPath,
      emptyConfig,
    )
    t.ok(result.tarballData, 'should create tarball')

    const filesInTarball = result.files

    // Should only include package.json and always included files
    t.ok(
      filesInTarball.includes('package.json'),
      'package.json included',
    )
    t.ok(
      filesInTarball.includes('README.md'),
      'README.md always included',
    )
    t.notOk(
      filesInTarball.includes('index.js'),
      'index.js excluded by empty files field',
    )
  })

  t.test('handles files field with directory patterns', async t => {
    // Create directory with directory patterns in files field
    const dirDir = t.testdir({
      'dir-pattern': {
        'package.json': JSON.stringify({
          name: 'dir-pattern',
          version: '1.0.0',
          files: ['dist/**'],
        }),
        dist: {
          'index.js': 'console.log("dist");',
          nested: {
            'file.js': 'console.log("nested");',
          },
        },
        src: {
          'index.js': 'console.log("src");',
        },
      },
    })

    const dirPath = resolve(dirDir, 'dir-pattern')
    const dirManifestContent = await readFile(
      resolve(dirPath, 'package.json'),
      'utf8',
    )
    const dirManifest = JSON.parse(dirManifestContent)
    const dirConfig = createMockConfig(dirDir)

    const result = await packTarball(dirManifest, dirPath, dirConfig)
    t.ok(result.tarballData, 'should create tarball')

    const filesInTarball = result.files

    // Should include files from dist directory
    t.ok(
      filesInTarball.includes('package.json'),
      'package.json included',
    )
    t.ok(
      filesInTarball.some(f => f.startsWith('dist/')),
      'dist/ files included',
    )
    t.ok(
      filesInTarball.some(f => f.startsWith('dist/nested/')),
      'nested dist/ files included',
    )

    // Should exclude files not in files field
    t.notOk(
      filesInTarball.some(f => f.startsWith('src/')),
      'src/ files excluded',
    )
  })

  t.test('generates consistent hashes', async t => {
    // Create identical directories
    const hashDir1 = t.testdir({
      'hash-test': {
        'package.json': JSON.stringify({
          name: 'hash-test',
          version: '1.0.0',
        }),
        'index.js': 'console.log("consistent");',
      },
    })

    const hashDir2 = t.testdir({
      'hash-test': {
        'package.json': JSON.stringify({
          name: 'hash-test',
          version: '1.0.0',
        }),
        'index.js': 'console.log("consistent");',
      },
    })

    const hashPath1 = resolve(hashDir1, 'hash-test')
    const hashPath2 = resolve(hashDir2, 'hash-test')

    const manifestContent1 = await readFile(
      resolve(hashPath1, 'package.json'),
      'utf8',
    )
    const manifestContent2 = await readFile(
      resolve(hashPath2, 'package.json'),
      'utf8',
    )

    const manifest1 = JSON.parse(manifestContent1)
    const manifest2 = JSON.parse(manifestContent2)
    const config1 = createMockConfig(hashDir1)
    const config2 = createMockConfig(hashDir2)

    const result1 = await packTarball(manifest1, hashPath1, config1)
    const result2 = await packTarball(manifest2, hashPath2, config2)

    t.equal(
      result1.shasum,
      result2.shasum,
      'shasums should be identical',
    )
    t.equal(
      result1.integrity,
      result2.integrity,
      'integrity hashes should be identical',
    )
  })

  t.test('handles README variations', async t => {
    // Create directory with different README variations
    const readmeDir = t.testdir({
      'readme-test': {
        'package.json': JSON.stringify({
          name: 'readme-test',
          version: '1.0.0',
          files: [],
        }),
        'README.md': '# Main README',
        'readme.txt': '# Alternative README',
        'ReadMe.rst': '# RST README',
      },
    })

    const readmePath = resolve(readmeDir, 'readme-test')
    const readmeManifestContent = await readFile(
      resolve(readmePath, 'package.json'),
      'utf8',
    )
    const readmeManifest = JSON.parse(readmeManifestContent)
    const readmeConfig = createMockConfig(readmeDir)

    const result = await packTarball(
      readmeManifest,
      readmePath,
      readmeConfig,
    )
    t.ok(result.tarballData, 'should create tarball')

    const filesInTarball = result.files

    // Should include all README variations
    t.ok(filesInTarball.includes('README.md'), 'README.md included')
    t.ok(filesInTarball.includes('readme.txt'), 'readme.txt included')
    t.ok(filesInTarball.includes('ReadMe.rst'), 'ReadMe.rst included')
  })
})
