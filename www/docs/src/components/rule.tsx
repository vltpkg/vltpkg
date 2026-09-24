import { cn } from 'cn'

// an etched divider: a dark line over a lighter one, so it reads as a groove in the surface.
// both tones sit off the page colour, since a line can't be lighter than white or darker than black
export const Rule = ({
  className,
  ...props
}: React.ComponentProps<'hr'>) => (
  <hr
    className={cn(
      'mx-auto h-px w-full border border-x-0 border-t-[oklch(0.88_0_0)] border-b-[oklch(0.96_0_0)] lg:max-w-[calc(100%-var(--radius-sm)*2)] dark:border-t-[oklch(0.14_0_0)] dark:border-b-[oklch(0.24_0_0)]',
      className,
    )}
    {...props}
  />
)
