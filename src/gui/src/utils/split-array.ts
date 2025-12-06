export const splitArray = <T>(arr: T[], n: number): [T[], T[]] => {
  return [arr.slice(0, n), arr.slice(n)] as const
}
