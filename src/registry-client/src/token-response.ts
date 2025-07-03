export type TokenResponse = {
  token: string
}

export const getTokenResponse = (
  b: unknown,
): TokenResponse | undefined =>
  (
    !!b &&
    typeof b === 'object' &&
    'token' in b &&
    typeof b.token === 'string' &&
    b.token
  ) ?
    { token: b.token }
  : undefined
