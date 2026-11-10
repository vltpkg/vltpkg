import { Fragment } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { createHighlighter } from 'shiki'
import { CodeCard } from '@/components/code-card'

// every lang the content uses; anything else (mermaid, none, typos) renders as plain text
const langs = [
  'ts',
  'js',
  'json',
  'jsonc',
  'bash',
  'ini',
  'yaml',
  'toml',
  'markdown',
]
const themes = { light: 'github-light', dark: 'vesper' }
// one highlighter per server process; highlighting happens here, so no shiki ships to the browser
const highlighter = createHighlighter({
  themes: Object.values(themes),
  langs,
})

export type CodeSource = {
  code: string
  lang?: string
  title?: string
}

// a tab for CodeCard: the code without its trailing newline, and shiki's tokens for it
const highlight = async ({
  code: raw,
  lang = 'text',
  title,
}: CodeSource) => {
  const code = raw.replace(/\n$/, '')
  const shiki = await highlighter
  // no default colour: tokens carry --shiki-light / --shiki-dark, CodeCard picks one per theme
  const [pre] = shiki.codeToHast(code, {
    lang: shiki.getLoadedLanguages().includes(lang) ? lang : 'text',
    themes,
    defaultColor: false,
  }).children
  // CodeCard owns the <pre>; keep shiki's <code> and its token spans
  const content = toJsxRuntime(
    {
      type: 'root',
      children: pre.type === 'element' ? pre.children : [],
    },
    { Fragment, jsx, jsxs },
  )
  return { code, lang, title, content }
}

// shiki's tokenizer reads Date.now(), which cacheComponents rejects in an uncached prerender, hence "use cache"
export const CodeBlock = async ({
  children,
  className,
  ...source
}: Omit<CodeSource, 'code'> & {
  children: string
  className?: string
}) => {
  'use cache'
  return (
    <CodeCard
      tabs={[await highlight({ code: children, ...source })]}
      className={className}
    />
  )
}

// several blocks as one card, one tab each
export const CodeTabs = async ({ tabs }: { tabs: CodeSource[] }) => {
  'use cache'
  return <CodeCard tabs={await Promise.all(tabs.map(highlight))} />
}
