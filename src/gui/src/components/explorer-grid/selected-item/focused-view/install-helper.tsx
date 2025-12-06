import { useLocation } from 'react-router'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CopyIcon, Check } from 'lucide-react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { VltClient } from '@/components/icons/index.ts'
import { cn } from '@/lib/utils.ts'
import { useToast } from '@/components/hooks/use-toast.ts'
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip.tsx'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'

const MotionCopyIcon = motion.create(CopyIcon)
const MotionCheck = motion.create(Check)

const iconMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(2px)', scale: 0.98 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
  exit: { opacity: 0, filter: 'blur(2px)', scale: 0.98 },
  transition: { duration: 0.25 },
}

interface CopyButtonProps extends ComponentProps<'button'> {
  copied?: boolean
}

const CopyButton = ({
  copied,
  className,
  ...rest
}: CopyButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'hover:text-foreground hover:bg-foreground/6 [&_svg]:text-muted-foreground flex size-6 cursor-pointer items-center justify-center rounded-md p-1.5 transition-all duration-100 [&_svg]:size-5',
              className,
            )}
            {...rest}>
            <AnimatePresence mode="wait">
              {copied ?
                <MotionCheck key="copied" {...iconMotion} />
              : <MotionCopyIcon key="copy" {...iconMotion} />}
            </AnimatePresence>
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>
            {copied ? 'Copied to clipboard' : 'Copy to clipboard'}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}

export const InstallHelper = () => {
  const { pathname } = useLocation()
  const [copied, setCopied] = useState<boolean>(false)
  const item = useSelectedItemStore(state => state.selectedItem)
  const manifest = useSelectedItemStore(state => state.manifest)
  const { toast } = useToast()

  const isExternalPackage = pathname.includes('explore/npm')

  const version = manifest?.version || item.version
  const command = `vlt i ${item.name}@${version}`

  const handleCopy = () => {
    void navigator.clipboard
      .writeText(command)
      .then(() => {
        toast({ title: 'Copied to clipboard' })
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
        }, 1000)
      })
      .catch((e: unknown) => {
        if (e instanceof Error) {
          toast({ title: 'Failed to copy', description: e.message })
        } else {
          toast({
            title: 'Failed to copy',
            description: 'An unknown error occured',
          })
        }
        setCopied(false)
      })
  }

  /**
   * only show the install helper when on an external package
   */
  if ((item.to && !item.spec) || !isExternalPackage) return null

  return (
    <div className="bg-background flex w-full flex-col gap-2 rounded px-6 py-3">
      <h3 className="text-muted-foreground text-sm font-medium">
        Install
      </h3>
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'border-primary/9 inline-flex cursor-default items-center gap-1 rounded-lg border px-2 py-2 font-mono text-sm font-medium tabular-nums',
                '**:data-[slot=package-manager]:text-muted-foreground',
                '**:data-[slot=command]:text-muted-foreground',
                '**:data-[slot=argument]:truncate **:data-[slot=argument]:text-emerald-600 **:data-[slot=argument]:dark:text-emerald-500',
                '**:data-[slot=prefix]:text-muted-foreground/50',
                '**:data-[slot=cursor]:bg-foreground/50 **:data-[slot=cursor]:h-[1.5ch] **:data-[slot=cursor]:w-[0.5ch] **:data-[slot=cursor]:animate-pulse **:data-[slot=cursor]:rounded-[1px]',
              )}>
              <div className="text-muted-foreground flex size-5 items-center justify-center [&_svg]:size-4">
                <VltClient />
              </div>
              <span data-slot="package-manager">vlt</span>
              <span data-slot="command">i</span>
              <span data-slot="argument">
                {item.name}@{version}
              </span>
              <span data-slot="cursor" />

              <div className="ml-auto flex items-center justify-center">
                <CopyButton copied={copied} onClick={handleCopy} />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              {item.name}@{version}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
