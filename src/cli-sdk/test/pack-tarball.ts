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
      node_modules: {
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
    t.ok(
      result.tarballData!.length > 0,
      'tarball should not be empty',
    )
  })

  t.test('dry run does not create tarball', async t => {
    const result = await packTarball(packagePath, { dry: true })

    t.equal(result.manifest.name, '@test/package')
    t.equal(result.manifest.version, '1.2.3')
    t.equal(result.filename, 'test-package-1.2.3.tgz')
    t.notOk(
      result.tarballData,
      'should not have tarball data in dry run',
    )
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

    const result = await packTarball(
      resolve(scopedDir, 'scoped-package'),
    )
    t.equal(result.filename, 'myorg-my-package-2.0.0.tgz')
  })

  t.test(
    'creates tarball with minimal files to trigger filter',
    async t => {
      // Create a minimal directory with just package.json
      const minimalDir = t.testdir({
        minimal: {
          'package.json': JSON.stringify({
            name: 'minimal-package',
            version: '1.0.0',
          }),
        },
      })

      const result = await packTarball(resolve(minimalDir, 'minimal'))
      t.ok(result.tarballData, 'should create tarball')
      t.ok(
        result.tarballData!.length > 0,
        'tarball should not be empty',
      )
    },
  )

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

    const result = await packTarball(
      resolve(excludeDir, 'exclude-test'),
    )
    t.ok(result.tarballData, 'should create tarball')

    // List files to verify exclusions
    const { list } = await import('tar')
    const filesInTarball: string[] = []
    const stream = await import('node:stream')
    const bufferStream = new stream.PassThrough()
    bufferStream.end(result.tarballData!)

    await new Promise<void>((resolve, reject) => {
      bufferStream
        .pipe(
          list({
            onentry: entry => {
              filesInTarball.push(entry.path.replace(/^[^/]+\//, ''))
            },
          }),
        )
        .on('end', resolve)
        .on('error', reject)
    })

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
    const filesDir = t.testdir({
      'files-test': {
        'package.json': JSON.stringify({
          name: 'files-test',
          version: '1.0.0',
          files: ['src/', 'lib/**/*.js', 'bin/cli.js', 'README.md'],
        }),
        src: {
          'index.js': 'console.log("src file")',
          'utils.js': 'console.log("utils")',
        },
        lib: {
          'main.js': 'console.log("lib main")',
          'helper.js': 'console.log("lib helper")',
          types: {
            'index.d.ts': 'export interface Test {}',
          },
        },
        bin: {
          'cli.js': '#!/usr/bin/env node\nconsole.log("cli")',
        },
        test: {
          'index.test.js': 'console.log("test file")',
        },
        'README.md': '# Files Test Package',
        'CHANGELOG.md': '# Changelog',
        docs: {
          'guide.md': '# Guide',
        },
      },
    })

    const result = await packTarball(resolve(filesDir, 'files-test'))
    t.ok(result.tarballData, 'should create tarball')

    // List files to verify inclusions/exclusions
    const { list } = await import('tar')
    const filesInTarball: string[] = []
    const stream = await import('node:stream')
    const bufferStream = new stream.PassThrough()
    bufferStream.end(result.tarballData!)

    await new Promise<void>((resolve, reject) => {
      bufferStream
        .pipe(
          list({
            onentry: entry => {
              filesInTarball.push(entry.path.replace(/^[^/]+\//, ''))
            },
          }),
        )
        .on('end', resolve)
        .on('error', reject)
    })

    // Should include files specified in files field
    t.ok(
      filesInTarball.includes('package.json'),
      'package.json always included',
    )
    t.ok(
      filesInTarball.includes('src/index.js'),
      'src/ directory included',
    )
    t.ok(
      filesInTarball.includes('src/utils.js'),
      'src/ directory included',
    )
    t.ok(
      filesInTarball.includes('lib/main.js'),
      'lib/**/*.js pattern matched',
    )
    t.ok(
      filesInTarball.includes('lib/helper.js'),
      'lib/**/*.js pattern matched',
    )
    t.ok(
      filesInTarball.includes('bin/cli.js'),
      'specific file included',
    )
    t.ok(
      filesInTarball.includes('README.md'),
      'README.md specified in files',
    )

    // Should exclude files not in files field
    t.notOk(
      filesInTarball.some(f => f.startsWith('test/')),
      'test/ excluded',
    )
    t.notOk(
      filesInTarball.some(f => f.startsWith('docs/')),
      'docs/ excluded',
    )
    t.notOk(
      filesInTarball.includes('lib/types/index.d.ts'),
      '.d.ts not matching *.js pattern',
    )

    // Should include always-included files even if not in files field
    t.ok(
      filesInTarball.includes('CHANGELOG.md'),
      'CHANGELOG always included',
    )
  })

  t.test('handles empty files field', async t => {
    const emptyFilesDir = t.testdir({
      'empty-files': {
        'package.json': JSON.stringify({
          name: 'empty-files',
          version: '1.0.0',
          files: [],
        }),
        src: {
          'index.js': 'console.log("src file")',
        },
        'README.md': '# Empty Files Test',
        LICENSE: 'MIT',
      },
    })

    const result = await packTarball(
      resolve(emptyFilesDir, 'empty-files'),
    )
    t.ok(result.tarballData, 'should create tarball')

    // List files to verify behavior with empty files field
    const { list } = await import('tar')
    const filesInTarball: string[] = []
    const stream = await import('node:stream')
    const bufferStream = new stream.PassThrough()
    bufferStream.end(result.tarballData!)

    await new Promise<void>((resolve, reject) => {
      bufferStream
        .pipe(
          list({
            onentry: entry => {
              filesInTarball.push(entry.path.replace(/^[^/]+\//, ''))
            },
          }),
        )
        .on('end', resolve)
        .on('error', reject)
    })

    // Should still include always-included files
    t.ok(
      filesInTarball.includes('package.json'),
      'package.json always included',
    )
    t.ok(
      filesInTarball.includes('README.md'),
      'README.md always included',
    )
    t.ok(
      filesInTarball.includes('LICENSE'),
      'LICENSE always included',
    )

    // Should exclude other files when files field is empty array
    t.notOk(
      filesInTarball.some(f => f.startsWith('src/')),
      'src/ excluded with empty files',
    )
  })

  t.test('handles files field with directory patterns', async t => {
    const dirPatternDir = t.testdir({
      'dir-pattern': {
        'package.json': JSON.stringify({
          name: 'dir-pattern',
          version: '1.0.0',
          files: ['dist/', 'types/'],
        }),
        dist: {
          'index.js': 'console.log("dist file")',
          'utils.js': 'console.log("dist utils")',
        },
        types: {
          'index.d.ts': 'export interface Test {}',
        },
        src: {
          'index.ts': 'console.log("source file")',
        },
      },
    })

    const result = await packTarball(
      resolve(dirPatternDir, 'dir-pattern'),
    )
    t.ok(result.tarballData, 'should create tarball')

    // List files to verify directory pattern handling
    const { list } = await import('tar')
    const filesInTarball: string[] = []
    const stream = await import('node:stream')
    const bufferStream = new stream.PassThrough()
    bufferStream.end(result.tarballData!)

    await new Promise<void>((resolve, reject) => {
      bufferStream
        .pipe(
          list({
            onentry: entry => {
              filesInTarball.push(entry.path.replace(/^[^/]+\//, ''))
            },
          }),
        )
        .on('end', resolve)
        .on('error', reject)
    })

    // Should include files from specified directories
    t.ok(
      filesInTarball.includes('dist/index.js'),
      'dist/ directory included',
    )
    t.ok(
      filesInTarball.includes('dist/utils.js'),
      'dist/ directory included',
    )
    t.ok(
      filesInTarball.includes('types/index.d.ts'),
      'types/ directory included',
    )

    // Should exclude directories not specified
    t.notOk(
      filesInTarball.some(f => f.startsWith('src/')),
      'src/ excluded',
    )
  })
})
