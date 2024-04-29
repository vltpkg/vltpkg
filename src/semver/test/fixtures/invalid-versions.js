// none of these are semvers
// [value, reason, opt]
import { MAX_LENGTH, MAX_SAFE_INTEGER } from '../../lib/regex.js'
export default [
  [new Array(MAX_LENGTH).join('1') + '.0.0', 'too long'],
  [`${MAX_SAFE_INTEGER}0.0.0`, 'too big'],
  [`0.${MAX_SAFE_INTEGER}0.0`, 'too big'],
  [`0.0.${MAX_SAFE_INTEGER}0`, 'too big'],
  ['hello, world', 'not a version'],
  ['hello, world', true, 'even loose, its still junk'],
  [/a regexp/, 'regexp is not a string'],
  [/1.2.3/, 'semver-ish regexp is not a string'],
  [{ toString: () => '1.2.3' }, 'obj with a tostring is not a string']
]
