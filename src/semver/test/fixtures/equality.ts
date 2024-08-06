// [version1, version2]
// version1 should be equivalent to version2
export default [
  ['1.2.3', '1.2.3'],
  ['1.2.3-beta+build', '1.2.3-beta+build'],
  ['1.2.3+build', '1.2.3+build'],
] as [string, string][]
