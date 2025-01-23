export type TokenResponse = {
  token: string
}

export const isTokenResponse = (b: unknown): b is TokenResponse =>
  !!b &&
  typeof b === 'object' &&
  typeof (b as TokenResponse).token === 'string' &&
  !!(b as TokenResponse).token
