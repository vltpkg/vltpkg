import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import { skills } from '@vltpkg/graph'
import type { SkillsResult } from '@vltpkg/graph'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'skills',
    usage: ['[action]', '[--target=<query>]'],
    description: `Manage skills from installed packages.

    This command discovers skill files (skills.md, SKILL.md, *.skill.md) 
    from installed packages and symlinks them to the project's skills directory.
    
    Available actions:
    - list: Show discovered skills (default)
    - link: Link skills from packages to ./skills/
    - unlink: Remove skill symlinks
    
    Use --target option to filter packages using DSS query language syntax.`,
    options: {
      target: {
        value: '<query>',
        description:
          'Query selector to filter packages using DSS syntax.',
      },
    },
  })

export const views = {
  human: (result: SkillsResult): string => {
    const { discovered, linked, unlinked, action } = result
    const messages: string[] = []

    if (action === 'list') {
      if (discovered.length === 0) {
        messages.push('📝 No skills found in installed packages.')
      } else {
        messages.push(`📝 Found ${discovered.length} skill${discovered.length === 1 ? '' : 's'}:`)
        discovered.forEach(skill => {
          messages.push(`  ${skill.packageName}: ${skill.files.join(', ')}`)
        })
      }
    } else if (action === 'link') {
      if (linked.length === 0) {
        messages.push('📝 No skills to link.')
      } else {
        messages.push(`🔗 Linked ${linked.length} skill${linked.length === 1 ? '' : 's'}:`)
        linked.forEach(skill => {
          messages.push(`  ${skill.packageName} → ./skills/${skill.packageName}/`)
        })
      }
    } else if (action === 'unlink') {
      if (unlinked.length === 0) {
        messages.push('📝 No skills to unlink.')
      } else {
        messages.push(`🔓 Unlinked ${unlinked.length} skill${unlinked.length === 1 ? '' : 's'}:`)
        unlinked.forEach(skill => {
          messages.push(`  ${skill.packageName}`)
        })
      }
    }

    return messages.join('\n')
  },
  json: (result: SkillsResult) => result,
} as const satisfies Views<SkillsResult>

/**
 * Skills command implementation. Discovers and manages skill files
 * from installed packages.
 */
export const command: CommandFn<SkillsResult> = async conf => {
  const { options, projectRoot } = conf

  // Get action from first positional, default to 'list'
  const action = (conf.positionals[0] as 'list' | 'link' | 'unlink') || 'list'

  // Get target from option or default to all packages
  const targetOption = conf.get('target')
  const target = targetOption ? String(targetOption) : '*'

  // Run the skills operation using the graph skills function
  const result = await skills({
    ...options,
    projectRoot,
    packageJson: options.packageJson,
    monorepo: options.monorepo,
    scurry: options.scurry,
    action,
    target,
  })

  return result
}