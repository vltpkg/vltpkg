export type WebAuthChallenge = {
  doneUrl: string
  loginUrl: string
}

export const isWebAuthChallenge = (
  o: unknown,
): o is WebAuthChallenge =>
  !!o &&
  typeof o === 'object' &&
  !!(o as WebAuthChallenge).doneUrl &&
  !!(o as WebAuthChallenge).loginUrl &&
  typeof (o as WebAuthChallenge).doneUrl === 'string' &&
  typeof (o as WebAuthChallenge).loginUrl === 'string'
