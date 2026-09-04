import { parse as parseYaml } from 'yaml'
import { error } from '@vltpkg/error-cause'

/** Parse the `---...---` YAML frontmatter block of a SKILL.md file. */
export const parseSkillFrontmatter = (
  content: string,
  skillName: string,
): { name: string; description: string } => {
  const match = /^---\n([\s\S]*?)\n---/.exec(content)
  if (!match) {
    throw error(`${skillName}: SKILL.md has no frontmatter block`, {
      name: skillName,
    })
  }
  // match[1] is always defined here: the capturing group above is
  // mandatory, so a successful match always populates it.
  /* c8 ignore next */
  const parsed: unknown = parseYaml(match[1] ?? '')
  if (typeof parsed !== 'object' || parsed === null) {
    throw error(`${skillName}: SKILL.md frontmatter is not a map`, {
      name: skillName,
    })
  }
  const { name, description } = parsed as Record<string, unknown>
  if (typeof name !== 'string' || name === '') {
    throw error(
      `${skillName}: SKILL.md frontmatter is missing "name"`,
      { name: skillName },
    )
  }
  if (typeof description !== 'string' || description === '') {
    throw error(
      `${skillName}: SKILL.md frontmatter is missing "description"`,
      { name: skillName },
    )
  }
  return { name, description }
}
