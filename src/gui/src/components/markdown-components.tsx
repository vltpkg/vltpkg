import ReactMarkdown from 'react-markdown'
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableFooter,
} from '@/components/ui/table.tsx'
import { CodeBlock } from '@/components/ui/code-block.tsx'
import { InlineCode } from '@/components/ui/inline-code.tsx'

// react-markdown plugins
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

import type { Components, Options } from 'react-markdown'

export const Markdown = (options: Readonly<Options>) => {
  const { children } = options
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeRaw,
        [
          rehypeSanitize,
          {
            ...defaultSchema,
            attributes: {
              ...defaultSchema.attributes,
              '*': ['className', 'style', 'align', 'height', 'width'],
              img: [
                'src',
                'alt',
                'title',
                'width',
                'height',
                'align',
              ],
              a: ['href', 'name', 'target', 'rel'],
            },
          },
        ],
      ]}
      skipHtml={false}
      components={markdownComponents}>
      {children}
    </ReactMarkdown>
  )
}

export const markdownComponents: Components = {
  a: props => {
    const { node, children, className, ...rest } = props
    const containsImgs = node?.children.some(child => {
      if ('tagName' in child) {
        return child.tagName === 'img'
      }
    })

    if (!containsImgs) {
      return (
        <a
          {...rest}
          target="_blank"
          rel="noopener noreferrer"
          className="font-normal text-blue-600 no-underline hover:underline">
          {children}
        </a>
      )
    } else {
      return (
        <a
          {...rest}
          className="align-center inline-block h-fit"
          target="_blank"
          rel="noopener noreferrer">
          {children}
        </a>
      )
    }
  },
  img: ({ children, ...props }) => (
    <img
      {...props}
      className="!my-0 inline-block h-auto max-w-full rounded-md">
      {children}
    </img>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      {...props}
      className="border-primary/6 text-muted-foreground my-4 border-l-4 pl-4 italic">
      {children}
    </blockquote>
  ),
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      className="!my-0 inline-block w-full max-w-full overflow-x-auto bg-transparent p-0">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const match = /language-([\w-]+)/.exec(className ?? '')

    const codeText =
      Array.isArray(children) ?
        children
          .filter((c): c is string => typeof c === 'string')
          .join('')
      : typeof children === 'string' ? children
      : ''

    return match ?
        <CodeBlock
          hideFileName
          hideCopy
          filename=""
          className="not-prose bg-background rounded-lg border"
          language={match[1] ?? 'md'}
          code={codeText.replace(/\n$/, '')}
        />
      : <InlineCode className="bg-background text-foreground inline-block h-fit max-w-full overflow-x-auto rounded-md px-1.5 py-0 align-middle font-mono text-inherit before:content-none after:content-none">
          {children}
        </InlineCode>
  },
  table: ({ ...props }) => (
    <div className="my-6 w-full overflow-y-auto">
      <Table
        {...props}
        className="border-collapse border-spacing-0"
      />
    </div>
  ),
  tbody: ({ ...props }) => <TableBody {...props} />,
  td: ({ ...props }) => (
    <TableCell
      {...props}
      className="border-primary/6 border px-4 py-2"
    />
  ),
  thead: ({ ...props }) => (
    <TableHeader
      {...props}
      className="bg-background-secondary font-medium"
    />
  ),
  th: ({ ...props }) => (
    <TableHead
      {...props}
      className="border-primary/6 text-foreground border px-4 py-2 font-medium"
    />
  ),
  tr: ({ ...props }) => (
    <TableRow {...props} className="border-primary/6 border-t" />
  ),
  tfoot: ({ ...props }) => <TableFooter {...props} />,
  hr: ({ ...props }) => (
    <hr
      {...props}
      className="border-primary/6 bg-background-secondary my-8 h-px border-0"
    />
  ),
  ul: ({ ...props }) => (
    <ul {...props} className="my-4 list-disc space-y-1 pl-6" />
  ),
  ol: ({ ...props }) => (
    <ol {...props} className="my-4 list-decimal space-y-1 pl-6" />
  ),
  li: ({ ...props }) => <li {...props} className="pl-1" />,
  h1: ({ ...props }) => (
    <h1
      {...props}
      className="border-primary/6 mt-2 mb-4 border-b pb-2 text-3xl font-medium"
    />
  ),
  h2: ({ ...props }) => (
    <h2
      {...props}
      className="border-primary/6 mt-6 mb-4 border-b pb-2 text-2xl font-medium"
    />
  ),
  h3: ({ ...props }) => (
    <h3 {...props} className="mt-6 mb-4 text-xl font-medium" />
  ),
  h4: ({ ...props }) => (
    <h4 {...props} className="mt-6 mb-4 text-lg font-medium" />
  ),
  h5: ({ ...props }) => (
    <h5 {...props} className="mt-6 mb-4 text-base font-medium" />
  ),
  h6: ({ ...props }) => (
    <h6
      {...props}
      className="mt-6 mb-4 text-sm font-medium text-neutral-500"
    />
  ),
  p: ({ ...props }) => (
    <p {...props} className="my-4 block leading-7" />
  ),
}
