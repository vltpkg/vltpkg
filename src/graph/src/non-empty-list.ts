export const isNonEmptyList = <T>(
  list: T[],
): list is [first: T, ...rest: T[]] => !!list.length

export const nonEmptyList = <T>(nodes: T[]) =>
  isNonEmptyList(nodes) ? nodes : undefined
