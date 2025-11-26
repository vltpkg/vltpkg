import { NavLink } from 'react-router'
import { forwardRef, useRef } from 'react'
import { Button } from '@/components/ui/button.tsx'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu.tsx'
import { Vlt } from '@/components/icons/index.ts'
import { cn } from '@/lib/utils.ts'
import { toast } from '@/components/hooks/use-toast.ts'

import type { ComponentProps } from 'react'

const Link = ({
  children,
  ...props
}: ComponentProps<typeof NavLink>) => {
  return (
    <NavLink
      {...props}
      className="focus:bg-accent focus:text-accent-foreground inline-flex w-full cursor-default rounded-lg px-2 py-1.5 text-sm">
      {children}
    </NavLink>
  )
}

export const Logo = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button>
>(({ className, ...rest }, ref) => {
  const iconRef = useRef<SVGSVGElement | null>(null)

  const copyIcon = async (svgEl: SVGSVGElement | null) => {
    if (!svgEl) return false
    try {
      const cloned = svgEl.cloneNode(true) as SVGSVGElement
      if (!cloned.getAttribute('xmlns')) {
        cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      }
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(cloned)

      // Try rich clipboard with SVG MIME
      const supportsRichClipboard =
        typeof navigator !== 'undefined' &&
        'clipboard' in navigator &&
        'write' in navigator.clipboard &&
        typeof window !== 'undefined' &&
        'ClipboardItem' in window

      if (supportsRichClipboard) {
        const svgBlob = new Blob([svgString], {
          type: 'image/svg+xml',
        })
        try {
          const item = new window.ClipboardItem({
            'image/svg+xml': svgBlob,
            'text/plain': new Blob([svgString], {
              type: 'text/plain',
            }),
          })
          await navigator.clipboard.write([item])
          return true
        } catch {
          // fall through to text-only
        }
      }

      await navigator.clipboard.writeText(svgString)
      return true
    } catch {
      return false
    }
  }

  const handleCopyIcon = async () => {
    const ok = await copyIcon(iconRef.current)
    if (ok) {
      toast({ content: 'Copied icon to clipboard' })
    } else {
      toast({ content: 'Failed to copy icon' })
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          {...rest}
          variant="ghost"
          className={cn('h-9 p-2', className)}
          ref={ref}
          asChild>
          <NavLink
            to="/"
            className="cursor-default"
            aria-label="vlt home">
            <Vlt
              ref={iconRef}
              className="size-6"
              aria-hidden="true"
            />
            <p className="bg-gradient-to-tr from-neutral-600 to-neutral-950 bg-clip-text py-1 text-lg font-semibold dark:from-neutral-500 dark:to-neutral-100">
              vlt <span className="font-light">/vōlt/</span>
            </p>
          </NavLink>
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem asChild>
          <Link to="/brand-kit">Brand kit</Link>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyIcon}>
          Copy as SVG
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

Logo.displayName = 'Logo'
