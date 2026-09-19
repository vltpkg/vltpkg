#!/usr/bin/env -S node --experimental-strip-types --no-warnings

// Generates GitHub release notes for a tag and prints them to stdout.
//
// GitHub's automatic release notes attribute each pull request to the
// account that opened it. When that account is a GitHub App (a `[bot]`
// login), the person behind the change is only recorded as a
// `Co-Authored-By` trailer on the commits. GitHub resolves those
// trailers to user accounts, so this script rewrites the attribution
// of bot-opened pull requests to the human co-authors of their commits.
//
// Usage: ./scripts/release-notes.ts <tag> <previous-tag>
// Requires GH_TOKEN (or GITHUB_TOKEN) and GITHUB_REPOSITORY.

import assert from 'node:assert'

const [tag, previousTag] = process.argv.slice(2)
assert(tag, 'usage: release-notes.ts <tag> <previous-tag>')
assert(previousTag, 'usage: release-notes.ts <tag> <previous-tag>')

const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
assert(token, 'GH_TOKEN or GITHUB_TOKEN must be set')

const repository = process.env.GITHUB_REPOSITORY
assert(repository, 'GITHUB_REPOSITORY must be set')
const [owner, repo] = repository.split('/')
assert(owner && repo, `invalid GITHUB_REPOSITORY: ${repository}`)

const apiUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com'
const serverUrl =
  process.env.GITHUB_SERVER_URL ?? 'https://github.com'

const api = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(
      `${path} failed: ${res.status} ${res.statusText}\n${await res.text()}`,
    )
  }
  return (await res.json()) as T
}

const isBot = (login: string) => login.endsWith('[bot]')

// Co-author trailers left by AI assistants use a bare noreply address
// (e.g. `noreply@anthropic.com`) that GitHub resolves to an account,
// but they are not the person behind the change. GitHub's own private
// addresses (`<id>+<login>@users.noreply.github.com`) are kept.
const isNoReply = (email: string) => /^no-?reply@/i.test(email)

// The human co-authors of a pull request's commits, in first-seen
// order, excluding the bot that opened it and any other bots.
const humanCoAuthors = async (number: number): Promise<string[]> => {
  type Result = {
    data?: {
      repository?: {
        pullRequest?: {
          commits: {
            nodes: {
              commit: {
                authors: {
                  nodes: {
                    email: string
                    user: { login: string } | null
                  }[]
                }
              }
            }[]
          }
        } | null
      } | null
    }
    errors?: { message: string }[]
  }
  const query = `query ($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        commits(first: 100) {
          nodes {
            commit {
              authors(first: 10) {
                nodes { email user { login } }
              }
            }
          }
        }
      }
    }
  }`
  const result = await api<Result>('/graphql', {
    query,
    variables: { owner, repo, number },
  })
  if (result.errors?.length) {
    throw new Error(
      `pull request #${number}: ${result.errors.map(e => e.message).join('; ')}`,
    )
  }
  const logins = new Set<string>()
  for (const { commit } of result.data?.repository?.pullRequest
    ?.commits.nodes ?? []) {
    for (const { email, user } of commit.authors.nodes) {
      if (user && !isBot(user.login) && !isNoReply(email)) {
        logins.add(user.login)
      }
    }
  }
  return [...logins]
}

const { body } = await api<{ body: string }>(
  `/repos/${owner}/${repo}/releases/generate-notes`,
  { tag_name: tag, previous_tag_name: previousTag },
)

const pullUrl = `${serverUrl}/${owner}/${repo}/pull/`
const changeLine = new RegExp(
  `^(\\* .* by )@([^\\s]+\\[bot\\])( in ${pullUrl.replaceAll('.', '\\.')}(\\d+))$`,
)
const contributorLine =
  /^\* @([^\s]+\[bot\]) made their first contribution in /

const lines = body.split('\n')
const rewrittenBots = new Set<string>()

for (const [i, line] of lines.entries()) {
  const match = changeLine.exec(line)
  if (!match) continue
  const [, prefix, bot, suffix, number] = match
  assert(prefix && bot && suffix && number)
  const authors = await humanCoAuthors(Number(number))
  if (!authors.length) continue
  lines[i] =
    `${prefix}${authors.map(a => `@${a}`).join(', ')}${suffix}`
  rewrittenBots.add(bot)
}

// A bot whose changes were attributed to their co-authors is not a
// contributor, so drop it from the New Contributors section, and drop
// the section entirely when nothing else is left in it.
const heading = lines.findIndex(
  line => line.trim() === '## New Contributors',
)
if (heading !== -1) {
  let end = heading + 1
  while (lines[end]?.startsWith('* ')) end++
  const bullets = lines.slice(heading + 1, end).filter(line => {
    const match = contributorLine.exec(line)
    return !match || !rewrittenBots.has(match[1] ?? '')
  })
  if (bullets.length) {
    lines.splice(heading + 1, end - heading - 1, ...bullets)
  } else {
    // Also drop the blank line that separates this from the next section
    if (lines[end] === '') end++
    lines.splice(heading, end - heading)
  }
}

process.stdout.write(lines.join('\n') + '\n')
