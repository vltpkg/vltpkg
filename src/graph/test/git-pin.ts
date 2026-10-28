import t from 'tap'
import { gitPinMoved } from '../src/git-pin.ts'

t.test('gitPinMoved', async t => {
  const sha1 = 'a'.repeat(40)
  const sha2 = 'b'.repeat(64)
  const remote = 'git+https://host/o/r.git'
  const archive = 'https://host/o/r/archive/'
  // a 40-hex token in the url, not a commit
  const token = `git+https://u:${sha1}@host/o/r.git`
  for (const [a, b, moved, name] of [
    [
      { integrity: 'sha512-a' },
      { integrity: 'sha512-a' },
      false,
      'same integrity',
    ],
    [
      { integrity: 'sha512-a', resolved: `${remote}#${sha1}` },
      { integrity: 'sha512-b', resolved: `${remote}#${sha1}` },
      true,
      'integrity wins',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      { resolved: `${remote}#${sha1}::path:x` },
      false,
      'same sha',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      { resolved: `${remote}#${sha2}` },
      true,
      'other sha',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      { resolved: remote },
      true,
      'remote only',
    ],
    [
      { resolved: 'github:o/r' },
      { resolved: `${remote}#${sha1}` },
      true,
      'remote only, both ways',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      {},
      false,
      'not resolved yet',
    ],
    [
      { resolved: archive + sha1 },
      { resolved: archive + 'main' },
      false,
      'archive read from node_modules',
    ],
    [
      { resolved: remote },
      { resolved: remote },
      false,
      'no sha at all',
    ],
    [
      { resolved: token },
      { resolved: `${token}#${sha1}` },
      true,
      'token, remote only',
    ],
    [
      { resolved: token },
      { resolved: remote },
      false,
      'token, no sha',
    ],
    [
      { resolved: `${token}#${sha2}::path:${sha1}` },
      { resolved: `${token}#${sha2}` },
      false,
      'token, hex path dir',
    ],
    [
      { resolved: `${remote}#${sha1}-x` },
      { resolved: `${remote}#${sha1}` },
      true,
      'ref starting w/ 40 hex',
    ],
  ] as const) {
    t.equal(gitPinMoved(a, b), moved, name)
  }
})
