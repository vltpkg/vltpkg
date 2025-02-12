import { type GitUser } from '@vltpkg/git'

export const getAuthorFromGitUser = (user?: GitUser): string => {
  if (!user) return ''
  const { name, email } = user
  let res = ''
  if (name) res += name
  if (email) {
    if (name) res += ' '
    res += `<${email}>`
  }
  return res
}
