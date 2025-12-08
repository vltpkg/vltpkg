import t from 'tap'
import { stripAbsolutePath } from '../src/strip-absolute-path.ts'

const cases: Record<string, [string, string]> = {
  // Unix absolute paths
  '/': ['/', ''],
  '/foo': ['/', 'foo'],
  '/foo/bar': ['/', 'foo/bar'],

  // Multiple slashes
  '////': ['////', ''],
  '////foo': ['////', 'foo'],
  '//foo//bar//baz': ['//', 'foo//bar//baz'],

  // Windows absolute paths
  'c:///a/b/c': ['c:///', 'a/b/c'],
  'c:\\foo\\bar': ['c:\\', 'foo\\bar'],

  // Windows UNC paths
  '\\\\foo\\bar\\baz': ['\\\\foo\\bar\\', 'baz'],

  // Chained Windows roots
  'c:\\c:\\c:\\c:\\\\d:\\e/f/g': ['c:\\c:\\c:\\c:\\\\d:\\', 'e/f/g'],

  // Windows long path syntax
  '//?/X:/y/z': ['//?/X:/', 'y/z'],
  '\\\\?\\X:\\y\\z': ['\\\\?\\X:\\', 'y\\z'],

  // Drive-relative paths (not absolute but have root)
  'c:foo': ['c:', 'foo'],
  'D:bar': ['D:', 'bar'],
  'c:..\\system\\explorer.exe': ['c:', '..\\system\\explorer.exe'],
  'd:..\\..\\unsafe\\land': ['d:', '..\\..\\unsafe\\land'],

  // Relative paths (no stripping needed)
  foo: ['', 'foo'],
  'foo/bar': ['', 'foo/bar'],
  './foo': ['', './foo'],
  '../foo': ['', '../foo'],
  'package/index.js': ['', 'package/index.js'],
}

for (const [input, [expectedRoot, expectedPath]] of Object.entries(
  cases,
)) {
  t.test(`stripAbsolutePath("${input}")`, t => {
    const [root, path] = stripAbsolutePath(input)
    t.equal(root, expectedRoot, `root should be "${expectedRoot}"`)
    t.equal(path, expectedPath, `path should be "${expectedPath}"`)
    t.end()
  })
}
