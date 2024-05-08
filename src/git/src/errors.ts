const maxRetry = 3

export class GitError extends Error {
  shouldRetry (_num: number) {
    return false
  }
}

export class GitConnectionError extends GitError {
  constructor () {
    super('A git connection error occurred')
  }

  shouldRetry (num: number) {
    return num < maxRetry
  }
}

export class GitPathspecError extends GitError {
  constructor () {
    super('The git reference could not be found')
  }
}

export class GitUnknownError extends GitError {
  constructor () {
    super('An unknown git error occurred')
  }
}
