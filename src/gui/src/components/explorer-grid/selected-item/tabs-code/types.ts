import type { FsItem } from '@/lib/fetch-fs'

export type FsItemWithNone = Omit<
  Pick<FsItem, 'type' | 'name' | 'size'>,
  'type'
> & {
  type: FsItem['type'] | 'none'
}

export interface ItemAlerts {
  title: string
  description: string
}

export interface Error {
  origin: string
  cause: string
}

export type View = 'code' | 'preview'

export type Language =
  | 'markdown'
  | 'typescript'
  | 'javascript'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'css'
  | 'html'
  | 'text'

export type SortingDirection = 'asc' | 'desc' | 'unsorted'

export type FsItemSortKey = 'name' | 'type' | 'size' | null
