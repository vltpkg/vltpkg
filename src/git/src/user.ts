import { spawn } from './spawn.ts'

export type GitUser = {
  name?: string
  email?: string
}

export const getUser = async (
  opts = {},
): Promise<GitUser | undefined> => {
  let name = ''
  let email = ''

  // retrieve user.name
  const oldFlagUserNameResult = await spawn(
    ['config', '--get', 'user.name'],
    opts,
  )
  if (oldFlagUserNameResult.status || oldFlagUserNameResult.signal) {
    const userNameResult = await spawn(
      ['config', 'get', 'user.name'],
      opts,
    )

    name =
      userNameResult.status || userNameResult.signal ?
        ''
      : userNameResult.stdout.trim()
  } else {
    name = oldFlagUserNameResult.stdout.trim()
  }

  // retrieve user.email
  const oldFlagUserEmailResult = await spawn(
    ['config', '--get', 'user.email'],
    opts,
  )
  if (
    oldFlagUserEmailResult.status ||
    oldFlagUserEmailResult.signal
  ) {
    const userEmailResult = await spawn(
      ['config', 'get', 'user.email'],
      opts,
    )

    email =
      userEmailResult.status || userEmailResult.signal ?
        ''
      : userEmailResult.stdout.trim()
  } else {
    email = oldFlagUserEmailResult.stdout.trim()
  }

  // if fails to find both name & email, then return undefined
  if (!name && !email) {
    return undefined
  }

  return {
    name,
    email,
  }
}
