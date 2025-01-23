export const isIterable = <T>(o: unknown): o is Iterable<T> =>
  !!o && typeof o === 'object' && Symbol.iterator in o
