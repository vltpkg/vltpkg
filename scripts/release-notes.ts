#!/usr/bin/env -S node --experimental-strip-types --no-warnings

// Generates GitHub release notes for a tag and prints them to stdout.
//
// GitHub's automatic release notes list each pull request by its
// title, which is not always what landed: a squash commit can be
// retitled when merging, and titles carry markers such as
// `[ci full-matrix]` that only steer CI. This script lists each pull
// request by the headline of the commit that landed instead, with any
// such marker removed.
//
// They also attribute each pull request to the account that opened
// it. When that account is a GitHub App (a `[bot]` login), the person
// behind the change is only recorded as a `Co-Authored-By` trailer on
// the commits. GitHub resolves those trailers to user accounts, so
// this script rewrites the attribution of bot-opened pull requests to
// the human co-authors of their commits.
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

// Markers such as `[ci full-matrix]` opt a pull request into extra CI
// runs (see .github/workflows/ci.yml). They mean nothing to readers,
// and a squash commit can still carry one if its title was not edited.
const withoutCiMarkers = (title: string) =>
  title.replace(/\s*\[ci [^\]]*\]/gi, '').trim()

type PullRequest = {
  // The first line of the commit that landed, without the
  // ` (#<number>)` that GitHub appends to squash commits. Unset when
  // a rebase landed several commits, as no one line describes them.
  headline?: string
  // The human co-authors of the pull request's commits, in first-seen
  // order, excluding the bot that opened it and any other bots.
  coAuthors: string[]
}

const pullRequest = async (number: number): Promise<PullRequest> => {
  type Result = {
    data?: {
      repository?: {
        pullRequest?: {
          mergeCommit: { message: string } | null
          commits: {
            nodes: {
              commit: {
                message: string
                parents: { totalCount: number }
                author: { email: string } | null
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
  // `last` rather than `first`, so a rebase can be recognized by its
  // last commit even on a pull request with more than 100 of them.
  const query = `query ($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        mergeCommit { message }
        commits(last: 100) {
          nodes {
            commit {
              message
              parents { totalCount }
              author { email }
              authors(first: 10) {
                nodes { email user { login } }
              }
            }
          }
        }
      }
    }
  }`
  let result: Result
  try {
    result = await api<Result>('/graphql', {
      query,
      variables: { owner, repo, number },
    })
    if (result.errors?.length) {
      throw new Error(result.errors.map(e => e.message).join('; '))
    }
  } catch (er) {
    // This runs after the packages are published and the tag is pushed,
    // so a failed lookup keeps the generated title and attribution
    // rather than failing the release.
    console.warn(`pull request #${number}: ${er}`)
    return { coAuthors: [] }
  }
  const pr = result.data?.repository?.pullRequest
  if (!pr) return { coAuthors: [] }

  // A squash lands one new commit. A rebase lands the pull request's
  // own commits, leaving out merges from the base branch, and the merge
  // commit is a copy of the last of them, message included. The first
  // line is read from `message`, as `messageHeadline` gets truncated.
  const landed = pr.mergeCommit?.message
  const own = pr.commits.nodes.filter(
    ({ commit }) => commit.parents.totalCount === 1,
  )
  const rebasedSeveral =
    own.length > 1 && landed === own.at(-1)?.commit.message
  const headline =
    rebasedSeveral ? undefined : (
      landed
        ?.split('\n', 1)[0]
        ?.trim()
        .replace(new RegExp(` \\(#${number}\\)$`), '')
    )

  const logins = new Set<string>()
  for (const { commit } of pr.commits.nodes) {
    // `authors` includes the commit's own author, not just the trailers,
    // and a human pushing to a bot's branch must not re-attribute the
    // whole pull request to them.
    const author = commit.author?.email.toLowerCase()
    for (const { email, user } of commit.authors.nodes) {
      if (
        user &&
        !isBot(user.login) &&
        !isNoReply(email) &&
        email.toLowerCase() !== author
      ) {
        logins.add(user.login)
      }
    }
  }
  return { headline, coAuthors: [...logins] }
}

const { body } = await api<{ body: string }>(
  `/repos/${owner}/${repo}/releases/generate-notes`,
  { tag_name: tag, previous_tag_name: previousTag },
)

const pullUrl = `${serverUrl}/${owner}/${repo}/pull/`
const changeLine = new RegExp(
  `^\\* (.*) by @([^\\s]+) (in ${pullUrl.replaceAll('.', '\\.')}(\\d+))$`,
)
const contributorLine =
  /^\* @([^\s]+\[bot\]) made their first contribution in /

const lines = body.split('\n')
const rewrittenBots = new Set<string>()

for (const [i, line] of lines.entries()) {
  const match = changeLine.exec(line)
  if (!match) continue
  const [, title, login, link, number] = match
  assert(title && login && link && number)
  const { headline, coAuthors } = await pullRequest(Number(number))
  let authors = [login]
  if (isBot(login) && coAuthors.length) {
    authors = coAuthors
    rewrittenBots.add(login)
  }
  lines[i] =
    `* ${withoutCiMarkers(headline ?? title)} by ${authors.map(a => `@${a}`).join(', ')} ${link}`
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
