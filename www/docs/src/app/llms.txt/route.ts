import { createLlmsTxtHandler } from '@affordances/md/next'
import type { LlmsLink } from '@affordances/md/next'
import type * as PageTree from 'fumadocs-core/page-tree'
import { source } from '@/lib/source'
import { siteUrl } from '@/lib/site-url'
import {
  registryMigrationSkill,
  skills,
  vltCliSkill,
} from '@/lib/skills'

const md = (path: string) => new URL(`${path}.md`, siteUrl).href
const abs = (path: string) => new URL(path, siteUrl).href

// `note` replaces the plugin's own lines, so it says its Markdown line again; the llms-full line says what's left out
const note = `Every page is also Markdown: add \`.md\` to its URL, or request it with \`Accept: text/markdown\`.

[llms-full.txt](${abs('/llms-full.txt')}) holds every page except the generated API reference, plus the agent skills, in one file.`

const intro = `## Using these docs

- New to the registry: start at [Quick Start](${md('/registry')}). New to the client: start at [Getting Started with the vlt CLI](${md('/client')}); the [${vltCliSkill.name} skill](${abs(vltCliSkill.url)}) is a short map of the CLI for agents. Moving an existing repository onto a vlt.io registry: follow the [${registryMigrationSkill.name} skill](${abs(registryMigrationSkill.url)}).
- Installing public npm packages with no vlt.io account or token: use the shared, read-only mirror at \`https://registry.vlt.io/upstream/npm/\` (usage limits apply; an account's own \`npm\` mirror has none), see [Public npm Mirror](${md('/registry/public-mirror')}). Other vlt.io registries need a token, including an account's own \`npm\` mirror; the only exception is reading packages published as public in an account's \`main\` registry. Every write needs a token.
- Commands and config: [CLI Commands](${md('/client/commands')}) links every command's page; [Configuring the vlt CLI](${md('/client/configuring')}) covers options and config files. [Reference](${md('/reference')}) is a glossary of terms.
- The site's own HTTP API (search, Markdown pages) is described at [openapi.json](${abs('/openapi.json')}).
- Before running anything that changes a vlt.io account (publishing, unpublishing, deprecating packages, changing access, or creating and revoking tokens), confirm with the user first.

## Agent skills

Follow a skill by reading its link. Skills with an \`Install:\` command can also be added to a project with the [skills CLI](https://skills.sh/docs/cli), or with vlt from the \`@vltpkg/skills\` package.

${skills.map(s => `- [${s.name}](${abs(s.url)}): ${s.description} Install: \`${s.install}\` or \`${s.installPackage}\``).join('\n')}`

type Section = {
  title: string
  pages: LlmsLink[]
  sections: Section[]
}

// tree names are react nodes; the sidebar's are all plain strings
const name = (node: PageTree.Node) =>
  typeof node.name === 'string' ? node.name : ''

// named and described like fumadocs' own llms index: the page's title, not its (shorter) sidebar label
const link = (item: PageTree.Item): LlmsLink => {
  const { title, description } = source.getNodePage(item)?.data ?? {}
  return {
    url: item.url,
    title: title ?? name(item),
    ...(description && { description }),
  }
}

// the sidebar tree as nested sections; typedoc's `_media` README copies stay out, as in the sidebar
const add = (into: Section, node: PageTree.Node) => {
  if (node.type === 'page') into.pages.push(link(node))
  else if (node.type === 'folder' && node.name !== '_media')
    into.sections.push(folder(node))
}

const folder = (node: PageTree.Folder): Section => {
  const out: Section = { title: name(node), pages: [], sections: [] }
  if (node.index) add(out, node.index)
  for (const child of node.children) add(out, child)
  return out
}

// top level, a separator heads what follows it
const sections = () => {
  let group: Section = { title: 'Pages', pages: [], sections: [] }
  const out = [group]
  for (const node of source.pageTree.children)
    if (node.type === 'separator')
      out.push(
        (group = { title: name(node), pages: [], sections: [] }),
      )
    else add(group, node)
  return out
}

export const GET = createLlmsTxtHandler({
  title: 'vlt docs',
  summary:
    'Documentation for vlt, the package registry built for JavaScript: the vlt.io registry (private packages, npm mirrors, access control, tokens) and the `vlt` client, an npm-compatible package manager.',
  note,
  intro,
  sections,
  publicCache: 'hours',
})
