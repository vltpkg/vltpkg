import { forwardRef, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import { ArrowRightIcon, PlusIcon, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group.tsx'
import { cn } from '@/lib/utils.ts'
import { joinWaitlist } from '@/lib/waitlist.ts'
import type { JoinWaitlistState } from '@/lib/waitlist.ts'
import { useToast } from '@/components/hooks/use-toast.ts'

interface CtaWaitlistGrid {
  className?: string
  title?: string
  subtitle?: string
}

export const CtaWaitlistGrid = forwardRef<
  HTMLDivElement,
  CtaWaitlistGrid
>(
  (
    {
      title = 'Join the waitlist',
      subtitle = `We're still building with design partners,\nbe one of the first to use us in production.`,
      className,
    },
    ref,
  ) => {
    const formRef = useRef<HTMLFormElement>(null)
    const [isPending, setIsPending] = useState(false)
    const [state, setState] = useState<JoinWaitlistState>(null)
    const { toast } = useToast()

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setIsPending(true)

      const formData = new FormData(e.currentTarget)
      const email = formData.get('email') as string
      const subscribe = formData.get('subscribe') === 'on'

      const result = await joinWaitlist({ email, subscribe })

      setState(result)
      setIsPending(false)

      if (result?.state === 'success') {
        toast({
          title: 'Success',
          description: result.message,
        })
        formRef.current?.reset()
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-[radial-gradient(35%_80%_at_25%_0%,--theme(--color-foreground/.08),transparent)] relative mx-auto flex w-full max-w-3xl flex-col justify-between gap-y-6 border-y px-4 py-8',
          className,
        )}>
        <PlusIcon
          className="absolute top-[-12.5px] left-[-11.5px] z-1 size-6"
          strokeWidth={1}
        />
        <PlusIcon
          className="absolute top-[-12.5px] right-[-11.5px] z-1 size-6"
          strokeWidth={1}
        />
        <PlusIcon
          className="absolute bottom-[-12.5px] left-[-11.5px] z-1 size-6"
          strokeWidth={1}
        />
        <PlusIcon
          className="absolute right-[-11.5px] bottom-[-12.5px] z-1 size-6"
          strokeWidth={1}
        />

        <div className="pointer-events-none absolute -inset-y-6 left-0 w-px border-l" />
        <div className="pointer-events-none absolute -inset-y-6 right-0 w-px border-r" />

        <div className="absolute top-0 left-1/2 -z-10 h-full border-l border-dashed" />

        <div className="space-y-1">
          <h2 className="text-center text-2xl font-semibold">
            {title}
          </h2>
          <p className="text-muted-foreground text-center text-sm whitespace-pre-wrap">
            {subtitle}
          </p>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-3">
          <div className="flex items-center justify-center">
            <InputGroup className="bg-card max-w-[280px] rounded-l-lg rounded-r-none">
              <InputGroupInput
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                disabled={isPending}
              />
              <InputGroupAddon>
                <Newspaper />
              </InputGroupAddon>
            </InputGroup>

            <Button
              type="submit"
              className="rounded-l-none rounded-r-lg"
              disabled={isPending}>
              {isPending ? 'Joining...' : 'Join'} <ArrowRightIcon />
            </Button>
          </div>

          {state?.state === 'error' && (
            <p className="text-destructive text-center text-sm">
              {state.message}
            </p>
          )}
        </form>
      </div>
    )
  },
)

CtaWaitlistGrid.displayName = 'CtaWaitlistGrid'
