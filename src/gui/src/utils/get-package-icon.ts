import { normalizeUrl } from '@/utils/get-repo-url.ts'
import { extractRepoOrg } from '@/utils/extract-repo-org.ts'

export const getPackageIcon = (
  repoUrl: string | undefined,
): { src: string; alt: string } | undefined => {
  if (!repoUrl) return undefined

  const normalizedUrl = normalizeUrl(repoUrl)
  const org = extractRepoOrg(normalizedUrl)

  if (org) {
    return {
      src: `https://www.github.com/${org}.png`,
      alt: `${org} avatar`,
    }
  }
}
