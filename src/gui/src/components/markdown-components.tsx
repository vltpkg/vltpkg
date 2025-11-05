import ReactMarkdown from 'react-markdown'
import { ArrowUpRight } from 'lucide-react'
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableFooter,
} from '@/components/ui/table.tsx'
import { cn } from '@/lib/utils.ts'
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { InlineCode } from '@/components/ui/inline-code.tsx'

// react-markdown plugins
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

import type { Components, Options } from 'react-markdown'

export const Markdown = (options: Readonly<Options>) => {
  const { children } = options
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      skipHtml={false}
      components={markdownComponents}>
      {children}
    </ReactMarkdown>
  )
}

export const markdownComponents: Components = {
  a: props => {
    const { node, children, ...rest } = props
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
          className="group relative mx-2 inline-flex text-blue-500">
          <span>{children}</span>
          <ArrowUpRight
            className="transition-transform duration-250 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
            size={14}
          />
        </a>
      )
    } else {
      return (
        <a {...rest} target="_blank">
          {children}
        </a>
      )
    }
  },
  img: ({ children, ...props }) => (
    <img {...props} className="my-0 block h-auto max-w-full">
      {children}
    </img>
  ),
  pre: ({ children, ...props }) => (
    <pre {...props} className="p-0">
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
        <SyntaxHighlighter
          PreTag="div"
          style={atomDark}
          wrapLongLines
          language={match[1]}
          children={codeText.replace(/\n$/, '')}
        />
      : <InlineCode>{children}</InlineCode>
  },
  p: ({ children, node, ...props }) => {
    return (
      <p {...props} className={cn('flex flex-wrap')}>
        {children}
      </p>
    )
  },
  ul: ({ children, ...props }) => (
    <ul {...props} className="flex flex-col gap-1">
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li {...props} className="list-disc">
      {children}
    </li>
  ),
  table: ({ ...props }) => <Table {...props} />,
  tbody: ({ ...props }) => <TableBody {...props} />,
  td: ({ ...props }) => <TableCell {...props} />,
  thead: ({ ...props }) => <TableHeader {...props} />,
  th: ({ ...props }) => <TableHead {...props} />,
  tr: ({ ...props }) => <TableRow {...props} />,
  tfoot: ({ ...props }) => <TableFooter {...props} />,
}
