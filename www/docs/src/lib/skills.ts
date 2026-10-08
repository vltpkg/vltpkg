import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { frontmatter } from 'fumadocs-core/content/md/frontmatter'

const tree = 'https://github.com/vltpkg/vltpkg/tree/main'

// skills are served as-is from public/; read at build time for llms.txt and llms-full.txt
const skill = (name: string) => {
  const dir = `/skills/${name}`
  const url = `${dir}/SKILL.md`
  const { data, content } = frontmatter(
    readFileSync(join(process.cwd(), 'public', url), 'utf8'),
  )
  const { name: fmName, description } = data as Record<
    string,
    unknown
  >
  if (fmName !== name || typeof description !== 'string')
    throw new Error(
      `${url}: frontmatter needs name: ${name} and a description`,
    )
  return {
    name,
    url,
    github: `${tree}/www/docs/public${dir}`,
    description,
    content: content.trim(),
  }
}

export const registryMigrationSkill = skill('vlt-registry-migration')

export const skills = [registryMigrationSkill]

// lives with the query workspace, linked on GitHub
export const dssQuerySkill = {
  name: 'dss-query',
  github: `${tree}/src/query/skills/dss-query`,
  description:
    'Composes and explains vlt query selectors, including Socket-powered security audits.',
}
