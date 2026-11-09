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

// the plugin adds the title, summary and its own "Every page is also Markdown" line; its llms-full line would claim
// every page, so ours (which says what's left out) leads instead
const intro = `[llms-full.txt](${abs('/llms-full.txt')}) holds every page except the generated API reference, plus the agent skills, in one file.

## Using these docs

- New to the registry: start at [Quick Start](${md('/registry')}). New to the client: start at [Getting Started with the vlt CLI](${md('/client')}); the [${vltCliSkill.name} skill](${abs(vltCliSkill.url)}) is a short map of the CLI for agents. Moving an existing repository onto a vlt.io registry: follow the [${registryMigrationSkill.name} skill](${abs(registryMigrationSkill.url)}).
- Commands and config: [CLI Commands](${md('/client/commands')}) links every command's page; [Configuring the vlt CLI](${md('/client/configuring')}) covers options and config files. [Reference](${md('/reference')}) is a glossary of terms.
- The site's own HTTP API (search, Markdown pages) is described at [openapi.json](${abs('/openapi.json')}).
- Before running anything that changes a vlt.io account (publishing, unpublishing, deprecating packages, changing access, or creating and revoking tokens), confirm with the user first.

## Agent skills

Follow a skill by reading its link. Skills with an \`Install:\` command can also be added to a project with the [skills CLI](https://skills.sh/docs/cli), or with vlt from the \`@vltpkg/skills\` package.

${skills.map(s => `- [${s.name}](${abs(s.url)}): ${s.description} Install: \`${s.install}\` or \`${s.installPackage}\``).join('\n')}`

type Section = { title: string; pages: LlmsLink[] }

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

// the sidebar tree, one section per group named by its path (Client / Commands); a group's pages that follow a
// nested group continue under the group's own name. typedoc's `_media` README copies stay out, as in the sidebar
const sections = () => {
  const out: Section[] = []
  const walk = (nodes: PageTree.Node[], trail: string[]) => {
    let current: Section | undefined
    for (const node of nodes) {
      if (node.type === 'separator') {
        trail = [name(node)]
        current = undefined
      } else if (node.type === 'folder') {
        if (node.name === '_media') continue
        walk(
          node.index ? [node.index, ...node.children] : node.children,
          [...trail, name(node)],
        )
        current = undefined
      } else {
        if (!current)
          out.push(
            (current = {
              title: trail.join(' / ') || 'Pages',
              pages: [],
            }),
          )
        current.pages.push(link(node))
      }
    }
  }
  walk(source.pageTree.children, [])
  return out
}

export const GET = createLlmsTxtHandler({
  title: 'vlt docs',
  summary:
    'Documentation for vlt, the package registry built for JavaScript: the vlt.io registry (private packages, npm mirrors, access control, tokens) and the `vlt` client, an npm-compatible package manager.',
  intro,
  full: false,
  sections,
})
