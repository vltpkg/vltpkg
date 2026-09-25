import { cn } from 'cn'

// the vlt mark (same path as icons/vlt.tsx): nodes at (5.33, 6.33), (18.67, 6.33) and (12, 17.9), r 3.33
const mark =
  'M8.66659 6.33329C8.66659 6.68925 8.61079 7.03216 8.50747 7.35379C8.21694 8.2582 7.99884 9.28798 8.47332 10.1109L10.6593 13.9022C10.9243 14.3618 11.4692 14.5626 11.9997 14.5626C12.5304 14.5626 13.0755 14.3617 13.3406 13.902L15.5265 10.1108C16.001 9.28787 15.7829 8.25813 15.4924 7.35374C15.389 7.03215 15.3333 6.68925 15.3333 6.33332C15.3333 4.49239 16.8257 3.00003 18.6666 3.00003C20.5075 3.00003 21.9999 4.49239 21.9999 6.33332C21.9999 8.17424 20.5075 9.66661 18.6666 9.66661C18.1358 9.66661 17.5906 9.86748 17.3254 10.3273L15.1397 14.1182C14.6652 14.9411 14.8834 15.971 15.1739 16.8754C15.2772 17.197 15.333 17.54 15.333 17.8959C15.333 19.7368 13.8406 21.2292 11.9997 21.2292C10.1588 21.2292 8.66644 19.7368 8.66644 17.8959C8.66644 17.5399 8.72226 17.1969 8.8256 16.8752C9.1162 15.9708 9.33437 14.9409 8.85984 14.1179L6.67422 10.3272C6.40911 9.86744 5.86403 9.66659 5.33329 9.66659C3.49237 9.66659 2 8.17422 2 6.33329C2 4.49237 3.49237 3 5.33329 3C7.17422 3 8.66659 4.49237 8.66659 6.33329Z'

// a blueprint of the mark: dashed outline, a construction circle around the bottom node, solid only inside it
export const VltBlueprint = ({
  className,
}: {
  className?: string
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={cn('overflow-visible', className)}>
    <defs>
      <clipPath id="vlt-blueprint-clip">
        <circle cx="12" cy="17.9" r="5" />
      </clipPath>
    </defs>
    <g className="stroke-muted-foreground/25" strokeWidth="1">
      <line
        x1="0"
        y1="6.33"
        x2="24"
        y2="6.33"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="12"
        y1="0"
        x2="12"
        y2="24"
        vectorEffect="non-scaling-stroke"
      />
    </g>
    <path
      d={mark}
      className="fill-foreground"
      clipPath="url(#vlt-blueprint-clip)"
    />
    <path
      d={mark}
      className="stroke-muted-foreground/50"
      strokeWidth="1"
      strokeDasharray="4 3"
      vectorEffect="non-scaling-stroke"
    />
    <circle
      cx="12"
      cy="17.9"
      r="5"
      className="stroke-muted-foreground/60"
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
)
