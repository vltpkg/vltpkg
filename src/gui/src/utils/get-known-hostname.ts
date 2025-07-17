import { getSiteName } from '@/utils/get-site-name.ts'
import { KNOWN_HOSTNAMES } from '@/lib/constants/index.ts'

export const getKnownHostname = (
  hostname: string,
): string | undefined => {
  const siteName = getSiteName(hostname)
  if (!siteName) return hostname
  return KNOWN_HOSTNAMES[siteName.toLowerCase()]
}
