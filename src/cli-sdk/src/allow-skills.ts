import type { UnmatchedPattern, UnscannedSkills } from '@vltpkg/graph'

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
