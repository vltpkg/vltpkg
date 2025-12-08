import { defaultGitHosts } from '@vltpkg/spec/browser'
import type { Repository } from '@vltpkg/types'

type RepositoryInput = Repository & { directory?: string }

/**
 * Normalizes the repo url
 */
export const normalizeUrl = (url: string): string => {
  // Remove git+ prefix, .git suffix, and trailing slash
  const normalized = url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')

  // Handle git:// protocol
  if (normalized.startsWith('git://')) {
    return `https://${normalized.substring(6)}`
  }

  // Add https:// if no protocol
  if (!normalized.startsWith('http')) {
    return `https://${normalized}`
  }

  return normalized
}

/**
 * Strips common hosted git prefixes from repository strings.
 * Handles formats like "github:owner/repo", "gitlab:owner/repo", etc.
 */
const stripHostedGitPrefix = (repo: string): string => {
  const prefixes = Object.keys(defaultGitHosts)
  for (const prefix of prefixes) {
    if (repo.startsWith(`${prefix}:`)) {
      return repo.substring(prefix.length)
    }
  }
  return repo
}

/**
 * Extracts the org and repo name from repo
 */
export const getRepoOrigin = (
  repo: RepositoryInput,
): { org: string; repo: string } | undefined => {
  let url: string | undefined

  if (typeof repo === 'string') {
    // Strip hosted git prefixes (e.g., "github:owner/repo" -> "owner/repo")
    const cleanedRepo = stripHostedGitPrefix(repo)

    // Validate input has expected format
    if (
      cleanedRepo === '' ||
      cleanedRepo === '/' ||
      !cleanedRepo.includes('/')
    ) {
      return undefined
    }

    // Handle the specific case of github.com/owner format which should be rejected
    if (
      cleanedRepo === 'github.com' ||
      cleanedRepo.startsWith('github.com/')
    ) {
      // Only accept if it's a GitHub shorthand like owner/repo
      const parts = cleanedRepo.split('/')
      if (parts.length !== 2 || parts[0] === 'github.com') {
        return undefined
      }
    }

    url = normalizeUrl(
      cleanedRepo.includes('://') ? cleanedRepo : (
        `https://github.com/${cleanedRepo}`
      ),
    )
  } else if (repo.url) {
    url = normalizeUrl(repo.url)
  }

  if (!url) return

  try {
    // Handle GitHub shorthand format (owner/repo) that doesn't have a hostname
    if (
      typeof repo === 'string' &&
      !repo.includes('://') &&
      repo.includes('/')
    ) {
      // Strip prefix before splitting
      const cleanedRepo = stripHostedGitPrefix(repo)
      const [org, repository] = cleanedRepo.split('/')
      if (org && repository) {
        return { org, repo: repository }
      }
    }

    const parsed = new URL(url)

    // Validate it's a GitHub URL
    if (parsed.hostname !== 'github.com') {
      return undefined
    }

    const pathParts = parsed.pathname.replace(/^\/+/, '').split('/')

    // Validate there's an org and repo
    if (pathParts.length < 2 || !pathParts[0] || !pathParts[1]) {
      return undefined
    }

    const org = pathParts[0]
    const repository = pathParts[1]

    return { org, repo: repository }
  } catch {
    return
  }
}

/**
 * Returns a github api url for a repo
 */
export const getRepositoryApiUrl = (
  repo: RepositoryInput,
): string | undefined => {
  const origin = getRepoOrigin(repo)
  if (!origin) return

  return `https://api.github.com/repos/${origin.org}/${origin.repo}`
}

/**
 * Returns the github repo url
 */
export const getRepositoryUrl = (
  repo: RepositoryInput,
  includeDirectory = false,
): string | undefined => {
  const origin = getRepoOrigin(repo)
  if (!origin) return

  const baseUrl = `https://github.com/${origin.org}/${origin.repo}`

  if (
    includeDirectory &&
    typeof repo !== 'string' &&
    repo.directory
  ) {
    return `${baseUrl}/tree/main/${repo.directory}`
  }

  return baseUrl
}
