// none of these are semvers
const { MAX_SAFE_INTEGER } = Number
const MAX_LENGTH = 256
export default [
  [new Array(MAX_LENGTH).join('1') + '.0.0', 'too long'],
  [`${MAX_SAFE_INTEGER}0.0.0`, 'too big'],
  [`0.${MAX_SAFE_INTEGER}0.0`, 'too big'],
  [`0.0.${MAX_SAFE_INTEGER}0`, 'too big'],
  [`Infinity.NaN.NaN`, 'too weird'],
  [`8.-4.0`, 'too negative'],
  ['1.2.3.4', 'too many'],
  [3.14, 'too floaty'],
  ['hello, world', 'too stringy'],
  [/a regexp/, 'too regularly expressive'],
  [/1.2.3/, 'too regularaly expressive (but points for trying)'],
  ['1.2', 'no patch'],
  ['1', 'no minor or patch'],
  ['', 'no nothing'],
  [{ toString: () => '1.2.3' }, 'too objectified'],
  ['1.2.3-', 'prerelease must be present if prefixed'],
  ['1.2.3-+x', 'prerelease must be present if prefixed'],
  ['1.2.3-x..y', 'empty prerelease id'],
  ['1.2.3-x.', 'empty prerelease id'],
  ['1.2.3+', 'build must be present if prefixed'],
  ['1.2.3-x+', 'build must be present if prefixed'],
  ['1.2.3+x..y', 'empty build id'],
  ['1.2.3-x+x..y', 'empty build id'],
  ['1.2.3-x+x.', 'empty build id'],
] as [any, string][]
