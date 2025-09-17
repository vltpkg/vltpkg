import type { ItemAlerts } from '@/components/explorer-grid/selected-item/tabs-code/types.ts'

export const LARGE_FILE_ALERT: ItemAlerts = {
  title: 'This is a large file',
  description:
    'Are you sure you want to view this file? (It may take some time to load)',
}

export const UNKNOWN_TYPE_ALERT: ItemAlerts = {
  title: 'Unknown file type',
  description:
    "We couldn't identify the type of file this is, you are about to preview it in utf8 format.",
}
