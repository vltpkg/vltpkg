import { useState } from 'react'

import type { FsItem } from '@/lib/fetch-fs.ts'
import type {
  SortingDirection,
  FsItemSortKey,
} from '@/components/explorer-grid/selected-item/tabs-code/types.ts'

export const useFsItemSorting = (
  typePriority: Record<FsItem['type'], number>,
): {
  sortKey: FsItemSortKey
  sortDir: SortingDirection
  onSortClick: (key: Exclude<FsItemSortKey, null>) => void
  applySort: (items: FsItem[]) => FsItem[]
  reset: () => void
} => {
  const [sortKey, setSortKey] = useState<FsItemSortKey>(null)
  const [sortDir, setSortDir] = useState<SortingDirection>('unsorted')

  const nextDir = (dir: SortingDirection): SortingDirection =>
    dir === 'unsorted' ? 'asc'
    : dir === 'asc' ? 'desc'
    : 'unsorted'

  const onSortClick = (key: Exclude<FsItemSortKey, null>) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
      return
    }
    const nd = nextDir(sortDir)
    setSortDir(nd)
    if (nd === 'unsorted') setSortKey(null)
  }

  const getTypePriority = (t: FsItem['type']): number =>
    typePriority[t]

  const applySort = (items: FsItem[]): FsItem[] => {
    const base = [...items]
    if (!sortKey || sortDir === 'unsorted') {
      return base.sort((a, b) => {
        const t = getTypePriority(a.type) - getTypePriority(b.type)
        if (t !== 0) return t
        return a.name.localeCompare(b.name, undefined, {
          sensitivity: 'base',
        })
      })
    }
    const cmp = (a: FsItem, b: FsItem): number => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base',
          })
        case 'type':
          return getTypePriority(a.type) - getTypePriority(b.type)
        case 'size': {
          const as = a.size ?? 0
          const bs = b.size ?? 0
          return as - bs
        }
      }
    }
    const dirMul = sortDir === 'desc' ? -1 : 1
    return base.sort((a, b) => {
      const primary = dirMul * cmp(a, b)
      if (primary !== 0) return primary
      return a.name.localeCompare(b.name, undefined, {
        sensitivity: 'base',
      })
    })
  }

  const reset = () => {
    setSortKey(null)
    setSortDir('unsorted')
  }

  return { sortKey, sortDir, onSortClick, applySort, reset }
}
