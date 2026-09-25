'use client'

import { useId, useState } from 'react'
import { cn } from 'cn'
import { CodeCard } from '@/components/code-card'
import { Button } from '@/components/ui/button'

// a CodeCard set as prose, clamped to a couple of lines until expanded
export const AgentPrompt = ({ prompt }: { prompt: string }) => {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <div>
      <CodeCard
        id={id}
        tabs={[
          {
            code: prompt,
            title: 'Agent prompt',
            // clamp + fade the text, not the <pre>, so the panel keeps its border and corners
            content: (
              <span
                className={cn(
                  'block',
                  !open &&
                    'max-h-20 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent)]',
                )}>
                {prompt}
              </span>
            ),
          },
        ]}
        className="text-muted-foreground font-sans text-(length:--text-body) leading-relaxed whitespace-pre-wrap"
      />
      <div className="relative -mt-3.5 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="bg-background dark:bg-background dark:hover:bg-muted rounded-full px-3">
          {open ? 'Show less' : 'Show more'}
        </Button>
      </div>
    </div>
  )
}
