const knownProtocols = new Set([
  'http:',
  'https:',
  'git:',
  'git+ssh:',
  'git+https:',
  'ssh:',
])

const memo = new Map<string, URL>()

// git+ssh:github.com:user/repo => git+ssh://github.com:user/repo
// git@github.com:user/repo => git+ssh://user@github.com:user/repo
const correctProtocol = (arg: string) => {
  const firstColon = arg.indexOf(':')
  const proto = arg.slice(0, firstColon + 1)
  const doubleSlash = arg.indexOf('//')
  if (knownProtocols.has(proto)) {
    if (doubleSlash === firstColon + 1) {
      return arg
    }
    return proto + '//' + arg.slice(firstColon + 1)
  }

  const firstAt = arg.indexOf('@')
  if (firstAt > -1) {
    if (firstAt > firstColon) {
      return `git+ssh://${arg}`
    } else {
      return arg
    }
    // it would've parsed just fine otherwise, but just in case */
    /* c8 ignore start */
  }

  return proto + '//' + arg.slice(firstColon + 1)
}
/* c8 ignore stop */

// git+ssh://github.com:user/repo => git+ssh://github.com/user/repo
const correctUrl = (url: string): string => {
  const firstAt = url.indexOf('@')
  const lastHash = url.lastIndexOf('#')
  let firstColon = url.indexOf(':')
  let lastColon = url.lastIndexOf(
    ':',
    lastHash > -1 ? lastHash : Infinity,
  )

  let corrected = url
  if (lastColon > firstAt) {
    // the last : comes after the first @ (or there is no @)
    // like it would in:
    // proto://hostname.com:user/repo
    // username@hostname.com:user/repo
    // :password@hostname.com:user/repo
    // username:password@hostname.com:user/repo
    // proto://username@hostname.com:user/repo
    // proto://:password@hostname.com:user/repo
    // proto://username:password@hostname.com:user/repo
    // then we replace the last : with a / to create a valid path
    corrected =
      url.slice(0, lastColon) + '/' + url.slice(lastColon + 1)
    // // and we find our new : positions
    firstColon = corrected.indexOf(':')
    lastColon = corrected.lastIndexOf(':')
  }

  if (firstColon === -1 && !url.includes('//')) {
    // we have no : at all
    // as it would be in:
    // username@hostname.com/user/repo
    // then we prepend a protocol
    corrected = `git+ssh://${corrected}`
  }

  return corrected
}

export const gitScpURL = (url: string) => {
  const memoized = memo.get(url)
  if (memoized) return memoized
  try {
    const result = new URL(url)
    if (result.hostname) {
      memo.set(url, result)
      return result
    }
  } catch {}
  try {
    const result = new URL(correctUrl(correctProtocol(url)))
    if (result.hostname) {
      memo.set(url, result)
      return result
    }
  } catch {}
  return undefined
}
