export const extractRepoOrg = (
  repoUrl: string,
): string | undefined => {
  try {
    const url = new URL(repoUrl)
    if (url.hostname === 'github.com') {
      const parts = url.pathname.split('/').filter(Boolean)
      return parts[0]
    }
  } catch {
    // Invalid URL, return undefined
    return undefined
  }

  return undefined
}
