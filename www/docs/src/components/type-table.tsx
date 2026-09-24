import { Children, isValidElement } from 'react'

type Children = { children?: React.ReactNode }

// first-column headers typedoc-plugin-markdown emits for its parameter/property/member tables
const apiHeaders = new Set([
  'Parameter',
  'Type Parameter',
  'Property',
  'Event',
  'Member',
  'Name',
])

const firstChildren = (node: React.ReactNode) =>
  Children.toArray(node).find(isValidElement<Children>)?.props
    .children

// MDX hands server components unrendered children, so the header cell reads as table > thead > tr > th > text
const firstHeader = (children: React.ReactNode) => {
  const text = firstChildren(firstChildren(firstChildren(children)))
  return typeof text === 'string' ? text : undefined
}

const card =
  'not-first:mt-(--typeset-flow) overflow-x-auto rounded-(--radius) border [&_thead_th]:bg-muted'
const plain = `${card} [&_:is(th,td):first-child]:ps-[1em]`
// generated API tables: smaller, muted, with the member name's code standing out
const api = `${card} [&_:is(th,td)]:px-[0.75em] [&_td]:text-muted-foreground [&_td_code]:p-0 [&_td_code]:text-[1em] [&_td_code]:[background:none] [&_td:first-child_code:first-of-type]:font-medium [&_td:first-child_code:first-of-type]:text-foreground [&_thead_th]:text-muted-foreground`

// every markdown table becomes a bordered card that scrolls inside itself; generated API tables get TypeTable styling
export const TypeTable = (props: React.ComponentProps<'table'>) => {
  const isApi = apiHeaders.has(firstHeader(props.children) ?? '')
  return (
    <div className={isApi ? api : plain}>
      <table
        {...props}
        className={
          isApi ?
            'm-0 w-full border-0 text-[0.875em]'
          : 'm-0 w-full border-0'
        }
      />
    </div>
  )
}
