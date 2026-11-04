import { relative } from 'node:path'
import { styleText } from 'node:util'
import { error } from '@vltpkg/error-cause'
import type { DepID } from '@vltpkg/dep-id'
import {
  assertQuery,
  linkSkills,
  listSkills,
  mermaidOutput,
} from '@vltpkg/graph'
import type {
  LinkSkillsResult,
  ListSkillsResult,
  MermaidChild,
  Skill,
  UnscannedSkills,
} from '@vltpkg/graph'
import { initSkill } from '@vltpkg/init'
import type { InitSkillResult } from '@vltpkg/init'
import type { WhichConfig } from '@vltpkg/vlt-json'
import {
  configLabel,
  savedLine,
  storedAllowSkills,
  unmatchedLines,
  unscannedLines,
} from '../allow-skills.ts'
import { configWriteTarget } from '../config/index.ts'
import type { LoadedConfig } from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { confirm, editQuery, interactive } from '../skills-prompt.ts'
import type { ViewOptions, Views } from '../view.ts'

export type SkillsResult =
  | ({ action: 'list' } & ListSkillsResult)
  | ({
      action: 'link'
      /** the `allow-skills` applied */
      query: string
      /** the config file it was saved to, if changed */
      saved?: WhichConfig
    } & LinkSkillsResult)
  | { action: 'unchanged' }
  | ({
      action: 'init'
      /** the `allow-skills` that links it */
      query?: string
    } & InitSkillResult)

// init only writes files
export const needsRegistry = ({ positionals }: LoadedConfig) =>
  positionals[0] !== 'init'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'skills',
    usage: ['', 'list [<query>]', 'link [<query>]', 'init [<name>]'],
    description: `Link the agent skills shipped by installed packages,
      or create your own.

      A skill is a folder with a \`SKILL.md\` file
      (https://agentskills.io/specification). Packages ship them as a
      root \`SKILL.md\`, or at \`<name>/SKILL.md\` in \`skills/\`,
      \`dist/skills/\` or \`.agents/skills/\`: the first skill of a name
      wins.

      Skills are linked into the project's agent skill dirs:
      \`.agents/skills\`, plus \`<folder>/skills\` for each agent folder
      at the project root (e.g. \`.claude/\`), or the \`skills-dir\`
      config. When packages ship skills with the same name, one is
      linked and the others are reported. Only links made by vlt are
      ever replaced or removed; anything else in the way is skipped.

      Use --target or a query after the subcommand to select packages
      using DSS query syntax. End a selector with
      \`:skill(<name>, …)\` to pick single skills, e.g.
      \`#skills:skill(find-skills)\`. Use
      \`vlt install --allow-skills=<query>\` to link skills on install.`,
    subcommands: {
      list: {
        usage: '[<query>]',
        description: `List the skills of installed packages. The default.
                      Selects all packages (\`*\`) by default. Applies
                      \`:skill()\`: preview a query before \`link\` saves
                      it.`,
      },
      link: {
        usage: '[<query>]',
        description: `Set, save and apply \`allow-skills\`: link what the
                      query selects and remove vlt links to other skills.
                      With no query: the stored one, or
                      \`:not(:malware)\`. Asks before replacing or editing
                      a stored query (-y skips). Saves to the project
                      vlt.json, or the user one with --config=user.`,
      },
      init: {
        usage: '[<name>]',
        description: `Create a starter \`skills/<name>/SKILL.md\` for the
                      project to ship, or a root \`SKILL.md\` named after
                      the package. Adds it to package.json \`files\` if
                      needed. Never overwrites. -w: in a workspace.`,
      },
    },
    options: {
      target: {
        value: '<query>',
        description:
          'Query selector to filter packages using DSS syntax.',
      },
      yes: {
        description:
          'Skip the prompts: replace or keep the stored allow-skills without asking.',
      },
      config: {
        value: 'user|project',
        description:
          'vlt.json to save allow-skills to (default: project).',
      },
      workspace: {
        value: '<path|glob>',
        description: 'init: create the skill in this workspace.',
      },
      view: {
        value: '[human | json | mermaid]',
        description: 'Output format. mermaid: list only.',
      },
    },
  })

const plural = (n: number, s: string) =>
  `${n} ${s}${n === 1 ? '' : 's'}`

const lines = (header: string, items: string[]) =>
  [header, ...items.map(i => `  ${i}`)].join('\n')

// warnings shared by list and link
const notes = (
  r: UnscannedSkills & { skipped?: string[]; gitignore?: string[] },
) => [
  ...(r.skipped ? [`⚠️ Skipped ${r.skipped.join(', ')}`] : []),
  ...(r.gitignore ?
    [`⚠️ Could not update ${r.gitignore.join(', ')}`]
  : []),
  ...unscannedLines(r),
]

// `vlt ls` style
const pkgLabel = (s: Skill) => {
  const pkg = s.version ? `${s.name}@${s.version}` : s.name
  return s.alias ? `${s.alias} (${pkg})` : pkg
}

const linkedSuffix = (s: Skill, dirs: string[]) =>
  dirs.length && dirs.every(d => s.linked.includes(d)) ? ' (linked)'
  : s.linked.length ? ` (linked in ${s.linked.join(', ')})`
  : ''

const row = (s: Skill, dirs: string[]) =>
  `${s.skill} (${pkgLabel(s)})${linkedSuffix(s, dirs)}`

const listNotes = (r: ListSkillsResult) => [
  ...(!r.dirs.length && !r.skipped ?
    ['No agent skill dirs: skills-dir is empty']
  : []),
  ...notes(r),
]

// colors as `vlt ls` / `vlt query`: linked skills = selected nodes
const humanList = (
  r: ListSkillsResult,
  { colors }: ViewOptions = {},
) => {
  const style =
    (format: 'reset' | 'yellow') =>
    (s: string): string =>
      colors ? styleText(format, s, { validateStream: false }) : s
  const yellow = style('yellow')
  const rows = r.skills.map(s => {
    const x = row(s, r.dirs)
    return s.linked.length ? yellow(x) : x
  })
  const last = rows.length - 1
  return [
    ...(rows.length ?
      [
        style('reset')(
          [
            r.project,
            ...rows.map(
              (x, i) => `${i === last ? '└──' : '├──'} ${x}`,
            ),
          ].join('\n'),
        ),
      ]
    : ['No agent skills found in installed packages.']),
    ...listNotes(r),
  ].join('\n')
}

// the dependency graph down to each package, its skills as leaves
const mermaidList = (r: ListSkillsResult) => {
  const children = new Map<DepID, MermaidChild[]>()
  for (const s of r.skills) {
    const list = children.get(s.id) ?? []
    list.push({
      edge: pkgLabel(s),
      label: `${s.skill}${linkedSuffix(s, r.dirs)}`,
    })
    children.set(s.id, list)
  }
  const { graph } = r
  return [
    mermaidOutput({
      edges: [],
      importers: new Set([graph.mainImporter]),
      nodes: [...graph.nodes.values()].filter(
        n => n === graph.mainImporter || children.has(n.id),
      ),
      children,
    }),
    ...listNotes(r).map(n => `%% ${n}`),
  ].join('\n')
}

// `name`: the skill, `dependency-name`: the dep it's installed as,
// `package-id`: its package
const jsonSkill = ({
  skill,
  name,
  alias,
  version,
  id,
  description,
  ...rest
}: Skill) => ({
  name: skill,
  description,
  'dependency-name': alias ?? name,
  'package-id': id,
  ...rest,
})

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

const humanInit = (r: Extract<SkillsResult, { action: 'init' }>) => {
  const rel = (p: string) => relative(process.cwd(), p)
  if (r.exists) {
    return `SKILL.md already exists at ${rel(r.skill.path)}`
  }
  return [
    `Wrote SKILL.md to ${r.skill.path}`,
    ...(r.manifest ?
      [`Added "${r.manifest.added}" to ${rel(r.manifest.path)} files`]
    : []),
    '',
    `Edit ${rel(r.skill.path)}: its description and instructions.`,
    'Check the skill ships with `vlt pack --dry-run`.',
    ...(r.query ?
      [
        'Projects that install this package link it with:',
        '',
        `  vlt install ${r.package} --allow-skills="${r.query}"`,
      ]
    : []),
  ].join('\n')
}

// the project root, or the one workspace -w selects
const initDir = (conf: LoadedConfig) => {
  if (
    !conf.get('workspace')?.length &&
    !conf.get('workspace-group')?.length
  ) {
    return conf.projectRoot
  }
  const found = [
    ...(conf.options.monorepo?.filter(conf.values) ?? []),
  ]
  const [one] = found
  if (!one || found.length > 1) {
    throw error('Select a single workspace', {
      code: 'EUSAGE',
      found: found.map(w => w.path),
    })
  }
  return one.fullpath
}

const human = (r: SkillsResult, o?: ViewOptions): string =>
  r.action === 'list' ? humanList(r, o)
  : r.action === 'unchanged' ? 'No changes made.'
  : r.action === 'init' ? humanInit(r)
  : [
      humanLink(r),
      ...unmatchedLines(r.unmatched),
      ...(r.saved ? [savedLine(r.query, r.saved)] : []),
    ].join('\n')

export const views = {
  human,
  json: (r: SkillsResult) => {
    if (r.action !== 'list') return r
    // key order kept
    const { project, graph, ...rest } = r
    return { ...rest, skills: rest.skills.map(jsonSkill) }
  },
  mermaid: (r: SkillsResult) =>
    r.action === 'list' ? mermaidList(r) : human(r),
} as const satisfies Views<SkillsResult>

const defaultQuery = ':not(:malware)'

const where = (which: WhichConfig) =>
  which === 'user' ?
    'in the user vlt.json'
  : 'for this project (vlt.json)'

// the query to link; undefined: no changes
const pickQuery = async (
  conf: LoadedConfig,
  given?: string,
): Promise<string | undefined> => {
  const check = (q: string) =>
    assertQuery(q, 'allow-skills', ['skill'])
  const stored = storedAllowSkills(conf)
  const yes = !!conf.get('yes')
  const tty = interactive()
  if (given) {
    await check(given)
    if (!stored || stored.query === given || yes) return given
    if (!tty) {
      throw error(
        `allow-skills is already set (${configLabel(stored.which)}): "${stored.query}"; pass -y to replace it`,
        { code: 'EUSAGE', found: given, wanted: stored.query },
      )
    }
    if (
      !(await confirm(
        `allow-skills is already set ${where(stored.which)}: "${stored.query}". Replace it? [y/N] `,
      ))
    ) {
      return undefined
    }
    return editQuery({ current: stored.query, prefill: given, check })
  }
  if (stored) {
    if (yes || !tty) return stored.query
    const edit = await confirm(
      `allow-skills is set ${where(stored.which)}: "${stored.query}". Edit it? [y/N] `,
    )
    // ctrl+C/D: cancel
    if (edit === undefined) return undefined
    return edit ?
        editQuery({
          current: stored.query,
          prefill: stored.query,
          check,
        })
      : stored.query
  }
  if (yes || !tty) return defaultQuery
  return editQuery({ prefill: defaultQuery, check })
}

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
    case 'link': {
      const query = await pickQuery(conf, target)
      if (query === undefined) return { action: 'unchanged' }
      const res = await linkSkills({
        ...opts,
        target: query,
        apply: true,
      })
      // after linking: a link error saves nothing
      let saved: WhichConfig | undefined
      if (storedAllowSkills(conf)?.query !== query) {
        saved = configWriteTarget(conf, 'project')
        await conf.addConfigToFile(saved, { 'allow-skills': query })
      }
      return {
        action: 'link',
        query,
        ...(saved && { saved }),
        ...res,
      }
    }
    case 'init': {
      const res = initSkill({ cwd: initDir(conf), name: query })
      const allow =
        res.package &&
        (query ?
          `#${res.package}:skill(${query})`
        : `#${res.package}`)
      return {
        action: 'init',
        ...res,
        ...(allow && { query: allow }),
      }
    }
    default:
      throw error('Unknown skills subcommand', {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['list', 'ls', 'link', 'init'],
      })
  }
}
