/** Build a SKILL.md-style frontmatter block for test fixtures. */
export const FRONTMATTER = (
  name: string,
  description = `${name} description`,
) => `---\nname: ${name}\ndescription: ${description}\n---\n`
