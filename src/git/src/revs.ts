import { gitScpURL } from '@vltpkg/git-scp-url'
import {
  SpawnResultStderrString,
  SpawnResultStdoutString,
} from '@vltpkg/promise-spawn'
import { LRUCache } from 'lru-cache'
import { fileURLToPath } from 'url'
import { GitOptions } from './index.js'
import { linesToRevs, RevDoc } from './lines-to-revs.js'
import { spawn } from './spawn.js'

const fetchMethod = async (
  repo: string,
  _: any,
  options: { context: GitOptions },
) => {
  const result: SpawnResultStderrString & SpawnResultStdoutString =
    await spawn(['ls-remote', repo], options.context)
  const revsDoc = linesToRevs(result.stdout.split('\n'))
  return revsDoc
}

const revsCache = new LRUCache<string, RevDoc, GitOptions>({
  max: 100,
  ttl: 5 * 60 * 1000,
  allowStaleOnFetchAbort: true,
  allowStaleOnFetchRejection: true,
  fetchMethod,
})

export const revs = async (repo: string, opts: GitOptions = {}) => {
  repo = String(gitScpURL(repo) ?? repo).replace(/^git\+/, '')
  if (repo.startsWith('file://')) repo = fileURLToPath(repo)
  if (opts.noGitRevCache) {
    const result = await fetchMethod(repo, undefined, {
      context: opts,
    })
    revsCache.set(repo, result)
    return result
  }
  return await revsCache.fetch(repo, { context: opts })
}
