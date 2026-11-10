import type {
  LinkSkillsResult,
  UnmatchedPattern,
  UnscannedSkills,
} from '@vltpkg/graph'

/** Warnings for `:skill()` patterns that matched nothing. */
export const unmatchedLines = (
  unmatched: UnmatchedPattern[] = [],
): string[] =>
  unmatched.map(
    ({ pattern, skills }) =>
      `⚠️ No skill matches "${pattern}"; ${
        !skills ? 'no installed package matches its selector'
        : skills.length ?
          `the selected packages ship: ${skills.join(', ')}`
        : 'the selected packages ship no skills'
      }`,
  )

/** Skills left out: their packages have no security data. */
export const unscannedLines = ({
  unscanned = [],
  unscannedReason,
}: UnscannedSkills): string[] =>
  unscanned.length ?
    [
      `⏳ ${unscanned.length} skill${unscanned.length === 1 ? '' : 's'} left out, ${
        unscannedReason === 'timeout' ?
          'security data timed out'
        : 'Socket has not scanned their packages yet'
      }: ${unscanned.join(', ')}. Try again later.`,
    ]
  : []

/** `--view=json` of the links: their mounts, `unchanged` left out. */
export const skillsJson = ({
  linked,
  unchanged: _,
  ...rest
}: LinkSkillsResult) => ({
  linked: linked.map(s => s.mount),
  ...rest,
})

/** What an install did to the agent skill links. */
export const linkLines = (r?: LinkSkillsResult): string[] => {
  const {
    linked = [],
    removed = [],
    conflicts = [],
    skipped = [],
    gitignore = [],
    unmatched = [],
  } = r ?? {}
  const s = (n: number) => (n === 1 ? '' : 's')
  const lines: string[] = []
  if (linked.length) {
    // one per skill, linked in any number of dirs
    const n = new Set(linked.map(r => `${r.id}\0${r.skill}`)).size
    const dirs = [...new Set(linked.map(r => r.dir))].join(', ')
    lines.push(`🔗 Linked ${n} agent skill${s(n)} into ${dirs}`)
  }
  if (removed.length) {
    lines.push(
      `🧹 Removed ${removed.length} stale skill link${s(removed.length)}: ${removed.join(', ')}`,
    )
  }
  if (conflicts.length) {
    lines.push(
      `⚠️ ${conflicts.length} skill link${s(conflicts.length)} skipped, path in use or taken by another package: ${conflicts.join(', ')}`,
    )
  }
  lines.push(...unmatchedLines(unmatched))
  if (skipped.length) {
    lines.push(`⚠️ Skipped ${skipped.join(', ')}`)
  }
  if (gitignore.length) {
    lines.push(`⚠️ Could not update ${gitignore.join(', ')}`)
  }
  lines.push(...unscannedLines(r ?? {}))
  return lines
}
