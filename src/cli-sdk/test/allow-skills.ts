import t from 'tap'
import {
  unmatchedLines,
  unscannedLines,
} from '../src/allow-skills.ts'

t.test('lines', async t => {
  t.strictSame(unmatchedLines(), [])
  t.strictSame(
    unmatchedLines([
      { pattern: 'x*', skills: ['a', 'b'] },
      { pattern: 'y', skills: [] },
      { pattern: 'z' },
    ]),
    [
      '⚠️ No skill matches "x*"; the selected packages ship: a, b',
      '⚠️ No skill matches "y"; the selected packages ship no skills',
      '⚠️ No skill matches "z"; no installed package matches its selector',
    ],
  )
  t.strictSame(unscannedLines({}), [])
  t.strictSame(
    unscannedLines({
      unscanned: ['a (foo@1.0.0)'],
      unscannedReason: 'timeout',
    }),
    [
      '⏳ 1 skill left out, security data timed out: a (foo@1.0.0). Try again later.',
    ],
  )
  t.strictSame(
    unscannedLines({
      unscanned: ['a (foo@1.0.0)', 'b (foo@1.0.0)'],
      unscannedReason: 'unscanned',
    }),
    [
      '⏳ 2 skills left out, Socket has not scanned their packages yet: a (foo@1.0.0), b (foo@1.0.0). Try again later.',
    ],
  )
})
