import {
  Fragment,
  useCallback,
  useEffect,
  useState,
  memo,
} from 'react'
import { Button } from '@/components/ui/button.tsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipPortal,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu.tsx'
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Plus, ChevronRight, GripVertical } from 'lucide-react'
import {
  ATTRIBUTE_FLAGS,
  ATTRIBUTE_OPERATORS,
} from '@/lib/constants/selectors.ts'
import {
  attributeOptions,
  combinatorOptions,
  insightOptions,
  projectOptions,
  relationshipOptions,
  stateOptions,
} from '@/components/query-builder/options.ts'
import { createNodeFromToken } from '@/components/query-builder/ast-interface.ts'
import { motion, useDragControls } from 'framer-motion'
import { useGraphStore } from '@/state/index.ts'

import type { KeyboardEvent } from 'react'
import type { UiNode } from '@/components/query-builder/ui-node-types.ts'
import type { QueryBuilderToken } from '@/components/query-builder/options.ts'

export interface QueryBuilderGroup {
  header: string
  items: QueryBuilderItem[]
}

export interface QueryBuilderItem {
  label: string
  token: QueryBuilderToken
  options?: {
    label: string
    options: QueryBuilderItem[]
  }
}

interface ArgumentDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  selection: {
    token: QueryBuilderToken
    argument?: QueryBuilderToken
  }
  addNode: (node: UiNode) => void
}

const ArgumentDialog = memo(
  ({
    isOpen,
    setIsOpen,
    selection,
    addNode,
  }: ArgumentDialogProps) => {
    const [inputValue, setInputValue] = useState<string>('')
    const [selectedValue, setSelectedValue] = useState<string | null>(
      null,
    )
    const [operator, setOperator] = useState<{
      operator: string
      label: string
    } | null>(null)
    const [flag, setFlag] = useState<{
      flag: string
      label: string
    } | null>(null)

    const { token, argument } = selection

    // Initialize operator and flag from argument token defaults
    useEffect(() => {
      if (argument?.operator && !operator) {
        const operatorLabel =
          ATTRIBUTE_OPERATORS[
            argument.operator as keyof typeof ATTRIBUTE_OPERATORS
          ]
        setOperator({
          operator: argument.operator,
          label: operatorLabel,
        })
      }
      if (argument?.flag && !flag) {
        const flagLabel =
          ATTRIBUTE_FLAGS[
            argument.flag as keyof typeof ATTRIBUTE_FLAGS
          ]
        setFlag({ flag: argument.flag, label: flagLabel })
      }
      // Initialize default selected value if argument provides a fixed set
      if (
        argument?.values &&
        argument.values.length > 0 &&
        !selectedValue
      ) {
        setSelectedValue(argument.values[0] ?? null)
      }
    }, [argument, operator, flag, selectedValue])

    const createToken = (
      type: UiNode['type'],
      token: string,
    ): QueryBuilderToken => ({
      type,
      token,
      label: '',
      description: '',
    })

    const handleSubmit = useCallback(() => {
      const effectiveValue =
        argument?.values && selectedValue !== null ?
          selectedValue
        : inputValue.trim()
      if (!effectiveValue) return

      try {
        const isAttribute = argument?.type === 'attribute'
        const isScore = token.token === ':score'
        const isHostFileArg =
          token.token === ':host' && argument?.token === 'file'
        const operatorStr =
          operator?.operator || argument?.operator || '='
        const flagStr = flag?.flag || argument?.flag || ''

        const node = createNodeFromToken({
          token: isAttribute ? createToken('pseudo', ':attr') : token,
          arguments:
            isAttribute ?
              [
                // Include parent token if not ':attr' (nested case)
                ...(token.token !== ':attr' ?
                  [{ token: createToken('tag', token.token) }]
                : []),
                // Include attribute selector
                {
                  token: createToken(
                    'attribute',
                    `[${argument.token}${operatorStr}"${effectiveValue}"${flagStr ? ` ${flagStr}` : ''}]`,
                  ),
                },
              ]
            : isScore ?
              [
                // Score selector: first argument is operator+value, second is quoted score type
                {
                  token: createToken(
                    'string',
                    `"${operatorStr}${effectiveValue}"`,
                  ),
                },
                {
                  token: createToken(
                    'string',
                    `"${argument?.token || 'overall'}"`,
                  ),
                },
              ]
            : isHostFileArg ?
              [
                {
                  token: createToken(
                    'string',
                    `"${effectiveValue.startsWith('file:') ? effectiveValue : `file:${effectiveValue}`}"`,
                  ),
                },
              ]
            : [
                // Other cases: include value and optional argument
                {
                  token: createToken('string', `"${effectiveValue}"`),
                },
                ...(argument ? [{ token: argument }] : []),
              ],
        })

        addNode(node)
        setInputValue('')
        setOperator(null)
        setFlag(null)
        setIsOpen(false)
      } catch (e) {
        setIsOpen(false)
        console.error('error converting node: ', e)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      inputValue,
      selectedValue,
      argument,
      operator,
      flag,
      token,
      addNode,
    ])

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSubmit()
        }
      },
      [handleSubmit],
    )

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="px-4 py-3">
          <DialogHeader>
            <DialogTitle className="text-md font-medium">
              {token.label}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription />
          <div className="w-full space-y-3">
            <div className="flex w-full items-center gap-2">
              {argument?.operators && (
                <div className="flex shrink flex-col gap-1">
                  <label
                    htmlFor="operator"
                    className="text-muted-foreground block text-xs">
                    operator
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="operator"
                        className="border-muted text-foreground [&>svg]:duration-250 h-8 w-fit border-[1px] bg-white hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 [&>svg]:transition-transform [&>svg]:data-[state=open]:rotate-90">
                        <span>
                          {operator ?
                            operator.label
                          : 'Select an operator'}
                        </span>
                        <ChevronRight />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent className="z-[10002]">
                        {argument.operators.map((op, idx) => (
                          <DropdownMenuItem
                            key={idx}
                            onSelect={() => {
                              setOperator({
                                operator: op.operator,
                                label: op.label,
                              })
                            }}>
                            {op.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenu>
                </div>
              )}
              <div className="flex w-full grow flex-col gap-1">
                <label
                  htmlFor="argument"
                  className="text-muted-foreground block text-xs">
                  value
                </label>
                {argument?.values && argument.values.length > 0 ?
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="argument"
                        className="border-muted text-foreground [&>svg]:duration-250 h-8 w-fit border-[1px] bg-white hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 [&>svg]:transition-transform [&>svg]:data-[state=open]:rotate-90">
                        <span>
                          {selectedValue ?? 'Select a value'}
                        </span>
                        <ChevronRight />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent className="z-[10002]">
                        {argument.values.map((val, idx) => (
                          <DropdownMenuItem
                            key={idx}
                            onSelect={() => setSelectedValue(val)}>
                            {val}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenu>
                : <Input
                    id="argument"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      argument ?
                        `Enter a value for ${argument.label}`
                      : 'Enter value'
                    }
                    className="border-muted h-8 w-full border-[1px] bg-white dark:bg-neutral-800"
                    autoFocus
                  />
                }
              </div>
              {argument?.flags && (
                <div className="flex shrink flex-col gap-1">
                  <label
                    htmlFor="flag"
                    className="text-muted-foreground block text-xs">
                    flag
                  </label>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="flag"
                        className="border-muted text-foreground [&>svg]:duration-250 h-8 w-fit border-[1px] bg-white hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 [&>svg]:transition-transform [&>svg]:data-[state=open]:rotate-90">
                        <span>
                          {flag ? flag.label : 'Select a flag'}
                        </span>
                        <ChevronRight />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent className="z-[10002]">
                        {argument.flags.map((flag, idx) => (
                          <DropdownMenuItem
                            key={idx}
                            onSelect={() => {
                              setFlag({
                                flag: flag.flag,
                                label: flag.label,
                              })
                            }}>
                            {flag.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            {token.description}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              size="sm"
              disabled={
                argument?.values && argument.values.length > 0 ?
                  !selectedValue
                : !inputValue.trim()
              }>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
)

interface ItemProps extends QueryBuilderItem {
  addNode: (node: UiNode) => void
  onOpenDialog: (
    token: QueryBuilderToken,
    argument?: QueryBuilderToken,
  ) => void
  level?: number
  parentToken?: QueryBuilderToken
  handleMouseEnter?: (token: QueryBuilderToken) => void
  handleMouseLeave?: () => void
  parentHoverHandlers?: {
    onNestedEnter: (token: QueryBuilderToken) => void
    onNestedLeave: () => void
  }
}

const Item = memo(
  ({
    label,
    token,
    options,
    addNode,
    onOpenDialog,
    level = 0,
    parentToken,
    handleMouseEnter,
    handleMouseLeave,
    parentHoverHandlers,
  }: ItemProps) => {
    const [hoveredNestedItem, setHoveredNestedItem] =
      useState<QueryBuilderToken | null>(null)

    const handleNestedMouseEnter = useCallback(
      (token: QueryBuilderToken) => {
        setHoveredNestedItem(token)
      },
      [],
    )

    const handleNestedMouseLeave = useCallback(() => {
      setHoveredNestedItem(null)
    }, [])

    const handleSelect = () => {
      // If item has nested options, don't handle selection here
      if (options?.options) return

      // If token requires an argument, open dialog
      if (token.argumentType !== undefined) {
        // For simple attributes, pass them as arguments to :attr pseudo-selector
        if (token.type === 'attribute') {
          const attrPseudoToken = {
            token: ':attr',
            type: 'pseudo' as const,
            label: 'Attribute selector',
            description: 'Match packages by attribute',
          }
          onOpenDialog(attrPseudoToken, token)
        } else {
          onOpenDialog(token)
        }
        return
      }

      // Otherwise, add node directly
      const node = createNodeFromToken({
        token: parentToken ?? token,
      })
      addNode(node)
    }

    // Render as dropdown menu item for nested levels
    if (level > 0) {
      const handleNestedSelect = (e: Event) => {
        e.preventDefault()
        // If we have a parent token, this might be an argument selection
        if (parentToken && token.argumentType !== undefined) {
          onOpenDialog(parentToken, token)
          return
        } else if (parentToken && token.argumentType === undefined) {
          const node = createNodeFromToken({
            token: parentToken,
            arguments: [
              {
                token: token,
              },
            ],
          })
          addNode(node)
          return
        }

        // Otherwise, proceed with normal selection
        handleSelect()
      }

      return (
        <DropdownMenuItem
          onSelect={handleNestedSelect}
          onMouseEnter={() => {
            if (parentHoverHandlers) {
              parentHoverHandlers.onNestedEnter(token)
            }
          }}
          onMouseLeave={() => {
            if (parentHoverHandlers) {
              parentHoverHandlers.onNestedLeave()
            }
          }}
          className="cursor-default">
          {label}
        </DropdownMenuItem>
      )
    }

    return (
      <CommandItem
        keywords={options?.options.map(opt => opt.label)}
        onSelect={handleSelect}
        onMouseEnter={() => handleMouseEnter?.(token)}
        onMouseLeave={handleMouseLeave}
        className="!bg-transparent hover:!bg-neutral-200/50 dark:bg-transparent dark:hover:!bg-neutral-800">
        {!options ?
          <span>{label}</span>
        : <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex w-full cursor-default items-center justify-between">
              {label}
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-[200px] rounded-lg p-1"
              onCloseAutoFocus={e => {
                e.preventDefault()
                e.stopPropagation()
              }}>
              <div className="px-2 py-1.5">
                <h4 className="text-muted-foreground text-xs font-medium">
                  {options.label}
                </h4>
              </div>
              {options.options.map((option, idx) => (
                <Item
                  key={idx}
                  {...option}
                  addNode={addNode}
                  onOpenDialog={onOpenDialog}
                  level={level + 1}
                  parentToken={token}
                  parentHoverHandlers={{
                    onNestedEnter: handleNestedMouseEnter,
                    onNestedLeave: handleNestedMouseLeave,
                  }}
                />
              ))}
              {hoveredNestedItem && (
                <div className="border-muted border-t-[1px] px-3 py-2">
                  <p className="text-muted-foreground text-sm">
                    {hoveredNestedItem.description}
                  </p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      </CommandItem>
    )
  },
)

const Group = memo(
  ({
    header,
    items,
    addNode,
    onOpenDialog,
    handleMouseEnter,
    handleMouseLeave,
  }: QueryBuilderGroup & {
    handleMouseEnter: (token: QueryBuilderToken) => void
    handleMouseLeave: () => void
    addNode: (node: UiNode) => void
    onOpenDialog: (
      token: QueryBuilderToken,
      argument?: QueryBuilderToken,
    ) => void
  }) => {
    return (
      <CommandGroup heading={header}>
        {items.map((item, idx) => (
          <Item
            key={`${header}-${idx}`}
            {...item}
            addNode={addNode}
            onOpenDialog={onOpenDialog}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
          />
        ))}
      </CommandGroup>
    )
  },
)

interface BuilderComboboxProps {
  nodes: UiNode[] | undefined
  setNodes: (
    updater: (nodes: UiNode[] | undefined) => UiNode[] | undefined,
  ) => void
}

const ALL_OPTIONS: QueryBuilderGroup[] = [
  relationshipOptions,
  combinatorOptions,
  projectOptions,
  stateOptions,
  insightOptions,
  attributeOptions,
]

const INITIAL_CONSTRAINTS = {
  top: 0,
  bottom: 0,
  right: 0,
  left: 0,
}

export const BuilderCombobox = memo(
  ({ setNodes }: BuilderComboboxProps) => {
    const [hoveredItem, setHoveredItem] =
      useState<QueryBuilderToken | null>(null)
    const [open, setOpen] = useState<boolean>(false)
    const [dialogOpen, setDialogOpen] = useState<boolean>(false)
    const [dialogToken, setDialogToken] = useState<{
      token: QueryBuilderToken
      argument?: QueryBuilderToken
    } | null>(null)
    const [constraints, setConstraints] = useState(
      INITIAL_CONSTRAINTS,
    )
    const updateQueryBuilderDisplay = useGraphStore(
      state => state.updateQueryBuilderDisplay,
    )

    const handleMouseEnter = useCallback(
      (token: QueryBuilderToken) => {
        setHoveredItem(token)
      },
      [],
    )

    const handleMouseLeave = useCallback(() => {
      setHoveredItem(null)
    }, [])

    const addNode = useCallback(
      (node: UiNode) => {
        setNodes(prev => (prev ? [...prev, node] : [node]))
      },
      [setNodes],
    )

    const handleOpenDialog = useCallback(
      (token: QueryBuilderToken, argument?: QueryBuilderToken) => {
        setDialogToken({ token, argument })
        setDialogOpen(true)
      },
      [],
    )

    const controls = useDragControls()

    const updateConstraints = useCallback(() => {
      setConstraints({
        top: -92,
        left: -140,
        right: window.innerWidth - 540,
        bottom: window.innerHeight - 430,
      })
    }, [])

    useEffect(() => {
      updateConstraints()
      window.addEventListener('resize', updateConstraints)
      return () => {
        window.removeEventListener('resize', updateConstraints)
      }
    }, [updateConstraints])

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <TooltipProvider>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="query-builder-open"
                  variant="default"
                  className="border-muted text-muted-foreground aspect-square size-6 rounded-md border-[1px] bg-transparent p-0 hover:bg-neutral-200 dark:bg-neutral-800 hover:dark:bg-neutral-700">
                  <Plus />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Add query selector</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent
          onInteractOutside={e => {
            const guard = document.getElementById(
              'query-builder-focus-guard',
            )
            if (guard?.contains(e.target as Node)) {
              setOpen(false)
              updateQueryBuilderDisplay(false)
            }
          }}
          align="start"
          className="group w-[400px] select-none rounded-lg border-none bg-transparent p-0 shadow-none">
          <motion.div
            drag
            dragConstraints={constraints}
            dragElastic={0}
            dragMomentum={false}
            dragControls={controls}
            dragListener={false}
            style={{ touchAction: 'none' }}
            className="border-muted bg-popover rounded-lg border shadow-lg">
            <Command>
              <div className="relative">
                <CommandInput
                  placeholder="Search selectors..."
                  wrapperClassName="border-b-[1px] border-muted"
                  className="h-9"
                />
                <div
                  tabIndex={-1}
                  onPointerDownCapture={e => {
                    e.stopPropagation()
                    controls.start(e)
                  }}
                  className="absolute right-2 top-2">
                  <GripVertical className="text-muted-foreground hover:text-foreground active:text-foreground duration-250 relative size-4 opacity-0 transition-colors transition-opacity hover:cursor-grab active:cursor-grabbing group-hover:opacity-100" />
                </div>
              </div>
              <CommandList>
                <CommandEmpty>No results found</CommandEmpty>
                {ALL_OPTIONS.map((group, idx) => (
                  <Fragment key={idx}>
                    <Group
                      {...group}
                      addNode={addNode}
                      onOpenDialog={handleOpenDialog}
                      handleMouseEnter={handleMouseEnter}
                      handleMouseLeave={handleMouseLeave}
                    />
                    {idx < ALL_OPTIONS.length - 1 && (
                      <CommandSeparator />
                    )}
                  </Fragment>
                ))}
              </CommandList>
            </Command>

            {hoveredItem && (
              <div className="border-muted border-t-[1px] px-3 py-2">
                <p className="text-muted-foreground text-sm">
                  {hoveredItem.description}
                </p>
              </div>
            )}
          </motion.div>
        </PopoverContent>

        {dialogToken && (
          <ArgumentDialog
            isOpen={dialogOpen}
            setIsOpen={setDialogOpen}
            selection={dialogToken}
            addNode={addNode}
          />
        )}
      </Popover>
    )
  },
)
