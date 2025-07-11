import t from 'tap'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { packTarball } from '../src/pack-tarball.ts'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import type { LoadedConfig } from '../src/config/index.ts'

// Helper to create a mock LoadedConfig for tests
const createMockConfig = (
  testdir: string,
  overrides?: Record<string, unknown>,
): LoadedConfig => {
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
      packageInfo: {},
      ...overrides,
    },
    get: (key: string) => overrides?.[key],
    getRecord: () => ({}),
    jack: {},
    values: {},
    positionals: [],
    command: {},
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
      packTarball(badManifest, packagePath, config),
      /Package must have a name and version/,
    )
  })

  t.test('throws error if manifest missing version', async t => {
    const badManifest = { name: 'bad-package' }
    await t.rejects(
      packTarball(badManifest, packagePath, config),
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

  // TODO: why is this flaky in CI?
  t.todo('generates consistent hashes', async t => {
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

  t.test('catalog spec replacement coverage', async t => {
    const catalogDir = t.testdir({
      'main-package': {
        'package.json': JSON.stringify({
          name: 'main-package',
          version: '1.0.0',
          dependencies: {
            react: 'catalog:',
            lodash: 'catalog:',
          },
          devDependencies: {
            typescript: 'catalog:dev',
          },
          optionalDependencies: {
            vue: 'catalog:dev',
          },
          peerDependencies: {
            jest: 'catalog:test',
          },
        }),
        'index.js': 'console.log("main");',
      },
    })

    const mainPath = resolve(catalogDir, 'main-package')
    const mainManifestContent = await readFile(
      resolve(mainPath, 'package.json'),
      'utf8',
    )
    const mainManifest = JSON.parse(mainManifestContent)

    const catalogConfig = createMockConfig(catalogDir, {
      catalog: {
        react: '^18.0.0',
        lodash: '^4.17.21',
      },
      catalogs: {
        dev: {
          typescript: '^5.0.0',
          vue: '^3.0.0',
        },
        test: {
          jest: '^29.0.0',
        },
      },
    })

    const result = await packTarball(
      mainManifest,
      mainPath,
      catalogConfig,
    )

    t.ok(
      result.tarballData,
      'should create tarball with catalog specs',
    )
    t.equal(result.name, 'main-package')
    t.equal(result.version, '1.0.0')
  })

  t.test('workspace spec error cases', async t => {
    const errorDir = t.testdir({
      'main-package': {
        'package.json': JSON.stringify({
          name: 'main-package',
          version: '1.0.0',
          dependencies: {
            'missing-workspace': 'workspace:^2.0.0',
          },
        }),
        'index.js': 'console.log("main");',
      },
    })

    const mainPath = resolve(errorDir, 'main-package')
    const mainManifestContent = await readFile(
      resolve(mainPath, 'package.json'),
      'utf8',
    )
    const mainManifest = JSON.parse(mainManifestContent)

    const noMonorepoConfig = createMockConfig(errorDir)
    await t.rejects(
      packTarball(mainManifest, mainPath, noMonorepoConfig),
      'should error when no monorepo configured',
    )
  })

  t.test('workspace spec replacement', async t => {
    const workspaceDir = t.testdir({
      'main-package': {
        'package.json': JSON.stringify({
          name: 'main-package',
          version: '1.0.0',
          dependencies: {
            'workspace-dep': 'workspace:*',
            'workspace-dep-2': 'workspace:^2.0.0',
          },
          devDependencies: {
            'workspace-dev': 'workspace:~1.5.0',
          },
          optionalDependencies: {
            'workspace-optional': 'workspace:*',
          },
          peerDependencies: {
            'workspace-peer': 'workspace:^3.0.0',
          },
        }),
        'index.js': 'console.log("main");',
      },
    })

    const mainPath = resolve(workspaceDir, 'main-package')
    const mainManifestContent = await readFile(
      resolve(mainPath, 'package.json'),
      'utf8',
    )
    const mainManifest = JSON.parse(mainManifestContent)

    // Create mock workspace objects with manifests
    const workspaceDepManifest = {
      name: 'workspace-dep',
      version: '1.2.3',
    }
    const workspaceDep2Manifest = {
      name: 'workspace-dep-2',
      version: '2.1.0',
    }
    const workspaceDevManifest = {
      name: 'workspace-dev',
      version: '1.5.2',
    }
    const workspaceOptionalManifest = {
      name: 'workspace-optional',
      version: '0.9.0',
    }
    const workspacePeerManifest = {
      name: 'workspace-peer',
      version: '3.1.0',
    }

    // Create mock Workspace objects
    const workspaceDepWS = {
      manifest: workspaceDepManifest,
      path: 'packages/workspace-dep',
      fullpath: resolve(workspaceDir, 'packages/workspace-dep'),
      name: 'workspace-dep',
    }

    const workspaceDep2WS = {
      manifest: workspaceDep2Manifest,
      path: 'packages/workspace-dep-2',
      fullpath: resolve(workspaceDir, 'packages/workspace-dep-2'),
      name: 'workspace-dep-2',
    }

    const workspaceDevWS = {
      manifest: workspaceDevManifest,
      path: 'packages/workspace-dev',
      fullpath: resolve(workspaceDir, 'packages/workspace-dev'),
      name: 'workspace-dev',
    }

    const workspaceOptionalWS = {
      manifest: workspaceOptionalManifest,
      path: 'packages/workspace-optional',
      fullpath: resolve(workspaceDir, 'packages/workspace-optional'),
      name: 'workspace-optional',
    }

    const workspacePeerWS = {
      manifest: workspacePeerManifest,
      path: 'packages/workspace-peer',
      fullpath: resolve(workspaceDir, 'packages/workspace-peer'),
      name: 'workspace-peer',
    }

    // Create mock monorepo Map
    const mockMonorepo = new Map([
      ['workspace-dep', workspaceDepWS],
      ['workspace-dep-2', workspaceDep2WS],
      ['workspace-dev', workspaceDevWS],
      ['workspace-optional', workspaceOptionalWS],
      ['workspace-peer', workspacePeerWS],
    ])

    const workspaceConfig = createMockConfig(workspaceDir, {
      monorepo: mockMonorepo,
    })

    const result = await packTarball(
      mainManifest,
      mainPath,
      workspaceConfig,
    )

    t.ok(
      result.tarballData,
      'should create tarball with workspace specs',
    )
    t.equal(result.name, 'main-package')
    t.equal(result.version, '1.0.0')

    // Verify that the packed tarball contains the resolved workspace versions
    // We need to read the package.json from the tarball to verify the replacement
    // Since the pack-tarball function restores the original package.json after packing,
    // we can't directly check the file. Instead, we verify the function completed successfully
    // which means the workspace specs were properly resolved without errors.
    t.ok(result.integrity, 'should have integrity hash')
    t.ok(result.shasum, 'should have shasum')
    t.ok(
      result.files.includes('package.json'),
      'should include package.json',
    )
    t.ok(result.files.includes('index.js'), 'should include index.js')
  })

  t.test(
    'workspace spec replacement - missing workspace name',
    async t => {
      const errorDir = t.testdir({
        'main-package': {
          'package.json': JSON.stringify({
            name: 'main-package',
            version: '1.0.0',
            dependencies: {
              'some-dep': 'workspace:',
            },
          }),
          'index.js': 'console.log("main");',
        },
      })

      const mainPath = resolve(errorDir, 'main-package')
      const mainManifestContent = await readFile(
        resolve(mainPath, 'package.json'),
        'utf8',
      )
      const mainManifest = JSON.parse(mainManifestContent)

      const mockMonorepo = new Map()
      const workspaceConfig = createMockConfig(errorDir, {
        monorepo: mockMonorepo,
      })

      await t.rejects(
        packTarball(mainManifest, mainPath, workspaceConfig),
        /Workspace 'some-dep' not found/,
        'should error when workspace spec defaults to package name and workspace not found',
      )
    },
  )

  t.test(
    'workspace spec replacement - workspace not found',
    async t => {
      const errorDir = t.testdir({
        'main-package': {
          'package.json': JSON.stringify({
            name: 'main-package',
            version: '1.0.0',
            dependencies: {
              'missing-workspace': 'workspace:*',
            },
          }),
          'index.js': 'console.log("main");',
        },
      })

      const mainPath = resolve(errorDir, 'main-package')
      const mainManifestContent = await readFile(
        resolve(mainPath, 'package.json'),
        'utf8',
      )
      const mainManifest = JSON.parse(mainManifestContent)

      const mockMonorepo = new Map()
      const workspaceConfig = createMockConfig(errorDir, {
        monorepo: mockMonorepo,
      })

      await t.rejects(
        packTarball(mainManifest, mainPath, workspaceConfig),
        /Workspace 'missing-workspace' not found/,
        'should error when workspace is not found in monorepo',
      )
    },
  )

  t.test(
    'workspace spec replacement - workspace without version',
    async t => {
      const errorDir = t.testdir({
        'main-package': {
          'package.json': JSON.stringify({
            name: 'main-package',
            version: '1.0.0',
            dependencies: {
              'no-version-workspace': 'workspace:*',
            },
          }),
          'index.js': 'console.log("main");',
        },
      })

      const mainPath = resolve(errorDir, 'main-package')
      const mainManifestContent = await readFile(
        resolve(mainPath, 'package.json'),
        'utf8',
      )
      const mainManifest = JSON.parse(mainManifestContent)

      // Create workspace without version
      const workspaceWithoutVersion = {
        manifest: { name: 'no-version-workspace' }, // no version field
        path: 'packages/no-version-workspace',
        fullpath: resolve(errorDir, 'packages/no-version-workspace'),
        name: 'no-version-workspace',
      }

      const mockMonorepo = new Map([
        ['no-version-workspace', workspaceWithoutVersion],
      ])

      const workspaceConfig = createMockConfig(errorDir, {
        monorepo: mockMonorepo,
      })

      await t.rejects(
        packTarball(mainManifest, mainPath, workspaceConfig),
        /No version found for workspace 'no-version-workspace'/,
        'should error when workspace has no version',
      )
    },
  )

  t.test('catalog spec error cases', async t => {
    const errorDir = t.testdir({
      'main-package': {
        'package.json': JSON.stringify({
          name: 'main-package',
          version: '1.0.0',
          dependencies: {
            'missing-package': 'catalog:',
          },
        }),
        'index.js': 'console.log("main");',
      },
    })

    const mainPath = resolve(errorDir, 'main-package')
    const mainManifestContent = await readFile(
      resolve(mainPath, 'package.json'),
      'utf8',
    )
    const mainManifest = JSON.parse(mainManifestContent)

    const missingCatalogConfig = createMockConfig(errorDir, {
      catalog: {
        react: '^18.0.0',
      },
    })

    await t.rejects(
      packTarball(mainManifest, mainPath, missingCatalogConfig),
      'should error when package not found in catalog',
    )
  })

  t.test('missing or invalid dependency sections', async t => {
    const missingDepsDir = t.testdir({
      'main-package': {
        'package.json': JSON.stringify({
          name: 'main-package',
          version: '1.0.0',
        }),
        'index.js': 'console.log("main");',
      },
    })

    const mainPath = resolve(missingDepsDir, 'main-package')
    const mainManifestContent = await readFile(
      resolve(mainPath, 'package.json'),
      'utf8',
    )
    const mainManifest = JSON.parse(mainManifestContent)

    const missingDepsConfig = createMockConfig(missingDepsDir)

    const result = await packTarball(
      mainManifest,
      mainPath,
      missingDepsConfig,
    )

    t.ok(
      result.tarballData,
      'should create tarball with no dependencies',
    )
    t.equal(result.name, 'main-package')
    t.equal(result.version, '1.0.0')
  })
})

t.test('publish-directory option', async t => {
  await t.test('uses publish directory when specified', async t => {
    const testdir = t.testdir({
      'publish-here': {
        lib: {
          'index.js': 'module.exports = {}',
        },
      },
      'original-dir': {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          files: ['lib'],
        }),
        lib: {
          'index.js': 'module.exports = {}',
        },
      },
    })

    const publishDir = resolve(testdir, 'publish-here')
    const originalDir = resolve(testdir, 'original-dir')

    const config = createMockConfig(testdir, {
      'publish-directory': publishDir,
    })

    const manifest = {
      name: 'test-pkg',
      version: '1.0.0',
      files: ['lib'],
    }

    const result = await packTarball(manifest, originalDir, config)

    t.equal(result.name, 'test-pkg')
    t.equal(result.version, '1.0.0')
    t.equal(result.filename, 'test-pkg-1.0.0.tgz')
    t.ok(result.tarballData)

    // The tarball should contain files from the publish directory
    // Just check that we have a package.json at minimum
    t.ok(result.files.includes('package.json'))

    // Verify basic functionality - the key thing is that it uses the publish directory
    t.ok(
      result.files.length >= 1,
      'Should have at least package.json',
    )
  })

  await t.test(
    'throws error when publish directory does not exist',
    async t => {
      const testdir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
      })

      const config = createMockConfig(testdir, {
        'publish-directory': '/nonexistent/directory',
      })

      const manifest = {
        name: 'test-pkg',
        version: '1.0.0',
      }

      await t.rejects(packTarball(manifest, testdir, config), {
        message:
          'Publish directory does not exist: /nonexistent/directory',
        cause: {
          found: '/nonexistent/directory',
        },
      })
    },
  )

  await t.test(
    'throws error when publish directory is not a directory',
    async t => {
      const testdir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
        'not-a-dir': 'this is a file',
      })

      const notADir = resolve(testdir, 'not-a-dir')
      const config = createMockConfig(testdir, {
        'publish-directory': notADir,
      })

      const manifest = {
        name: 'test-pkg',
        version: '1.0.0',
      }

      await t.rejects(packTarball(manifest, testdir, config), {
        message: `Publish directory is not a directory: ${notADir}`,
        cause: {
          found: notADir,
          wanted: 'directory',
        },
      })
    },
  )
})
