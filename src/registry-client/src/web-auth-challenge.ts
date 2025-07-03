export type WebAuthChallenge = {
  doneUrl: string
  authUrl: string
}

export const getWebAuthChallenge = (
  o: unknown,
): WebAuthChallenge | undefined => {
  if (
    !!o &&
    typeof o === 'object' &&
    'doneUrl' in o &&
    typeof o.doneUrl === 'string' &&
    o.doneUrl
  ) {
    // Publishes use authUrl, but login uses loginUrl
    const authUrl =
      'authUrl' in o && typeof o.authUrl === 'string' ? o.authUrl
      : 'loginUrl' in o && typeof o.loginUrl === 'string' ? o.loginUrl
      : undefined
    return authUrl ? { doneUrl: o.doneUrl, authUrl } : undefined
  }
}
