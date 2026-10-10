import { error } from '@vltpkg/error-cause'
import { linkSkills, listSkills, unlinkSkills } from '@vltpkg/graph'
import type {
  LinkSkillsResult,
  Skill,
  UnlinkSkillsResult,
} from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export type SkillsResult =
  | { action: 'list'; skills: Skill[] }
  | ({ action: 'link' } & LinkSkillsResult)
  | ({ action: 'unlink' } & UnlinkSkillsResult)

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'skills',
    usage: [
      '',
      'list [<query>]',
      'link [<query>]',
      'unlink [<query>]',
    ],
    description: `Manage the agent skills shipped by installed packages.

      A skill is a folder with a \`SKILL.md\` file
      (https://agentskills.io/specification). Packages ship them at
      \`skills/<name>/SKILL.md\`, or as a root \`SKILL.md\`.

      Skills are linked into \`./skills/<package>/<skill>\`. Only links
      made by vlt (pointing into \`node_modules/.vlt\`) are ever replaced
      or removed; anything else in the way is skipped.

      Use --target or a query after the subcommand to select packages
      using DSS query syntax. Use \`vlt install --allow-skills=<query>\`
      to link skills on install.`,
    subcommands: {
      list: {
        usage: '[<query>]',
        description: `List the skills of installed packages. The default.
                      Selects all packages (\`*\`) by default.`,
      },
      link: {
        usage: '[<query>]',
        description: `Link the skills of the selected packages, then
                      remove stale skill links (dangling, or no longer
                      a skill of a linked package). Selects
                      \`:not(:malware)\` by default.`,
      },
      unlink: {
        usage: '[<query>]',
        description: `Remove the skill links of the selected packages,
                      plus any dangling ones. Removes all by default.`,
      },
    },
    options: {
      target: {
        value: '<query>',
        description:
          'Query selector to filter packages using DSS syntax.',
      },
    },
  })

const plural = (n: number, s: string) =>
  `${n} ${s}${n === 1 ? '' : 's'}`

const lines = (header: string, items: string[]) =>
  [header, ...items.map(i => `  ${i}`)].join('\n')

const humanList = (skills: Skill[]) => {
  if (!skills.length)
    return 'No agent skills found in installed packages.'
  const out = [`Found ${plural(skills.length, 'agent skill')}:`]
  for (const s of skills) {
    const v = s.version ? `@${s.version}` : ''
    out.push(
      `  ${s.name}${v} › ${s.skill}${s.linked ? ' (linked)' : ''}`,
    )
    if (s.description) out.push(`    ${s.description}`)
  }
  return out.join('\n')
}

const humanLink = (r: LinkSkillsResult) => {
  const out: string[] = []
  if (r.linked.length) {
    out.push(
      lines(
        `🔗 Linked ${plural(r.linked.length, 'agent skill')}:`,
        r.linked.map(s => s.mount),
      ),
    )
  } else if (r.unchanged.length) {
    out.push(
      `${plural(r.unchanged.length, 'agent skill')} already linked.`,
    )
  }
  if (r.removed.length) {
    out.push(
      lines(
        `🧹 Removed ${plural(r.removed.length, 'stale skill link')}:`,
        r.removed,
      ),
    )
  }
  if (r.conflicts.length) {
    out.push(
      lines(
        `⚠️ Skipped ${plural(r.conflicts.length, 'skill')}, path in use:`,
        r.conflicts,
      ),
    )
  }
  return out.join('\n') || 'No agent skills found to link.'
}

export const views = {
  human: (r: SkillsResult): string => {
    switch (r.action) {
      case 'list':
        return humanList(r.skills)
      case 'link':
        return humanLink(r)
      case 'unlink':
        return r.removed.length ?
            lines(
              `🧹 Removed ${plural(r.removed.length, 'skill link')}:`,
              r.removed,
            )
          : 'No skill links to remove.'
    }
  },
  json: (r: SkillsResult) => r,
} as const satisfies Views<SkillsResult>

export const command: CommandFn<SkillsResult> = async conf => {
  const [sub = 'list', query] = conf.positionals
  const target = conf.get('target') || query
  const opts = { ...conf.options, projectRoot: conf.projectRoot }
  switch (sub) {
    case 'list':
    case 'ls':
      return {
        action: 'list',
        skills: await listSkills({ ...opts, target }),
      }
    case 'link':
      return {
        action: 'link',
        ...(await linkSkills({
          ...opts,
          target: target || ':not(:malware)',
        })),
      }
    case 'unlink':
      return {
        action: 'unlink',
        ...(await unlinkSkills({ ...opts, target })),
      }
    default:
      throw error('Unknown skills subcommand', {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['list', 'ls', 'link', 'unlink'],
      })
  }
}
