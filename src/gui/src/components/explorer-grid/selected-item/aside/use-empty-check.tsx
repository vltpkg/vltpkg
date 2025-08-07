import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import type { NormalizedManifest } from '@vltpkg/types'
import type { Version } from '@/lib/external-info.ts'

interface EmptyCheckResult {
  isRepoEmpty: boolean
  isFundingEmpty: boolean
  isBugsEmpty: boolean
  isMetadataEmpty: boolean
}

const checkMetadataEmpty = (
  manifest: NormalizedManifest | null,
  currentVersion: Version | undefined,
): boolean => {
  if (!manifest && !currentVersion) return true

  return (
    !manifest?.engines &&
    !manifest?.type &&
    !currentVersion?.unpackedSize &&
    !currentVersion?.tarball &&
    !currentVersion?.integrity
  )
}

export const useEmptyCheck = (): EmptyCheckResult => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const versions = useSelectedItemStore(state => state.versions)
  const stargazersCount = useSelectedItemStore(
    state => state.stargazersCount,
  )
  const openIssueCount = useSelectedItemStore(
    state => state.openIssueCount,
  )
  const openPullRequestCount = useSelectedItemStore(
    state => state.openPullRequestCount,
  )

  const currentVersion = versions?.find(
    version => version.version === manifest?.version,
  )
  const funding = manifest?.funding
  const bugs = manifest?.bugs

  const isRepoEmpty =
    !stargazersCount &&
    !openIssueCount &&
    !openPullRequestCount &&
    !manifest?.homepage &&
    !manifest?.repository &&
    !manifest?.license

  const isFundingEmpty =
    !manifest ||
    !funding ||
    (!Array.isArray(funding) && [funding].length === 0)

  const isBugsEmpty =
    !manifest ||
    !bugs ||
    (!Array.isArray(bugs) && [bugs].length === 0)

  const isMetadataEmpty = checkMetadataEmpty(manifest, currentVersion)

  return {
    isRepoEmpty,
    isFundingEmpty,
    isBugsEmpty,
    isMetadataEmpty,
  }
}
