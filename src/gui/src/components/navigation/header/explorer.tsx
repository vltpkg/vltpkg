import { useRef, useState, Fragment } from 'react'
import { useNavigate } from 'react-router'
import { useKeyDown } from '@/components/hooks/use-keydown.tsx'
import { Search, Command } from 'lucide-react'
import { QueryBar } from '@/components/query-bar/index.tsx'
import { RootButton } from '@/components/explorer-grid/root-button.tsx'
import { QueryMatches } from '@/components/explorer-grid/query-matches.tsx'
import { Kbd } from '@/components/ui/kbd.tsx'
import { QueryBuilder } from '@/components/query-builder/index.tsx'
import SaveQueryButton from '@/components/explorer-grid/save-query.tsx'
import { FocusButton } from '@/components/explorer-grid/selected-item/focused-view/focused-button.tsx'
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group.tsx'
import { useGraphStore } from '@/state/index.ts'
import { cn } from '@/lib/utils.ts'
import { Spec } from '@vltpkg/spec/browser'

export const ExplorerHeader = () => {
  const [term, setTerm] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const queryInputFocused = useGraphStore(
    state => state.queryInputFocused,
  )
  const updateQueryInputFocused = useGraphStore(
    state => state.updateQueryInputFocused,
  )
  const queryBuilderOpen = useGraphStore(
    state => state.queryBuilderOpen,
  )
  const queryBuilderDisplay = useGraphStore(
    state => state.queryBuilderDisplay,
  )
  const updateQueryBuilderDisplay = useGraphStore(
    state => state.updateQueryBuilderDisplay,
  )
  const isExternalPackage = useGraphStore(
    state => state.isExternalPackage,
  )
  const externalPackageSpec = useGraphStore(
    state => state.externalPackageSpec,
  )
  const specOptions = useGraphStore(state => state.specOptions)

  const { name } = Spec.parseArgs(
    externalPackageSpec ?? '',
    specOptions,
  )

  const navigate = useNavigate()

  const handleNavigate = (e?: React.FormEvent) => {
    e?.preventDefault()
    void navigate(`/search?q=${term}`)
  }

  useKeyDown(['meta+k', 'ctrl+k'], () => inputRef.current?.focus())
  useKeyDown(['escape'], () => inputRef.current?.blur())

  /**
   * The query builder is put into view when the query input is focused.
   */
  const handleQueryBuilderDisplay = () => {
    updateQueryInputFocused(!queryInputFocused)
    if (!queryInputFocused) {
      updateQueryBuilderDisplay(true)
    }
  }

  return (
    <div className="flex w-full justify-end gap-2">
      {isExternalPackage ?
        <form
          onSubmit={handleNavigate}
          className="flex w-full justify-end">
          <InputGroup className="w-full rounded-xl lg:max-w-[400px]">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder={name}
              className="w-full grow"
            />
            <InputGroupAddon
              align="inline-end"
              className="flex gap-1">
              {term.trim() !== '' && (
                <InputGroupButton
                  onClick={handleNavigate}
                  type="submit"
                  className="rounded-md">
                  Search
                </InputGroupButton>
              )}
              <Kbd className="!rounded-md">
                <Command />
              </Kbd>
              <Kbd className="!rounded-md">K</Kbd>
            </InputGroupAddon>
          </InputGroup>
        </form>
      : <Fragment>
          <RootButton className="rounded-xl" />
          <QueryBar
            onFocus={handleQueryBuilderDisplay}
            onBlur={handleQueryBuilderDisplay}
            tabIndex={0}
            classNames={{
              wrapper: cn(
                'w-[600px]',
                queryBuilderOpen &&
                  queryBuilderDisplay &&
                  'rounded-b-none',
              ),
            }}
            startContent={<Search className="size-4" />}
            endContent={
              <div className="relative hidden items-center gap-2 md:flex">
                <div className="flex items-center gap-1">
                  <QueryBuilder />
                  <QueryMatches />
                  <SaveQueryButton />
                </div>
                <div className="flex items-center gap-1">
                  <Kbd className="!rounded-md">
                    <Command size={12} />
                  </Kbd>
                  <Kbd className="!rounded-md">k</Kbd>
                </div>
              </div>
            }
          />
        </Fragment>
      }
      <FocusButton />
    </div>
  )
}
