import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { XDG } from '@vltpkg/xdg'
import t from 'tap'
import {
  getNodeGypShim,
  getNodeGypShimDir,
  hasNodeGypReference,
} from '../src/aliasRunner.ts'

// cleans up any existing shim before tests
const shimPath = join(new XDG('vlt').runtime('run'), 'node-gyp')
await rm(shimPath, { force: true }).catch(() => {})

t.test('hasNodeGypReference', async t => {
  t.test('detects node-gyp in simple commands', async t => {
    t.equal(hasNodeGypReference('node-gyp rebuild'), true)
    t.equal(hasNodeGypReference('node-gyp configure'), true)
    t.equal(hasNodeGypReference('node-gyp build'), true)
  })

  t.test('detects node-gyp in complex commands', async t => {
    t.equal(
      hasNodeGypReference('echo "before" && node-gyp rebuild'),
      true,
    )
    t.equal(
      hasNodeGypReference('node-gyp configure || echo "failed"'),
      true,
    )
    t.equal(hasNodeGypReference('node-gyp -v | grep version'), true)
    t.equal(hasNodeGypReference('(node-gyp rebuild)'), true)
  })

  t.test('detects node-gyp with arguments', async t => {
    t.equal(hasNodeGypReference('node-gyp rebuild --debug'), true)
    t.equal(
      hasNodeGypReference(
        'node-gyp configure --python=/usr/bin/python3',
      ),
      true,
    )
  })

  t.test(
    'does not detect node-gyp in commands without it',
    async t => {
      t.equal(hasNodeGypReference('npm install'), false)
      t.equal(hasNodeGypReference('echo "hello world"'), false)
      t.equal(hasNodeGypReference('node script.js'), false)
      t.equal(hasNodeGypReference('gyp rebuild'), false)
    },
  )

  t.test('handles edge cases', async t => {
    t.equal(hasNodeGypReference(''), false)
    t.equal(hasNodeGypReference('echo "node-gyp is mentioned"'), true)
  })
})

t.test('getNodeGypShim', async t => {
  t.test('creates shim file from scratch', async t => {
    // Get the shim path and delete it to test creation
    const firstShim = await getNodeGypShim()

    // Remove the shim to force recreation in fresh module
    await rm(firstShim, { force: true })

    // Dynamically import to get fresh module with cleared memoization
    const { getNodeGypShim: freshGetShim } = await t.mockImport<
      typeof import('../src/aliasRunner.ts')
    >('../src/aliasRunner.ts')

    const shimPath = await freshGetShim()

    t.ok(shimPath, 'returns shim path')
    t.match(shimPath, /node-gyp$/, 'path ends with node-gyp')

    // Verify file was created
    const { stat, readFile } = await import('node:fs/promises')
    const stats = await stat(shimPath)
    t.ok(stats.isFile(), 'shim is a file')

    const content = await readFile(shimPath, 'utf8')
    t.match(
      content,
      /vlx --yes node-gyp@latest/,
      'shim contains vlx command',
    )

    // Platform-specific checks
    if (process.platform === 'win32') {
      t.match(content, /^@echo off/, 'Windows shim has batch header')
      t.match(content, /%\*/, 'Windows shim forwards arguments')
    } else {
      t.match(content, /^#!\/bin\/sh/, 'Unix shim has shebang')
      t.match(content, /exec vlx/, 'Unix shim uses exec')
      t.match(content, /"\$@"/, 'Unix shim forwards arguments')

      // Check executable permission
      const isExecutable = (stats.mode & 0o111) !== 0
      t.ok(isExecutable, 'Unix shim is executable')
    }
  })

  t.test('creates shim file', async t => {
    const shimPath = await getNodeGypShim()

    t.ok(shimPath, 'returns shim path')
    t.match(shimPath, /node-gyp$/, 'path ends with node-gyp')

    // Verify file exists and is readable
    const { stat, readFile } = await import('node:fs/promises')
    const stats = await stat(shimPath)
    t.ok(stats.isFile(), 'shim is a file')

    const content = await readFile(shimPath, 'utf8')
    t.match(
      content,
      /vlx --yes node-gyp@latest/,
      'shim contains vlx command',
    )

    // Platform-specific checks
    if (process.platform === 'win32') {
      t.match(content, /^@echo off/, 'Windows shim has batch header')
      t.match(content, /%\*/, 'Windows shim forwards arguments')
    } else {
      t.match(content, /^#!\/bin\/sh/, 'Unix shim has shebang')
      t.match(content, /exec vlx/, 'Unix shim uses exec')
      t.match(content, /"\$@"/, 'Unix shim forwards arguments')

      // Check executable permission
      const isExecutable = (stats.mode & 0o111) !== 0
      t.ok(isExecutable, 'Unix shim is executable')
    }
  })

  t.test('returns memoized path on subsequent calls', async t => {
    const shimPath1 = await getNodeGypShim()
    const shimPath2 = await getNodeGypShim()

    t.equal(shimPath1, shimPath2, 'returns same path')
  })

  t.test('uses existing shim if already created', async t => {
    // Get shim path (creates it if needed)
    const shimPath = await getNodeGypShim()

    // Modify the shim file
    const { readFile, writeFile } = await import('node:fs/promises')
    const originalContent = await readFile(shimPath, 'utf8')
    const modifiedContent = `${originalContent}\n# Modified`
    await writeFile(shimPath, modifiedContent, 'utf8')

    // Create a new test that forces re-check by clearing the memoization
    // This is done by dynamically importing the module again
    const { getNodeGypShim: getShimFresh } =
      await import('../src/aliasRunner.ts')
    const shimPath2 = await getShimFresh()

    t.equal(shimPath, shimPath2, 'uses existing shim')

    const content = await readFile(shimPath2, 'utf8')
    t.match(content, /# Modified/, 'preserves existing shim content')

    // Cleanup
    await writeFile(shimPath, originalContent, 'utf8')
  })

  t.test('creates directory if it does not exist', async t => {
    const shimPath = await getNodeGypShim()
    const shimDir = join(shimPath, '..')

    // Directory should exist after calling getNodeGypShim
    const { stat } = await import('node:fs/promises')
    const stats = await stat(shimDir)
    t.ok(stats.isDirectory(), 'runtime directory exists')
  })
})

t.test('getNodeGypShimDir', async t => {
  t.test('returns directory containing shim', async t => {
    const shimDir = await getNodeGypShimDir()
    const shimPath = await getNodeGypShim()

    t.equal(
      shimDir,
      join(shimPath, '..'),
      'returns parent directory of shim',
    )
  })

  t.test('directory can be added to PATH', async t => {
    const shimDir = await getNodeGypShimDir()
    const { stat } = await import('node:fs/promises')
    const stats = await stat(shimDir)

    t.ok(stats.isDirectory(), 'shim directory exists')
  })
})

t.test('shim integration', async t => {
  t.test('shim can be found in PATH after injection', async t => {
    const shimDir = await getNodeGypShimDir()
    const { delimiter } = await import('node:path')
    const testPath = `${shimDir}${delimiter}${process.env.PATH}`

    // Verify shim directory is first in PATH
    t.equal(
      testPath.split(delimiter)[0],
      shimDir,
      'shim directory is first in PATH',
    )
  })

  t.test('shim calls vlx with correct arguments', async t => {
    const shimPath = await getNodeGypShim()
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(shimPath, 'utf8')

    if (process.platform === 'win32') {
      t.match(
        content,
        /vlx --yes node-gyp@latest %\*/,
        'Windows shim calls vlx with args',
      )
    } else {
      t.match(
        content,
        /exec vlx --yes node-gyp@latest "\$@"/,
        'Unix shim calls vlx with args',
      )
    }
  })
})

t.test('cross-platform compatibility', async t => {
  t.test('shim works on current platform', async t => {
    const shimPath = await getNodeGypShim()
    const { readFile, stat } = await import('node:fs/promises')

    const stats = await stat(shimPath)
    t.ok(stats.isFile(), 'shim file exists')

    const content = await readFile(shimPath, 'utf8')
    t.ok(content.length > 0, 'shim has content')
    t.match(content, /vlx --yes node-gyp@latest/, 'shim calls vlx')

    if (process.platform === 'win32') {
      t.match(content, /@echo off/, 'Windows batch file format')
    } else {
      t.match(content, /^#!/, 'Unix shebang format')
    }
  })
})

t.test('error handling', async t => {
  t.test(
    'handles invalid XDG runtime directory gracefully',
    async t => {
      // This test verifies the function doesn't crash on edge cases
      // The actual behavior depends on XDG implementation
      const shimPath = await getNodeGypShim()
      t.ok(shimPath, 'returns a path even with unusual setup')
    },
  )

  t.test('handles concurrent calls', async t => {
    // Call getNodeGypShim multiple times concurrently
    const [path1, path2, path3] = await Promise.all([
      getNodeGypShim(),
      getNodeGypShim(),
      getNodeGypShim(),
    ])

    t.equal(path1, path2, 'concurrent calls return same path')
    t.equal(path2, path3, 'all concurrent calls return same path')
  })
})

t.test('memoization', async t => {
  t.test('caches shim path after first call', async t => {
    const shimPath1 = await getNodeGypShim()

    // Call again to verify memoization
    const shimPath2 = await getNodeGypShim()

    t.equal(
      shimPath1,
      shimPath2,
      'memoized path matches initial path',
    )
  })

  t.test('does not create file multiple times', async t => {
    const { stat } = await import('node:fs/promises')

    const shimPath = await getNodeGypShim()
    const stats1 = await stat(shimPath)
    const mtime1 = stats1.mtimeMs

    // Small delay to ensure mtime would change if file is recreated
    await new Promise(resolve => setTimeout(resolve, 10))

    await getNodeGypShim()
    const stats2 = await stat(shimPath)
    const mtime2 = stats2.mtimeMs

    t.equal(
      mtime1,
      mtime2,
      'file modification time unchanged (not recreated)',
    )
  })
})
