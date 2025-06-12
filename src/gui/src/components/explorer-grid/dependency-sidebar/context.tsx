import { createContext, useEffect, useContext, useRef } from 'react'
import { createStore, useStore } from 'zustand'
import { useToast } from '@/components/hooks/use-toast.ts'
import { useNavigate } from 'react-router'
import { useGraphStore } from '@/state/index.ts'
import { addRemoveDependency } from '@/lib/add-remove-dependency.ts'
import { deepEqual } from '@/utils/deep-equal.ts'

import type { StoreApi } from 'zustand'
import type { PropsWithChildren } from 'react'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DependencySideBarProps } from '@/components/explorer-grid/dependency-sidebar/index.tsx'
import type { Operation } from '@/lib/add-remove-dependency.ts'
import type { Filter } from './filter-config.ts'

type DependencySidebarState = {
  importerId?: DependencySideBarProps['importerId']
  dependencies: DependencySideBarProps['dependencies']
  filteredDependencies: DependencySideBarProps['dependencies']
  filters: Filter[]
  searchTerm: string
  addedDependencies: string[]
  uninstalledDependencies: DependencySideBarProps['uninstalledDependencies']
  inProgress: boolean
  error?: string
  dependencyPopoverOpen?: boolean
}
type DependencySidebarAction = {
  setAddedDependencies: (
    deps: DependencySidebarState['addedDependencies'],
  ) => void
  setFilteredDependencies: (
    deps: DependencySidebarState['filteredDependencies'],
  ) => void
  setFilters: (filters: DependencySidebarState['filters']) => void
  setSearchTerm: (
    search: DependencySidebarState['searchTerm'],
  ) => void
  setInProgress: (bool: DependencySidebarState['inProgress']) => void
  onDependencyClick: (item: GridItemData) => () => undefined
  setError: (str: DependencySidebarState['error']) => void
  setDependencyPopoverOpen: (
    o: DependencySidebarState['dependencyPopoverOpen'],
  ) => void
}

export type DependencySidebarStore = DependencySidebarState &
  DependencySidebarAction

const DependencySidebarContext = createContext<
  StoreApi<DependencySidebarStore> | undefined
>(undefined)

type DependencySidebarProviderProps = PropsWithChildren & {
  dependencies: DependencySidebarState['dependencies']
  importerId?: DependencySidebarState['importerId']
  onDependencyClick: DependencySidebarAction['onDependencyClick']
  uninstalledDependencies: DependencySidebarState['uninstalledDependencies']
}

/**
 * Deeply compares incoming props and updates the store only if values have changed.
 * Prevents unnecessary store updates and downstream rerenders.
 */
const useSyncStoreProps = <T,>(
  store: StoreApi<T>,
  props: Partial<T>,
): void => {
  const prevPropsRef = useRef<Partial<T>>({})

  useEffect(() => {
    const prev = prevPropsRef.current
    const changedKeys = Object.keys(props).filter(key => {
      const typedKey = key as keyof T
      return !deepEqual(props[typedKey], prev[typedKey])
    })

    if (changedKeys.length > 0) {
      const updated: Partial<T> = {}
      changedKeys.forEach(key => {
        const typedKey = key as keyof T
        updated[typedKey] = props[typedKey]
      })
      store.setState(updated)
      prevPropsRef.current = props
    }
  }, [props, store])
}

export const DependencySidebarProvider = ({
  dependencies,
  uninstalledDependencies,
  importerId,
  onDependencyClick,
  children,
}: DependencySidebarProviderProps) => {
  const query = useGraphStore(state => state.query)
  const dependencySidebarStore = useRef(
    createStore<DependencySidebarStore>(set => ({
      dependencies,
      filteredDependencies: dependencies,
      uninstalledDependencies,
      importerId,
      filters: [],
      searchTerm: '',
      onDependencyClick,
      addedDependencies: [],
      inProgress: false,
      error: undefined,
      dependencyPopoverOpen: false,
      setAddedDependencies: (
        deps: DependencySidebarState['addedDependencies'],
      ) => set(() => ({ addedDependencies: deps })),
      setFilters: (filters: DependencySidebarState['filters']) =>
        set(() => ({ filters })),
      setSearchTerm: (search: string) =>
        set(() => ({ searchTerm: search })),
      setFilteredDependencies: (
        filteredDependencies: DependencySidebarState['filteredDependencies'],
      ) => set(() => ({ filteredDependencies })),
      setInProgress: (bool: DependencySidebarState['inProgress']) =>
        set(() => ({ inProgress: bool })),
      setError: (str: DependencySidebarState['error']) =>
        set(() => ({ error: str })),
      setDependencyPopoverOpen: (
        o: DependencySidebarState['dependencyPopoverOpen'],
      ) => set(() => ({ dependencyPopoverOpen: o })),
    })),
  ).current

  /** The `filteredDependencies` by default will the dependencies themselves */
  useEffect(() => {
    dependencySidebarStore.setState(() => ({
      filteredDependencies: dependencies,
    }))
  }, [dependencies, dependencySidebarStore])

  /** Reset the filters when navigating */
  useEffect(() => {
    dependencySidebarStore.setState(() => ({
      filters: [],
    }))
  }, [query, dependencySidebarStore])

  useSyncStoreProps(dependencySidebarStore, {
    dependencies,
    uninstalledDependencies,
    importerId,
    onDependencyClick,
  })

  return (
    <DependencySidebarContext.Provider value={dependencySidebarStore}>
      {children}
    </DependencySidebarContext.Provider>
  )
}

export const useDependencySidebarStore = <T,>(
  selector: (state: DependencySidebarStore) => T,
) => {
  const store = useContext(DependencySidebarContext)
  if (!store) {
    throw new Error(
      'useDependencySidebarStore must be used within a DependencySidebarProvider',
    )
  }
  return useStore(store, selector)
}

/**
 * usePopover is scoped to the DependencySidebarProvider, and is intended
 * for controlling the state of the `addedDependenciesPopover` component.
 *
 * It will throw an error if used outside of the DependencySidebarProvider.
 */
export const usePopover = () => {
  const setInProgress = useDependencySidebarStore(
    state => state.setInProgress,
  )
  const error = useDependencySidebarStore(state => state.error)
  const setError = useDependencySidebarStore(state => state.setError)

  const dependencyPopoverOpen = useDependencySidebarStore(
    state => state.dependencyPopoverOpen,
  )
  const setDependencyPopoverOpen = useDependencySidebarStore(
    state => state.setDependencyPopoverOpen,
  )

  const toggleAddDepPopover = () => {
    if (dependencyPopoverOpen && error) {
      setError('')
      setInProgress(false)
    }
    setDependencyPopoverOpen(!dependencyPopoverOpen)
  }

  return {
    toggleAddDepPopover,
    dependencyPopoverOpen,
    setDependencyPopoverOpen,
  }
}

export const useOperation = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { toggleAddDepPopover } = usePopover()

  const updateStamp = useGraphStore(state => state.updateStamp)
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )

  const importerId = useDependencySidebarStore(
    state => state.importerId,
  )
  const setError = useDependencySidebarStore(state => state.setError)
  const setInProgress = useDependencySidebarStore(
    state => state.setInProgress,
  )
  const addedDependencies = useDependencySidebarStore(
    state => state.addedDependencies,
  )
  const setAddedDependencies = useDependencySidebarStore(
    state => state.setAddedDependencies,
  )

  const operation = async ({
    item,
    operationType,
  }: {
    item: {
      name: GridItemData['name']
      version: GridItemData['version']
      type?: string
    }
    operationType: Operation
  }) => {
    if (!importerId) return

    const onSuccessful =
      operationType === 'install' ?
        () => {
          toggleAddDepPopover()
          setAddedDependencies([item.name, ...addedDependencies])
        }
      : () => {
          const packageName = item.name
          setAddedDependencies(
            addedDependencies.filter(item => item !== packageName),
          )
        }

    try {
      await addRemoveDependency({
        operation: operationType,
        setError,
        setInProgress,
        updateStamp,
        toast,
        importerId,
        name: item.name,
        version: item.version,
        type: item.type,
        onSuccessful,
      })
    } catch (err) {
      console.error(err)
      void navigate('/error')
      updateErrorCause(
        'Unexpected error trying to install dependency.',
      )
    }
  }

  return { operation }
}
