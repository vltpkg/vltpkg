import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { frontmatter } from 'fumadocs-core/content/md/frontmatter'

const tree = 'https://github.com/vltpkg/vltpkg/tree/main'

const install = (name: string) =>
  `vlx skills add vltpkg/vltpkg -- --skill ${name}`

// skills live in the repo's skills/, where `vlx skills add` finds them; scripts/skills.mts
// copies them into public/, which serves them as-is. read at build time for llms.txt and llms-full.txt
const skill = (name: string) => {
  const dir = `/skills/${name}`
  const url = `${dir}/SKILL.md`
  const file = join(process.cwd(), 'public', url)
  if (!existsSync(file))
    throw new Error(
      `${url}: not in public/, run scripts/skills.mts (prebuild, predev)`,
    )
  const { data, content } = frontmatter(readFileSync(file, 'utf8'))
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
    github: `${tree}${dir}`,
    install: install(name),
    description,
    content: content.trim(),
  }
}

export const registryMigrationSkill = skill('vlt-registry-migration')

export const skills = [registryMigrationSkill]

// ships in @vltpkg/query; .claude-plugin/plugin.json lists it for `vlx skills add`
export const dssQuerySkill = {
  name: 'dss-query',
  github: `${tree}/src/query/skills/dss-query`,
  install: install('dss-query'),
  description:
    'Composes and explains vlt query selectors, including Socket-powered security audits.',
}
