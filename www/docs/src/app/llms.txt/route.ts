import { llms } from 'fumadocs-core/source'
import { source } from '@/lib/source'
import { siteUrl } from '@/lib/site-url'

const md = (path: string) => new URL(`${path}.md`, siteUrl).href

// the llms.txt shape: a title, a one-line summary, how to use the docs, then the page index
const intro = `# vlt docs

> Documentation for vlt, the package registry built for JavaScript: the vlt.io registry (private packages, npm mirrors, access control, tokens) and the \`vlt\` client, an npm-compatible package manager.

Every page is available as Markdown: append \`.md\` to its URL, or request the page with an \`Accept: text/markdown\` header. The links below point at the Markdown versions. [llms-full.txt](${new URL('/llms-full.txt', siteUrl).href}) holds every page except the generated API reference in one file.

## Using these docs

- New to the registry: start at [Quick Start](${md('/registry')}). New to the client: start at [Getting Started with the vlt CLI](${md('/client')}).
- Commands and config: [CLI Commands](${md('/client/commands')}) links every command's page; [Configuring the vlt CLI](${md('/client/configuring')}) covers options and config files. [Reference](${md('/reference')}) is a glossary of terms.
- Before running anything that changes a vlt.io account (publishing, unpublishing, deprecating packages, changing access, or creating and revoking tokens), confirm with the user first.

## Pages
`

// drop typedoc's `_media` README copies, which the sidebar hides too; point links at the markdown twins
export const GET = async () =>
  new Response(
    intro +
      (await llms(source).index())
        .split('\n')
        .filter(line => !line.includes('_media'))
        .slice(1) // fumadocs' own `# Docs` heading
        .join('\n')
        .replace(
          /\]\((\/[^)]*)\)/g,
          (_, path: string) => `](${md(path)})`,
        ),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
