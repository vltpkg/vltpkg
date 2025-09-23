import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneLight,
  atomDark,
} from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { useTheme } from '@/components/ui/theme-provider.tsx'
import { cn } from '@/lib/utils.ts'

type CodeBlockProps = {
  language: string
  filename: string
  hideFileName?: boolean
  hideCopy?: boolean
  deepLinkLines?: boolean
  className?: string
  selectedLines?: [number, number] | null
  onSelectedLinesChange?: (sel: [number, number] | null) => void
  code: string
}

export const CodeBlock = ({
  language,
  className,
  code,
  deepLinkLines = false,
  selectedLines: controlledSelected,
  onSelectedLinesChange,
}: CodeBlockProps) => {
  const { resolvedTheme } = useTheme()
  const [uncontrolledSelected, setUncontrolledSelected] =
    React.useState<[number, number] | null>(null)
  const isDeepLinkEnabled = deepLinkLines
  const selectedLines =
    isDeepLinkEnabled ?
      controlledSelected !== undefined ?
        controlledSelected
      : uncontrolledSelected
    : null
  const setSelectedLines = (sel: [number, number] | null) => {
    if (!isDeepLinkEnabled) return
    if (onSelectedLinesChange) onSelectedLinesChange(sel)
    if (controlledSelected === undefined) setUncontrolledSelected(sel)
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-lg bg-inherit px-4 font-mono text-sm',
        className,
      )}>
      <SyntaxHighlighter
        language={language}
        style={resolvedTheme === 'light' ? oneLight : atomDark}
        customStyle={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          fontSize: '0.813rem',
        }}
        wrapLines={true}
        showLineNumbers={true}
        lineProps={lineNumber => {
          const isSelected =
            !!selectedLines &&
            lineNumber >= selectedLines[0] &&
            lineNumber <= selectedLines[1]
          return {
            className: cn(
              'cursor-default transition-all duration-300 ease-out px-2 py-0.5 -mx-2 select-none transform-gpu',
              isDeepLinkEnabled &&
                '[&>.linenumber]:!cursor-pointer [&>.linenumber]:hover:!text-foreground',
              isDeepLinkEnabled &&
                'hover:bg-gray-100/5 hover:backdrop-blur-sm',
              isSelected && [
                'bg-gradient-to-r from-blue-500/10 to-blue-500/5',
                'border-l-2 border-blue-400/80 pl-2 ml-0',
                'shadow-sm shadow-blue-500/10',
                'scale-[1.002] translate-x-0.5',
              ],
            ),
            id: `line-${lineNumber}`,
            onClick:
              isDeepLinkEnabled ?
                e => {
                  const el = e.target as HTMLElement | null
                  const clickedNumber = el?.closest(
                    '.linenumber, .react-syntax-highlighter-line-number',
                  )
                  if (!clickedNumber) return
                  const prev = selectedLines
                  if (!prev) {
                    setSelectedLines([lineNumber, lineNumber])
                    return
                  }
                  const [start, end] = prev
                  if (lineNumber >= start && lineNumber <= end) {
                    setSelectedLines(null)
                    return
                  }
                  const nextStart = Math.min(start, lineNumber)
                  const nextEnd = Math.max(start, lineNumber)
                  setSelectedLines([nextStart, nextEnd])
                }
              : undefined,
            style: {
              display: 'block',
              width: '100%',
              transition:
                'all 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
          }
        }}
        PreTag="div">
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
