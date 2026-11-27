import { execFileSync } from 'node:child_process'
import { renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

  t.test('paths are relative to the project root', async t => {
    const dir = t.testdir({
      other: { 'index.js': '' },
      project: {
        'package.json': '{}',
        packages: {
          a: { 'moved.js': 'export const moved = true\n' },
          b: { 'index.js': '' },
          c: { 'café.js': '', ' spaces .js': '' },
          d: { 'index.js': '' },
        },
        // same name as the branch below
        base: '',
      },
    })
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: dir, stdio: 'pipe' })
    git('init', '-q')
    git('config', 'user.name', 'vlt')
    git('config', 'user.email', 'vlt@example.com')
    git('config', 'commit.gpgsign', 'false')
    git('config', 'core.quotePath', 'true')
    git('config', 'diff.renames', 'true')
    git('add', '.')
    git('commit', '-q', '-m', 'base')
    git('branch', 'base')

    const project = resolve(dir, 'project')
    const packages = resolve(project, 'packages')
    renameSync(
      resolve(packages, 'a/moved.js'),
      resolve(packages, 'b/moved.js'),
    )
    writeFileSync(resolve(packages, 'c/café.js'), '1')
    writeFileSync(resolve(packages, 'c/ spaces .js'), '1')
    writeFileSync(resolve(dir, 'other/index.js'), '1')
    git('add', '.')
    git('commit', '-q', '-m', 'change')

    t.strictSame(
      [...createDiffFilesProvider(project)('base')].sort(),
      [
        'packages/a/moved.js',
        'packages/b/moved.js',
        'packages/c/ spaces .js',
        'packages/c/café.js',
      ],
    )
  })

  t.test('parses git output with mocked execSync', async t => {
    const { createDiffFilesProvider: mockedCreate } =
      await t.mockImport<typeof import('../src/query-diff-files.ts')>(
        '../src/query-diff-files.ts',
        {
          'node:child_process': {
            execSync: () => 'src/index.ts\0packages/a/lib/util.ts\0',
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
