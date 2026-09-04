import t from 'tap'
import * as archive from '../src/archive.ts'
import * as discover from '../src/discover.ts'
import * as frontmatter from '../src/frontmatter.ts'
import * as manifest from '../src/manifest.ts'
import { cleanStale, writeSkill } from '../src/publish.ts'
import * as resolveFiles from '../src/resolve-files.ts'
import * as sync from '../src/sync.ts'
import * as index from '../src/index.ts'

t.strictSame(
  index,
  Object.assign(Object.create(null), {
    ...archive,
    ...discover,
    ...frontmatter,
    ...manifest,
    cleanStale,
    writeSkill,
    ...resolveFiles,
    ...sync,
  }),
)
