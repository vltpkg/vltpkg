import t from 'tap'
import {
  convertToSetCommand,
  convertToSetCommands,
  replaceDollarWithPercentPair,
} from '../src/to-batch-syntax.ts'

t.test('replace $ expressions with % pair', function (t) {
  const assertReplacement = function (str: string, expect: string) {
    t.equal(replaceDollarWithPercentPair(str), expect)
  }
  assertReplacement('$A', '%A%')
  assertReplacement('$A:$B', '%A%:%B%')
  assertReplacement('$A bla', '%A% bla')
  assertReplacement('${A}bla', '%A%bla')
  assertReplacement('$A $bla bla', '%A% %bla% bla')
  assertReplacement('${A}bla ${bla}bla', '%A%bla %bla%bla')
  assertReplacement('./lib:$NODE_PATH', './lib:%NODE_PATH%')
  t.end()
})

t.test('convert variable declaration to set command', function (t) {
  t.equal(
    convertToSetCommands('A=.lib:$A ou=ou'),
    '@SET A=.lib:%A%\r\n@SET ou=ou\r\n',
  )
  t.equal(convertToSetCommand('A', '.lib:$A '), '@SET A=.lib:%A%\r\n')
  t.equal(convertToSetCommand('', ''), '')
  t.equal(convertToSetCommand(' ', ''), '')
  t.equal(convertToSetCommand(' ', ' '), '')
  t.equal(convertToSetCommand(' ou', ' ou '), '@SET ou=ou\r\n')
  t.end()
})
