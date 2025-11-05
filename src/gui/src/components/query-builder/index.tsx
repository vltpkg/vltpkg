import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGraphStore } from '@/state/index.ts'
import { Button } from '@/components/ui/button.tsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipPortal,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { QUERY_BAR_ID } from '@/components/query-bar/index.tsx'
import { UnfoldVertical } from 'lucide-react'
import { BuilderCombobox } from '@/components/query-builder/builder.tsx'
import { Item } from '@/components/query-builder/item.tsx'
import {
  constructQuery,
  constructUiAst,
} from '@/components/query-builder/ast-interface.ts'
import { cn } from '@/lib/utils.ts'

import type { UiNode } from '@/components/query-builder/ui-node-types.ts'

export const QueryBuilder = () => {
  const queryBuilderOpen = useGraphStore(
    state => state.queryBuilderOpen,
  )
  const queryBuilderDisplay = useGraphStore(
    state => state.queryBuilderDisplay,
  )
  const updateQueryBuilderOpen = useGraphStore(
    state => state.updateQueryBuilderOpen,
  )
  const updateQueryBuilderDisplay = useGraphStore(
    state => state.updateQueryBuilderDisplay,
  )

  /**
   * Toggle whether the query builder should be open or closed
   * when the input is initially focused.
   */
  const toggleQueryBuilder = () => {
    updateQueryBuilderOpen(!queryBuilderOpen)
    if (!queryBuilderOpen) {
      updateQueryBuilderDisplay(true)
    } else {
      updateQueryBuilderDisplay(false)
    }
  }

  return (
    <>
      <QueryBuilderButton onClick={toggleQueryBuilder} />
      {queryBuilderDisplay && queryBuilderOpen && <QueryBuilderUi />}
    </>
  )
}

const QueryBuilderButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onClick}
              className="bg-input text-muted-foreground hover:text-accent-foreground flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-sm p-0 transition-colors duration-250 hover:bg-neutral-300 dark:hover:bg-neutral-700 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
              <UnfoldVertical />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Toggle query builder</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

const QueryBuilderUi = () => {
  const [mounted, setMounted] = useState<boolean>(false)
  const [nodes, setNodes] = useState<UiNode[] | undefined>(undefined)
  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)

  const updateQueryBuilderDisplay = useGraphStore(
    state => state.updateQueryBuilderDisplay,
  )
  const queryInputFocused = useGraphStore(
    state => state.queryInputFocused,
  )

  // Prevent ping-pong updates between input -> parse -> nodes -> serialize -> input
  const skipNextNodesEffect = useRef(false)
  const parseDebounceHandle = useRef<number | null>(null)

  const getQueryBarEl = (): HTMLElement => {
    const el = document.getElementById(QUERY_BAR_ID)
    if (!el) {
      throw new Error('Query bar element not found')
    }
    return el
  }

  // Handle clicks outside the query builder to close it
  const handleFocusGuardClick = () => {
    updateQueryBuilderDisplay(false)
  }

  // Delete an item from the nodes array and update the query
  const deleteItem = (idx: number) => {
    // If there are no nodes left, clear the query
    if (idx <= 0) {
      updateQuery('')
      return
    }
    setNodes(prevNodes => {
      if (!prevNodes) return prevNodes
      const newNodes = [...prevNodes]
      newNodes.splice(idx, 1)
      return newNodes.length > 0 ? newNodes : undefined
    })
  }

  // Construct the query string from the nodes
  useEffect(() => {
    if (skipNextNodesEffect.current) {
      skipNextNodesEffect.current = false
      return
    }
    if (nodes) {
      const constructedQueryString = constructQuery(nodes)
      if (constructedQueryString !== query) {
        updateQuery(constructedQueryString)
      }
    }
  }, [nodes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize the ast from the current query
  useEffect(() => {
    setMounted(true)
    try {
      // Debounce parsing to reduce lag while typing
      if (parseDebounceHandle.current) {
        window.clearTimeout(parseDebounceHandle.current)
      }
      parseDebounceHandle.current = window.setTimeout(() => {
        try {
          const uiAst = constructUiAst(query)
          // Mark that the next nodes effect comes from parsing the input, not from UI edits
          skipNextNodesEffect.current = true
          setNodes(uiAst)
        } catch (err) {
          // Swallow parse errors during typing (e.g., incomplete pseudo like :attr)
          // Keep previous nodes until query becomes valid again
          // Optionally we could setNodes(undefined) to clear view; keeping current for stability
          console.debug('QueryBuilder parse in-progress error:', err)
        }
      }, 60)
    } catch (e) {
      console.error('Error constructing UI AST:', e)
    }
    return () => {
      if (parseDebounceHandle.current) {
        window.clearTimeout(parseDebounceHandle.current)
        parseDebounceHandle.current = null
      }
    }
  }, [query])

  if (!mounted) return null

  return createPortal(
    <section
      className={cn(
        'border-muted bg-popover absolute inset-x-0 top-10 z-[10000] flex w-full rounded-b-xl border border-t-0 shadow-lg',
        queryInputFocused &&
          'after:border-ring after:absolute after:-inset-[5px] after:rounded-[14px] after:rounded-t-none after:border-x-[2px] after:border-b-[2px] after:content-[""]',
      )}>
      <div className="relative flex w-full gap-2 px-3 py-3">
        <BuilderCombobox setNodes={setNodes} nodes={nodes} />
        {nodes && (
          <div className="flex w-full flex-wrap gap-2">
            {nodes.map((node, idx) => (
              <Item
                key={`${node.type}-${node.value}-${idx}`}
                onDelete={() => deleteItem(idx)}
                node={node}
              />
            ))}
          </div>
        )}
        {nodes === undefined && query.trim().length === 0 && (
          <div className="border-muted-foreground/50 inline-flex h-6 items-center rounded-md border border-dashed bg-neutral-50 px-2 dark:bg-neutral-800">
            <p className="text-muted-foreground/80 text-sm leading-6">
              No items present
            </p>
          </div>
        )}
      </div>
      {createPortal(
        <div
          id="query-builder-focus-guard"
          onClick={handleFocusGuardClick}
          className="fixed inset-0 z-[10000] bg-transparent"
        />,
        document.body,
      )}
    </section>,
    getQueryBarEl(),
  )
}
