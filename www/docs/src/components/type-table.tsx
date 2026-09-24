import { Children, isValidElement } from 'react'
import { Table } from '@/components/ui/table'

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

// the card clips the header tint to its rounded corners; ui/table's own container does the scrolling
const card =
  'not-first:mt-(--typeset-flow) overflow-hidden rounded-(--radius) border [&_thead]:bg-muted'
// generated API tables: muted, with the member name's code standing out
const api = `${card} [&_td]:text-muted-foreground [&_td_code]:p-0 [&_td_code]:text-[1em] [&_td_code]:[background:none] [&_td:first-child_code:first-of-type]:font-medium [&_td:first-child_code:first-of-type]:text-foreground [&_th]:text-muted-foreground`

// every markdown table becomes a bordered card that scrolls inside itself; generated API tables get TypeTable styling
export const TypeTable = (props: React.ComponentProps<'table'>) => (
  <div
    className={
      apiHeaders.has(firstHeader(props.children) ?? '') ? api : card
    }>
    <Table {...props} />
  </div>
)
