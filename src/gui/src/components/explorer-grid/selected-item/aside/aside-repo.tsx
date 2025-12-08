import {
  Scale,
  CircleDot,
  Globe,
  GitPullRequest,
  Star,
} from 'lucide-react'
import { Github } from '@/components/icons/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { getRepositoryUrl } from '@/utils/get-repo-url.ts'
import {
  AsideHeader,
  AsideSection,
  AsideItem,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'
import { getKnownHostname } from '@/utils/get-known-hostname.ts'

export const AsideRepo = () => {
  const { isRepoEmpty } = useEmptyCheck()

  const manifest = useSelectedItemStore(state => state.manifest)
  const starGazers = useSelectedItemStore(
    state => state.stargazersCount,
  )
  const openIssue = useSelectedItemStore(
    state => state.openIssueCount,
  )
  const openPrs = useSelectedItemStore(
    state => state.openPullRequestCount,
  )

  const homepage = manifest?.homepage
  const repository = manifest?.repository
  const license = manifest?.license

  const repoUrl = repository && getRepositoryUrl(repository)
  const repoHost = repoUrl && getKnownHostname(repoUrl)

  if (isRepoEmpty) return null

  return (
    <AsideSection>
      <AsideHeader>About</AsideHeader>
      {homepage && (
        <AsideItem icon={Globe} href={homepage}>
          Website
        </AsideItem>
      )}
      {repository && (
        <AsideItem
          icon={Github}
          href={getRepositoryUrl(repository) ?? undefined}>
          {repoHost ? repoHost : 'Repository'}
        </AsideItem>
      )}
      <AsideItem count={openPrs} icon={GitPullRequest}>
        Pull Requests
      </AsideItem>
      <AsideItem count={openIssue} icon={CircleDot}>
        Issues
      </AsideItem>
      {Number(starGazers ?? 0) > 0 && (
        <AsideItem count={String(starGazers)} icon={Star}>
          Stars
        </AsideItem>
      )}
      {license && <AsideItem icon={Scale}>{license}</AsideItem>}
    </AsideSection>
  )
}
