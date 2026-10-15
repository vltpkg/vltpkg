import { error } from '@vltpkg/error-cause'
import { linkSkills, listSkills } from '@vltpkg/graph'
import type {
  LinkSkillsResult,
  ListSkillsResult,
  Skill,
} from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export type SkillsResult =
  | ({ action: 'list' } & ListSkillsResult)
  | ({ action: 'link' } & LinkSkillsResult)

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'skills',
    usage: ['', 'list [<query>]', 'link [<query>]'],
    description: `Manage the agent skills shipped by installed packages.

      A skill is a folder with a \`SKILL.md\` file
      (https://agentskills.io/specification). Packages ship them at
      \`skills/<name>/SKILL.md\`, or as a root \`SKILL.md\`.

      Skills are linked into the project's agent skill dirs:
      \`.agents/skills\`, plus \`<folder>/skills\` for each agent folder
      at the project root (e.g. \`.claude/\`), or the \`skills-dir\`
      config. When packages ship skills with the same name, one is
      linked and the others are reported. Only links made by vlt
      (pointing into \`node_modules/.vlt\`) are ever replaced or
      removed; anything else in the way is skipped.

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
        description: `Link the skills of the selected packages, and remove
                      every other vlt skill link in the agent skill dirs.
                      Selects \`:not(:malware)\` by default.`,
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

// warnings shared by list and link
const notes = (r: { skipped?: string[]; gitignore?: string[] }) => [
  ...(r.skipped ? [`⚠️ Skipped ${r.skipped.join(', ')}`] : []),
  ...(r.gitignore ?
    [`⚠️ Could not update ${r.gitignore.join(', ')}`]
  : []),
]

const humanList = (r: ListSkillsResult) => {
  const { skills, dirs } = r
  const out = [
    `Agent skill dirs: ${
      dirs.length ? dirs.join(', ')
      : r.skipped ? 'none'
      : 'none (skills-dir is empty)'
    }`,
    ...notes(r),
  ]
  if (!skills.length) {
    out.push('No agent skills found in installed packages.')
    return out.join('\n')
  }
  out.push(`Found ${plural(skills.length, 'agent skill')}:`)
  for (const s of skills) {
    const pkg = s.version ? `${s.name}@${s.version}` : s.name
    const label = s.alias ? `${s.alias} (${pkg})` : pkg
    const linked =
      dirs.length && dirs.every(d => s.linked.includes(d)) ?
        ' (linked)'
      : s.linked.length ? ` (linked in ${s.linked.join(', ')})`
      : ''
    out.push(`  ${label} › ${s.skill}${linked}`)
    if (s.description) out.push(`    ${s.description}`)
  }
  return out.join('\n')
}

// distinct skills, in any number of dirs
const count = (rows: Skill[]) =>
  new Set(rows.map(r => `${r.id}\0${r.skill}`)).size

const humanLink = (r: LinkSkillsResult) => {
  const out: string[] = []
  if (r.linked.length) {
    out.push(
      lines(
        `🔗 Linked ${plural(count(r.linked), 'agent skill')}:`,
        r.linked.map(s => s.mount),
      ),
    )
  } else if (r.unchanged.length) {
    out.push(
      `${plural(count(r.unchanged), 'agent skill')} already linked.`,
    )
  }
  if (r.removed.length) {
    out.push(
      lines(
        `🧹 Removed ${plural(r.removed.length, 'skill link')}:`,
        r.removed,
      ),
    )
  }
  if (r.conflicts.length) {
    out.push(
      lines(
        `⚠️ Skipped ${plural(r.conflicts.length, 'skill')}, path in use or taken by another package:`,
        r.conflicts,
      ),
    )
  }
  out.push(...notes(r))
  return out.join('\n') || 'No agent skills found to link.'
}

export const views = {
  human: (r: SkillsResult): string =>
    r.action === 'list' ? humanList(r) : humanLink(r),
  json: (r: SkillsResult) => r,
} as const satisfies Views<SkillsResult>

export const command: CommandFn<SkillsResult> = async conf => {
  const [sub = 'list', query] = conf.positionals
  const target = conf.get('target') || query
  const opts = {
    ...conf.options,
    projectRoot: conf.projectRoot,
    skillsDirs: conf.get('skills-dir'),
  }
  switch (sub) {
    case 'list':
    case 'ls':
      return {
        action: 'list',
        ...(await listSkills({ ...opts, target })),
      }
    case 'link':
      return {
        action: 'link',
        ...(await linkSkills({
          ...opts,
          target: target || ':not(:malware)',
          apply: true,
        })),
      }
    default:
      throw error('Unknown skills subcommand', {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['list', 'ls', 'link'],
      })
  }
}
