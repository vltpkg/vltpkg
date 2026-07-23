import t from 'tap'
import {
  createDiffFilesProvider,
  validateCommitish,
} from '../src/query-diff-files.ts'

t.test('validateCommitish', async t => {
  t.test('accepts valid commitish values', async t => {
    t.equal(validateCommitish('main'), 'main')
    t.equal(validateCommitish('HEAD~1'), 'HEAD~1')
    t.equal(validateCommitish('HEAD^2'), 'HEAD^2')
    t.equal(validateCommitish('abc123def456'), 'abc123def456')
    t.equal(validateCommitish('origin/main'), 'origin/main')
    t.equal(validateCommitish('v1.0.0'), 'v1.0.0')
    t.equal(
      validateCommitish('feature/my-branch'),
      'feature/my-branch',
    )
    t.equal(validateCommitish('refs/tags/v1.0.0'), 'refs/tags/v1.0.0')
    t.equal(validateCommitish('HEAD@{1}'), 'HEAD@{1}')
  })

  t.test('rejects empty commitish', async t => {
    t.throws(() => validateCommitish(''), {
      message: 'Missing commitish argument for :diff() selector',
    })
  })

  t.test('rejects unsafe commitish values', async t => {
    t.throws(() => validateCommitish('main; rm -rf /'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('main && echo pwned'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('$(whoami)'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('main|cat /etc/passwd'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('`id`'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
  })
})

t.test('createDiffFilesProvider', async t => {
  t.test('throws on invalid commitish', async t => {
    const provider = createDiffFilesProvider('/tmp')
    t.throws(() => provider('$(whoami)'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
  })

  t.test('throws when git command fails', async t => {
    const provider = createDiffFilesProvider(
      '/tmp/not-a-git-repo-12345',
    )
    t.throws(() => provider('nonexistent-ref-12345'), {
      message: /Failed to run git diff/,
    })
  })

  t.test('returns changed files from git repo', async t => {
    // Use the actual vltpkg repo for a real test
    const cwd = process.cwd()
    const provider = createDiffFilesProvider(cwd)
    // HEAD compared to itself returns uncommitted changes
    // (may be empty or non-empty depending on working tree)
    const files = provider('HEAD')
    t.ok(files instanceof Set, 'should return a Set')
  })

  t.test('returns non-empty set for actual diff', async t => {
    // Compare HEAD~1 to current — should have at least
    // some changed files in the repo. Skip in shallow
    // clones (CI) where HEAD~1 may not exist.
    const cwd = process.cwd()
    const provider = createDiffFilesProvider(cwd)
    let files: Set<string>
    try {
      files = provider('HEAD~1')
    } catch {
      t.pass('shallow clone — HEAD~1 not available, skipping')
      return
    }
    t.ok(files instanceof Set, 'should return a Set')
    t.ok(files.size > 0, 'should have at least one changed file')
    // All files should be non-empty strings
    for (const file of files) {
      t.ok(file.length > 0, `file path should be non-empty: ${file}`)
    }
  })

  t.test('parses git output with mocked execSync', async t => {
    const { createDiffFilesProvider: mockedCreate } =
      await t.mockImport<typeof import('../src/query-diff-files.ts')>(
        '../src/query-diff-files.ts',
        {
          'node:child_process': {
            execSync: () =>
              'src/index.ts\npackages/a/lib/util.ts\n\n',
          },
        },
      )

    const provider = mockedCreate('/tmp')
    const files = provider('main')
    t.equal(files.size, 2, 'should parse two files')
    t.ok(files.has('src/index.ts'))
    t.ok(files.has('packages/a/lib/util.ts'))
  })

  t.test('caches results per commitish', async t => {
    const cwd = process.cwd()
    const provider = createDiffFilesProvider(cwd)
    const files1 = provider('HEAD')
    const files2 = provider('HEAD')
    t.equal(
      files1,
      files2,
      'should return same Set reference for same commitish',
    )
  })
})
