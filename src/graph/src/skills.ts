import { load as actualLoad } from './actual/load.ts'
import type { LoadOptions } from './actual/load.ts'
import type { Graph } from './graph.ts'
import type { Node } from './node.ts'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { error } from '@vltpkg/error-cause'
import { mkdir, readdir, symlink, unlink } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { existsSync, lstatSync } from 'node:fs'
import type { DepID } from '@vltpkg/dep-id'

/**
 * A discovered skill from a package
 */
export interface DiscoveredSkill {
  packageName: string
  packagePath: string
  files: string[]
}

/**
 * Result of a skills operation
 */
export interface SkillsResult {
  action: 'list' | 'link' | 'unlink'
  discovered: DiscoveredSkill[]
  linked: DiscoveredSkill[]
  unlinked: DiscoveredSkill[]
}

/**
 * Skills operation options
 */
export interface SkillsOptions extends LoadOptions {
  action: 'list' | 'link' | 'unlink'
  target?: string
}

/**
 * Common skill file names to look for
 */
const SKILL_FILE_PATTERNS = [
  'skills.md',
  'SKILL.md',
  'Skills.md',
  'SKILLS.md'
]

/**
 * Check if a file name matches a skill file pattern
 */
const isSkillFile = (filename: string): boolean => {
  return SKILL_FILE_PATTERNS.includes(filename) || filename.endsWith('.skill.md')
}

/**
 * Discover skill files in a package directory
 */
const discoverSkillsInPackage = async (packagePath: string): Promise<string[]> => {
  try {
    const entries = await readdir(packagePath)
    return entries.filter(isSkillFile)
  } catch {
    return []
  }
}

/**
 * Filter nodes using a DSS query string
 */
const filterNodesByQuery = async (
  graph: Graph,
  target: string = '*',
): Promise<Set<DepID>> => {
  // shortcut no packages included
  if (target === ':not(*)') {
    return new Set()
  }
  // shortcut all packages included
  if (target === '*') {
    return new Set(graph.nodes.keys())
  }

  const securityArchive =
    Query.hasSecuritySelectors(target) ?
      await SecurityArchive.start({
        nodes: [...graph.nodes.values()],
      })
    : undefined

  const edges = graph.edges
  const nodes = new Set(graph.nodes.values())
  const importers = graph.importers

  const query = new Query({
    edges,
    nodes,
    importers,
    securityArchive,
  })

  const { nodes: resultNodes } = await query.search(
    target,
    {
      signal: new AbortController().signal,
    },
  )

  return new Set(resultNodes.map(node => node.id))
}

/**
 * Discover skills from all packages in the graph
 */
const discoverSkills = async (
  graph: Graph,
  targetIds: Set<DepID>,
  scurry: LoadOptions['scurry']
): Promise<DiscoveredSkill[]> => {
  const discovered: DiscoveredSkill[] = []

  for (const node of graph.nodes.values()) {
    // Skip if not in target set
    if (!targetIds.has(node.id)) continue

    // Skip root/workspace packages
    if (node.isProjectRoot() || node.isWorkspace()) continue

    const packagePath = node.resolvedLocation(scurry)
    const skillFiles = await discoverSkillsInPackage(packagePath)

    if (skillFiles.length > 0) {
      discovered.push({
        packageName: node.name,
        packagePath,
        files: skillFiles,
      })
    }
  }

  return discovered
}

/**
 * Create symlinks for skills in the project's skills directory
 */
const linkSkills = async (
  skills: DiscoveredSkill[],
  projectRoot: string
): Promise<DiscoveredSkill[]> => {
  const skillsRoot = resolve(projectRoot, 'skills')
  const linked: DiscoveredSkill[] = []

  for (const skill of skills) {
    try {
      const skillDir = resolve(skillsRoot, skill.packageName)
      
      // Create the skills directory structure
      await mkdir(skillDir, { recursive: true })

      // Link each skill file
      for (const file of skill.files) {
        const sourceFile = resolve(skill.packagePath, file)
        const linkFile = resolve(skillDir, file)

        // Remove existing link if it exists
        if (existsSync(linkFile)) {
          try {
            await unlink(linkFile)
          } catch {
            // Ignore errors if file doesn't exist
          }
        }

        // Create relative symlink
        const relativePath = relative(dirname(linkFile), sourceFile)
        await symlink(relativePath, linkFile)
      }

      linked.push(skill)
    } catch (err) {
      // Log error but continue with other packages
      console.error(`Failed to link skills for ${skill.packageName}:`, err)
    }
  }

  return linked
}

/**
 * Remove symlinks for skills
 */
const unlinkSkills = async (
  skills: DiscoveredSkill[],
  projectRoot: string
): Promise<DiscoveredSkill[]> => {
  const skillsRoot = resolve(projectRoot, 'skills')
  const unlinked: DiscoveredSkill[] = []

  for (const skill of skills) {
    try {
      const skillDir = resolve(skillsRoot, skill.packageName)
      
      if (existsSync(skillDir)) {
        // Remove each skill file symlink
        for (const file of skill.files) {
          const linkFile = resolve(skillDir, file)
          if (existsSync(linkFile)) {
            await unlink(linkFile)
          }
        }

        // Try to remove the directory if empty
        try {
          const entries = await readdir(skillDir)
          if (entries.length === 0) {
            await unlink(skillDir)
          }
        } catch {
          // Directory not empty or other error, ignore
        }

        unlinked.push(skill)
      }
    } catch (err) {
      // Log error but continue with other packages
      console.error(`Failed to unlink skills for ${skill.packageName}:`, err)
    }
  }

  return unlinked
}

/**
 * Main skills function - discovers and manages skills from installed packages
 */
export const skills = async (options: SkillsOptions): Promise<SkillsResult> => {
  const { action, target = '*', projectRoot } = options

  // Load the current graph
  const graph = actualLoad({
    ...options,
    loadManifests: true,
  })

  // Filter packages by target query
  const targetIds = await filterNodesByQuery(graph, target)

  // Discover skills from the filtered packages
  const discovered = await discoverSkills(graph, targetIds, options.scurry)

  const result: SkillsResult = {
    action,
    discovered,
    linked: [],
    unlinked: [],
  }

  if (action === 'list') {
    // Just return discovered skills
    return result
  } else if (action === 'link') {
    // Link the discovered skills
    result.linked = await linkSkills(discovered, projectRoot)
  } else if (action === 'unlink') {
    // Unlink the discovered skills
    result.unlinked = await unlinkSkills(discovered, projectRoot)
  } else {
    throw error(`Unknown skills action: ${action}`)
  }

  return result
}