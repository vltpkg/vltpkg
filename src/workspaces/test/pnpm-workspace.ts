import t from 'tap'
import {
  parsePnpmWorkspacePackages,
  readPnpmWorkspacePackages,
} from '../src/pnpm-workspace.ts'

t.test('parsePnpmWorkspacePackages', async t => {
  const cases: [string, string, string[] | undefined][] = [
    [
      'block, mixed quotes, comments, other keys',
      `catalog:\n  react: ^18\npackages:\n  - 'packages/*'\n  - "apps/*"   # c\n  # skip\n\n  - '!**/test/**'\n  - tools/x\nonlyBuiltDependencies:\n  - esbuild\n`,
      ['packages/*', 'apps/*', '!**/test/**', 'tools/x'],
    ],
    [
      'crlf, bom, doc start',
      '\uFEFF---\r\npackages:\r\n- a/*\r\n- b\r\n',
      ['a/*', 'b'],
    ],
    ['bom before key', '\uFEFFpackages:\n  - a\n', ['a']],
    ['quoted key', '"packages":\n  - a\n', ['a']],
    ['key comment', 'packages: # c\n  - a', ['a']],
    [
      '# in quotes',
      'packages:\n  - \'a#b\'\n  - "c #d"\n',
      ['a#b', 'c #d'],
    ],
    ["'' escape", "packages:\n  - 'it''s # x'\n", ["it's # x"]],
    ['\\ escape', 'packages:\n  - "a\\\\b"\n', ['a\\b']],
    ['mid-plain quote', "packages:\n  - it's/* # c\n", ["it's/*"]],
    [
      'block plain brackets',
      'packages:\n  - p/[ab]*\n  - p/{a,b}\n',
      ['p/[ab]*', 'p/{a,b}'],
    ],
    [
      'flow',
      `packages: ['a/*', "b/*", c/*,]\n`,
      ['a/*', 'b/*', 'c/*'],
    ],
    ['flow, no eol', 'packages: [a]', ['a']],
    [
      'flow mid-plain quote',
      "packages: [it's/*, b]\n",
      ["it's/*", 'b'],
    ],
    [
      'flow quoted , and []',
      "packages: ['a,b/*', 'p/[ab]*']\n",
      ['a,b/*', 'p/[ab]*'],
    ],
    [
      'root entries dropped',
      "packages: ['.', './', 'a/*']\n",
      ['a/*'],
    ],
    [
      'flow multi-line',
      "packages: [\n  'a/*', # x\n  b/*\n]\ncatalog:\n  x: '1'\n",
      ['a/*', 'b/*'],
    ],
    // undefined: absent, empty, or not confidently parsed
    ['absent', 'catalog:\n  a: 1\n', undefined],
    ['null', 'packages:\ncatalog: {}\n', undefined],
    ['tilde', 'packages: ~\n', undefined],
    ['scalar', "packages: 'a/*'\n", undefined],
    ['anchor', 'packages: &x\n  - a\n', undefined],
    ['dup key', 'packages:\n  - a\npackages:\n  - b\n', undefined],
    ['alias item', 'packages:\n  - *a\n', undefined],
    ['unquoted !', 'packages:\n  - !a\n', undefined],
    ['block scalar', 'packages:\n  - |\n    a\n', undefined],
    ['nested map', 'packages:\n  - a: b\n', undefined],
    ['map item ending :', 'packages:\n  - a:\n', undefined],
    ['continuation', 'packages:\n  - a\n    b\n', undefined],
    ['indent mismatch', 'packages:\n  - a\n   - b\n', undefined],
    ['tab indent', 'packages:\n\t- a\n', undefined],
    ['bare -', 'packages:\n  -\n    a\n', undefined],
    ['col-0 bare -', 'packages:\n- a\n- # c\n', undefined],
    ['unterminated quote', "packages:\n  - 'a\n", undefined],
    ['text after quote', "packages:\n  - 'a' b\n", undefined],
    ['yaml-only escape', 'packages:\n  - "\\x41"\n', undefined],
    ['text after double quote', 'packages:\n  - "a"1\n', undefined],
    ['empty flow', 'packages: []\n', undefined],
    ['unclosed flow', "packages: ['a'\n", undefined],
    ['unclosed flow quote', "packages: ['a\n", undefined],
    ['nested flow', 'packages: [[a]]\n', undefined],
    ['flow map', 'packages: [{a: b}]\n', undefined],
    ['flow empty item', "packages: ['a',,'b']\n", undefined],
    ['flow text after ]', 'packages: [\n  a\n] x\n', undefined],
    ['flow plain {}', 'packages: [a}]\n', undefined],
    ['flow multi-line plain', 'packages: [a\n  b]\n', undefined],
    [
      'root only',
      "packages:\n  - '.'\nonlyBuiltDependencies:\n  - esbuild\n",
      undefined,
    ],
    ['quote after space', "packages:\n  - a 'b # c'\n", undefined],
    ['flow quote after space', "packages: [a 'b, c']\n", undefined],
    ['negation only', "packages: ['.', '!a']\n", undefined],
  ]
  for (const [name, yaml, want] of cases) {
    t.strictSame(parsePnpmWorkspacePackages(yaml), want, name)
  }
})

t.test('readPnpmWorkspacePackages', async t => {
  for (const [name, fixture, want] of [
    [
      'file',
      { 'pnpm-workspace.yaml': 'packages:\n  - a/*\n' },
      ['a/*'],
    ],
    ['missing', {}, undefined],
    ['not a file', { 'pnpm-workspace.yaml': {} }, undefined],
  ] as const) {
    t.test(name, async t => {
      t.strictSame(
        readPnpmWorkspacePackages(t.testdir(fixture)),
        want,
      )
    })
  }
})
