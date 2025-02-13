import { type ChangeEvent, useEffect, useState, useRef } from 'react'
import { Star, ChevronsUpDown } from 'lucide-react'
import { CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { useTheme } from '@/components/ui/theme-provider.jsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Input } from '@/components/ui/input.jsx'
import { useAnimate } from 'framer-motion'
import { useGraphStore } from '@/state/index.js'
import {
  type Color,
  type QueryLabel,
  type SavedQuery,
} from '@/state/types.js'
import { LabelSelect } from '@/components/labels/label-select.jsx'
import { LabelBadge } from '@/components/labels/label-badge.jsx'
import { v4 as uuidv4 } from 'uuid'
import { DeleteQuery } from '@/components/queries/delete-query.jsx'

interface SaveQueryPopoverProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const SaveQueryButton = () => {
  const [showSaveQueryPopover, setShowSaveQueryPopover] =
    useState<boolean>(false)
  const [scope, animate] = useAnimate()
  const savedQueries = useGraphStore(state => state.savedQueries)
  const activeQuery = useGraphStore(state => state.query)
  const [starColor, setStarColor] = useState<Color>()
  const { resolvedTheme } = useTheme()

  /** Once the save button is clicked, the query is saved. */
  useEffect(() => {
    const foundQuery = savedQueries?.find(
      query => query.query === activeQuery,
    )
    setStarColor(
      foundQuery && resolvedTheme === 'dark' ? '#fafafa' : '#212121',
    )
    if (showSaveQueryPopover) {
      animate(scope.current, {
        rotate: -71.5,
      })
    } else {
      animate(scope.current, {
        rotate: 0,
      })
    }
  }, [showSaveQueryPopover, savedQueries, activeQuery, resolvedTheme])

  return (
    <Popover
      open={showSaveQueryPopover}
      onOpenChange={setShowSaveQueryPopover}>
      <PopoverTrigger className="flex items-center justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              asChild
              className="flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-sm border border-muted-foreground/20 bg-muted">
              <div
                onClick={() =>
                  setShowSaveQueryPopover(!showSaveQueryPopover)
                }
                className="inline-flex h-[1.5rem] w-[1.5rem] items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
                <Star ref={scope} size={20} fill={starColor} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save query</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="end">
        <SaveQueryPopover
          isOpen={showSaveQueryPopover}
          setIsOpen={setShowSaveQueryPopover}
        />
      </PopoverContent>
    </Popover>
  )
}

const SaveQueryPopover = ({
  isOpen,
  setIsOpen,
}: SaveQueryPopoverProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState<boolean>(false)
  const [_labelSelectPopoverOpen, setLabelSelectPopoverOpen] =
    useState<boolean>(false)
  const hasRun = useRef<boolean>(false)

  const [savedQuery, setSavedQuery] = useState<SavedQuery | null>(
    null,
  )
  const [queryName, setQueryName] = useState<string>('')
  const [editContext, setEditContext] = useState<string>('')
  const [selectedLabels, setSelectedLabels] = useState<QueryLabel[]>(
    [],
  )

  const saveQuery = useGraphStore(state => state.saveQuery)
  const nodes = useGraphStore(state => state.nodes)
  const updateQuery = useGraphStore(state => state.updateSavedQuery)
  const savedQueries = useGraphStore(state => state.savedQueries)
  const activeQuery = useGraphStore(state => state.query)

  useEffect(() => {
    // React runs useEffect twice in strict mode during dev
    // This ensures that this useEffect only ever runs once.
    if (!hasRun.current) {
      hasRun.current = true

      const foundQuery = savedQueries?.find(
        query => query.query === activeQuery,
      )
      setSavedQuery(foundQuery ?? null)

      // If the query exists, update it.
      if (foundQuery && queryName !== '') {
        setSelectedLabels(foundQuery.labels ?? [])
        setQueryName(
          foundQuery.name || nodes[0]?.manifest?.name || '',
        )
        setEditContext(
          foundQuery.context || nodes[0]?.projectRoot || '',
        )
        const item: SavedQuery = {
          ...foundQuery,
          name: queryName,
          context: editContext,
          query: activeQuery,
          labels: selectedLabels,
          dateModified: new Date().toISOString(),
        }
        updateQuery(item)
      }

      // If the query doesnt exist, save it.
      if (!foundQuery) {
        saveQuery({
          id: uuidv4(),
          name: nodes[0]?.manifest?.name ?? 'Query',
          context: nodes[0]?.projectRoot ?? '',
          query: activeQuery,
          labels: selectedLabels,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        })
      }
    }
  }, [])

  /**
   * Set the default state of the text inputs
   */
  useEffect(() => {
    if (!isOpen) {
      const foundQuery = savedQueries?.find(
        query => query.query === activeQuery,
      )
      setSavedQuery(foundQuery ?? null)

      if (foundQuery && queryName !== '') {
        setSelectedLabels(foundQuery.labels ?? [])
        setQueryName(
          foundQuery.name || nodes[0]?.manifest?.name || '',
        )
        setEditContext(
          foundQuery.context || nodes[0]?.projectRoot || '',
        )
        const item: SavedQuery = {
          ...foundQuery,
          name: queryName,
          context: editContext,
          query: activeQuery,
          labels: selectedLabels,
          dateModified: new Date().toISOString(),
        }
        updateQuery(item)
      }
    }
  }, [isOpen])

  /**
   * Update the UI inputs
   */
  useEffect(() => {
    setSelectedLabels(savedQuery?.labels ?? [])
    setQueryName(savedQuery?.name ?? nodes[0]?.manifest?.name ?? '')
    setEditContext(savedQuery?.context ?? nodes[0]?.projectRoot ?? '')
  }, [savedQuery])

  // exit early to avoid UI flash
  if (!isOpen) return null

  return (
    <div className="flex w-[325px] flex-col">
      <CardHeader className="px-6 py-4">
        <CardTitle className="text-lg font-medium">
          {savedQuery ? 'Edit Query' : 'Added Query!'}
        </CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-2 border-t-[1px] border-muted-foreground/20 px-6 py-4">
        <Label className="border-none font-medium">Name</Label>
        <Input
          type="text"
          autoComplete="off"
          placeholder="Name"
          value={queryName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const value = e.currentTarget.value
            setQueryName(value)
          }}
        />
        <Label className="mt-2 border-none font-medium">
          Directory
        </Label>
        <Input
          id="query-context"
          type="text"
          autoComplete="off"
          placeholder="Directory (optional)"
          value={editContext}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const value = e.currentTarget.value
            setEditContext(value)
          }}
        />
        <Label className="mt-2 border-none font-medium">Labels</Label>
        {selectedLabels.length !== 0 && (
          <div className="ml-2 flex flex-wrap gap-2">
            {selectedLabels.map((label, idx) => (
              <LabelBadge
                key={idx}
                name={label.name}
                color={label.color}
              />
            ))}
          </div>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal">
              Select labels
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <LabelSelect
              selectedItems={selectedLabels}
              setItems={setSelectedLabels}
              setIsOpen={setLabelSelectPopoverOpen}
            />
          </PopoverContent>
        </Popover>
        <div className="mt-4 flex w-full items-center justify-end gap-2">
          <div className="flex items-center gap-3">
            {savedQuery && (
              <DeleteQuery
                type="button"
                text="Remove"
                deleteDialogOpen={deleteDialogOpen}
                setDeleteDialogOpen={setDeleteDialogOpen}
                onClose={() => setIsOpen(false)}
                selectedQueries={[
                  {
                    ...savedQuery,
                    name: queryName,
                    context: editContext,
                    query: activeQuery,
                    labels: selectedLabels,
                  },
                ]}
              />
            )}
            <Button onClick={() => setIsOpen(false)}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SaveQueryButton
