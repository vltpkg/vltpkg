import { forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input.tsx'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'

interface SearchResultsInputProps
  extends Omit<ComponentProps<typeof Input>, 'className'> {
  loading?: boolean
  onButtonClick?: () => void
  classNames?: {
    wrapper?: string
    input?: string
    button?: string
  }
}

export const SearchResultsInput = forwardRef<
  HTMLDivElement,
  SearchResultsInputProps
>(
  (
    {
      classNames,
      value,
      onChange,
      placeholder = 'Search',
      loading = false,
      onButtonClick,
      ...rest
    },
    ref,
  ) => {
    const { wrapper, input, button } = classNames ?? {}

    return (
      <div
        ref={ref}
        className={cn('relative flex items-center', wrapper)}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={cn('h-10 rounded-2xl', input)}
          {...rest}
        />
        <AnimatePresence initial={false} mode="popLayout">
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-11 flex items-center justify-center">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          size="icon"
          variant="secondary"
          onClick={onButtonClick}
          className={cn(
            'absolute right-1 ml-auto size-8 rounded-xl p-0 text-muted-foreground [&_svg]:size-5',
            button,
          )}>
          <Search />
        </Button>
      </div>
    )
  },
)

SearchResultsInput.displayName = 'SearchResultsInput'
