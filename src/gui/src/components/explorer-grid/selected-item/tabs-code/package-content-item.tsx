import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog.tsx'
import { cn } from '@/lib/utils.ts'
import { formatDownloadSize } from '@/utils/format-download-size.ts'
import { getPackageContentIcon } from '@/components/explorer-grid/selected-item/tabs-code/utils.ts'
import {
  LARGE_FILE_ALERT,
  UNKNOWN_TYPE_ALERT,
} from '@/components/explorer-grid/selected-item/tabs-code/constants.ts'

import type {
  FsItemWithNone,
  ItemAlerts,
} from '@/components/explorer-grid/selected-item/tabs-code/types.ts'

export const PackageContentItem = ({
  item,
  onClick,
}: {
  item: FsItemWithNone
  onClick?: () => void
}) => {
  const [alert, setAlert] = useState<boolean>(false)
  const [alertContent, setAlertContent] = useState<ItemAlerts | null>(
    null,
  )
  const Icon = getPackageContentIcon(item.type)
  const FIVE_MB = 5 * 1024 * 1024

  const handleClick = () => {
    if (
      item.type === 'file' &&
      typeof item.size === 'number' &&
      item.size >= FIVE_MB
    ) {
      setAlertContent(LARGE_FILE_ALERT)
      setAlert(true)
      return
    }
    if (item.type === 'other') {
      setAlertContent(UNKNOWN_TYPE_ALERT)
      setAlert(true)
      return
    }
    onClick?.()
  }

  return (
    <AlertDialog open={alert} onOpenChange={setAlert}>
      <AlertDialogTrigger asChild onClick={e => e.preventDefault()}>
        <div
          role="link"
          className={cn(
            'group/package-content-item grid cursor-default grid-cols-12 bg-transparent px-6 py-2 transition-colors duration-100',
            'hover:bg-neutral-200',
            'hover:dark:bg-neutral-800',
          )}
          onClick={handleClick}>
          <div className="col-span-6 flex items-center gap-2">
            {Icon && (
              <div className="flex size-4 items-center justify-center">
                <Icon
                  className="text-muted-foreground size-4"
                  strokeWidth={1}
                />
              </div>
            )}
            <p className="text-sm font-medium group-hover/package-content-item:underline">
              {item.name}
            </p>
          </div>
          <div className="col-span-3 flex justify-center">
            <p className="text-muted-foreground text-sm font-medium">
              {item.type !== 'none' && item.type}
            </p>
          </div>
          <div className="col-span-3 flex justify-end text-right">
            <p className="text-muted-foreground font-mono text-sm font-medium tabular-nums">
              {item.type !== 'none' ?
                item.size && item.size !== 0 ?
                  formatDownloadSize(item.size)
                : '-'
              : ''}
            </p>
          </div>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{alertContent?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {alertContent?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl"
            onClick={() => {
              setAlert(false)
              onClick?.()
            }}>
            Open
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
