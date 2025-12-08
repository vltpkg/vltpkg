import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { visit } from 'unist-util-visit'

interface Node {
  type: string
}

interface ImageNode extends Node {
  type: 'image'
  url: string
}

interface LinkNode extends Node {
  type: 'link'
  url: string
}

interface HtmlNode extends Node {
  type: 'html'
  value: string
}

const resolvePath = (dir: string, file: string) => {
  const parts = dir.split('/').filter(Boolean)
  const fileParts = file.split('/')

  for (const part of fileParts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  return parts.join('/')
}

export const parseReadme = async (
  content: string,
  repo: { org: string; repo: string },
  ref: string,
  directory?: string,
): Promise<string> => {
  const file = await unified()
    .use(remarkParse)
    .use(() => tree => {
      const transformUrl = (url: string, type: 'image' | 'link') => {
        if (
          !/^https?:\/\//.test(url) &&
          !url.startsWith('//') &&
          !url.startsWith('#') &&
          !url.startsWith('mailto:')
        ) {
          const cleanUrl = url

          let path = cleanUrl
          if (path.startsWith('/')) {
            // Relative to repo root, ignore directory
            path = path.slice(1)
          } else {
            // Relative to file, use directory
            if (directory) {
              path = resolvePath(directory, path)
            }
          }

          // Remove ./ if still at start (resolvePath handles it, but if no directory...)
          if (path.startsWith('./')) {
            path = path.slice(2)
          }

          if (type === 'image') {
            return `https://raw.githubusercontent.com/${repo.org}/${repo.repo}/${ref}/${path}`
          } else {
            return `https://github.com/${repo.org}/${repo.repo}/blob/${ref}/${path}`
          }
        }
        return url
      }

      visit(tree, 'image', (node: ImageNode) => {
        if (node.url) {
          node.url = transformUrl(node.url, 'image')
        }
      })

      visit(tree, 'link', (node: LinkNode) => {
        if (node.url) {
          node.url = transformUrl(node.url, 'link')
        }
      })

      visit(tree, 'html', (node: HtmlNode) => {
        // Image replacement
        const imgRegex =
          /(<img\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi
        node.value = node.value.replace(
          imgRegex,
          (
            _match: string,
            prefix: string,
            src: string,
            suffix: string,
          ) => {
            const newUrl = transformUrl(src, 'image')
            return `${prefix}${newUrl}${suffix}`
          },
        )

        // Link replacement
        const linkRegex =
          /(<a\s+[^>]*href=["'])([^"']+)(["'][^>]*>)/gi
        node.value = node.value.replace(
          linkRegex,
          (
            _match: string,
            prefix: string,
            href: string,
            suffix: string,
          ) => {
            const newUrl = transformUrl(href, 'link')
            return `${prefix}${newUrl}${suffix}`
          },
        )
      })
    })
    .use(remarkStringify)
    .process(content)

  return String(file)
}
