import { update } from '@vltpkg/graph'
import type { LinkSkillsResult } from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import { saveAllowSkills } from '../allow-skills.ts'
import { planSpecConfigPersist } from '../persist-spec-config.ts'
import { asUnknownSpecPrefix } from '../require-registry.ts'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { lazyView } from '../view.ts'
import type { Views } from '../view.ts'
import type { InstallResult } from './install.ts'

export const needsRegistry = true
export const needsNpmRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'update',
    usage: ['[package ...]', '[--target=<query>]'],
    description: `Update dependencies to their latest in-range versions.
                  Discards the lockfile and resolves dependencies from scratch
                  (with -w: only matching workspaces' dependencies; with
                  package names or --target: only matching dependencies,
                  everything else keeps its locked version).`,
    examples: {
      'react react-dom': {
        description: 'Update react and react-dom, at any depth',
      },
      '--target=":root > *"': {
        description:
          'Update the direct dependencies of the project root',
      },
    },
    options: {
      target: {
        value: '<query>',
        description:
          'DSS query selecting the dependencies to update, in place of package names.',
      },
      workspace: {
        value: '<path|glob>',
        description:
          'Limit update to matching workspaces. Others, and deps they share, keep their locked versions.',
      },
      'workspace-group': {
        value: '<name>',
        description:
          'Limit update to workspace groups. Others, and deps they share, keep their locked versions.',
      },
      'save-config': {
        description:
          'Save registry and git host options given on the command line or via env (e.g. `--registries name=url`) to the project vlt.json, or the user vlt.json with --config=user.',
      },
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
      'allow-skills': {
        value: '<query>',
        description:
          "Link agent skills of packages matching this DSS query into the project's agent skill dirs. Saved to vlt.json.",
      },
    },
  })

// link mounts; `unchanged` left out
const skillsJson = ({
  linked,
  unchanged: _,
  ...rest
}: LinkSkillsResult) => ({
  linked: linked.map(s => s.mount),
  ...rest,
})

export const views = {
  json: i => ({
    ...(i.buildQueue?.length ?
      {
        buildQueue: i.buildQueue,
        message: `${i.buildQueue.length} packages that will need to be built, run "vlt build" to complete the update.`,
      }
    : null),
    graph: i.graph.toJSON(),
    ...(i.persistedConfig ?
      { persistedConfig: i.persistedConfig }
    : null),
    ...(i.skills ? { skills: skillsJson(i.skills) } : null),
    ...(i.allowSkills ? { allowSkills: i.allowSkills } : null),
  }),
  human: lazyView(
    async () =>
      (await import('./install/reporter.ts')).InstallReporter,
  ),
} as const satisfies Views<InstallResult>

// a package name, never a spec or query
const pkgName = /^(?:@[\w.-]+\/)?[\w.-]+$/

/**
 * package names compile to a `#name` query, `--target` is one. cli/env
 * only: a `target` in vlt.json config is not a selection
 */
const updateTarget = (conf: LoadedConfig): string | undefined => {
  const names = conf.positionals
  const target = conf.explicit.target
  if (target && names.length) {
    throw error('Use package names or --target, not both', {
      code: 'EUSAGE',
      found: names.join(' '),
    })
  }
  for (const name of names) {
    if (!pkgName.test(name)) {
      throw error(
        'vlt update takes package names, use --target for a query',
        { code: 'EUSAGE', found: name },
      )
    }
  }
  return target || names.map(n => `#${n}`).join(', ') || undefined
}

export const command: CommandFn<InstallResult> = async conf => {
  const target = updateTarget(conf)
  const persist = planSpecConfigPersist(conf)
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const { buildQueue, graph, skills } = await update({
    ...conf.options,
    allowScripts,
    target,
    allowSkills: conf.get('allow-skills'),
    skillsDirs: conf.get('skills-dir'),
  }).catch((er: unknown) => {
    throw asUnknownSpecPrefix(er)
  })
  if (persist)
    await conf.addConfigToFile(persist.which, persist.values)
  const allowSkillsSave = await saveAllowSkills(conf)
  return {
    buildQueue,
    graph,
    ...(persist ? { persistedConfig: persist } : null),
    ...(skills ? { skills } : null),
    ...(allowSkillsSave ? { allowSkills: allowSkillsSave } : null),
  }
}
