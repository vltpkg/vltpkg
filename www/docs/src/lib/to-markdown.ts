import { getEntry, render } from 'astro:content'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import astroConfig from '../../astro.config.mts'
import reactRenderer from '@astrojs/react/server.js'
import mdxRenderer from '@astrojs/mdx/server.js'
import TurndownService from 'turndown'
// @ts-expect-error - @joplin/turndown-plugin-gfm ships without type declarations
import { gfm } from '@joplin/turndown-plugin-gfm'

export interface ToMarkdownProps {
  docId: string
  request: Request
}

/**
 * Convert a doc entry to markdown.
 * Renders the doc to HTML, then converts HTML to markdown using Turndown.
 */
export async function toMarkdown({
  docId,
  request,
}: ToMarkdownProps): Promise<string> {
  // Get the doc entry
  const entry = await getEntry('docs', docId)

  if (!entry || entry.data.draft) {
    throw new Error(`Doc not found or is a draft: ${docId}`)
  }

  // Create container to render Astro content with React/MDX support
  const container = await AstroContainer.create({
    astroConfig,
  })

  container.addServerRenderer({
    renderer: mdxRenderer,
    name: '@astrojs/mdx',
  })

  container.addServerRenderer({
    renderer: reactRenderer,
    name: '@astrojs/react',
  })

  container.addClientRenderer({
    name: '@astrojs/react',
    entrypoint: '@astrojs/react/client.js',
  })

  // Render the content to HTML
  const { Content } = await render(entry)

  const html = await container.renderToString(Content, {
    request,
  })

  // Create Turndown service with fenced code blocks
  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
    headingStyle: 'atx',
    bulletListMarker: '-',
  })

  // Use GitHub flavored markdown (tables, strikethrough, etc)
  turndownService.use(gfm as TurndownService.Plugin)

  // Add custom rules for better markdown conversion

  // Handle code blocks with language specification
  turndownService.addRule('codeBlock', {
    filter: node => {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild?.nodeName === 'CODE'
      )
    },
    replacement: (_content, node) => {
      const codeEl = node.firstChild as HTMLElement
      const lang = codeEl.getAttribute('data-language') || ''
      const code = codeEl.textContent || ''
      return `\n\`\`\`${lang}\n${code}\`\`\`\n`
    },
  })

  // Handle class-based code blocks (from Expressive Code)
  turndownService.addRule('expressiveCodeBlock', {
    filter: node => {
      return (
        node.nodeName === 'DIV' &&
        node.className.includes('expressive-code')
      )
    },
    replacement: content => {
      // Extract code from the complex HTML structure
      const codeMatch = /```[\s\S]*?```/m.exec(content)
      return codeMatch ? codeMatch[0] : content
    },
  })

  // Improve link handling
  turndownService.addRule('link', {
    filter: 'a',
    replacement: (content, node) => {
      const href = node.getAttribute('href') || ''
      const title = node.getAttribute('title') || ''
      const titleAttr = title ? ` "${title}"` : ''
      return `[${content}](${href}${titleAttr})`
    },
  })

  // Convert HTML to Markdown
  const markdown = turndownService.turndown(html)

  // Clean up common artifacts
  const cleaned = markdown
    // Remove multiple consecutive blank lines
    .replace(/\n\n\n+/g, '\n\n')
    // Remove trailing whitespace on lines
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')

  // Prepend page title if available
  const title = entry.data.title
  const withTitle = title ? `# ${title}\n\n${cleaned}` : cleaned

  return withTitle
}
