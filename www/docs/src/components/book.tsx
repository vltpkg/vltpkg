import Link from 'next/link'
import { cn } from 'cn'

type Width =
  number | { xs?: number; sm: number; md?: number; lg?: number }

type BookProps = {
  title: string
  /** on the lower cover under the stripe's band, or under the title on a simple cover */
  description?: React.ReactNode
  /** px; an object sizes it per breakpoint (xs ≤400, sm ≤768, md ≤960, lg above), each falling back to the size below */
  width?: Width
  /** the band (stripe) or whole cover (simple); any css colour */
  color?: string
  textColor?: string
  variant?: 'stripe' | 'simple'
  /** sits under the title; an svg sized with `currentColor` works best */
  icon?: React.ReactNode
  /** fills the stripe's band, behind the spine shading and title */
  illustration?: React.ReactNode
  /** ruled page edges instead of a plain block */
  textured?: boolean
  href?: string
  className?: string
}

const widthVars = (width: Width) =>
  typeof width === 'number' ?
    { '--book-width': width }
  : Object.fromEntries(
      Object.entries(width).map(([size, px]) => [
        `--${size}-book-width`,
        px,
      ]),
    )

export const Book = ({
  title,
  description,
  width = 196,
  color,
  textColor,
  variant = 'stripe',
  icon,
  illustration,
  textured,
  href,
  className,
}: BookProps) => {
  const style = {
    ...widthVars(width),
    ...(color && { '--book-color': color }),
    ...(textColor && { '--book-text-color': textColor }),
  } as React.CSSProperties
  const titleEl = <span className="book-title">{title}</span>
  const descriptionEl = description && (
    <p className="book-description">{description}</p>
  )
  const iconEl = icon && (
    <span aria-hidden className="book-icon">
      {icon}
    </span>
  )
  const book = (
    <div className={`book-inner book-${variant}`}>
      <div className="book-cover">
        {variant === 'stripe' ?
          <>
            <div className="book-band">
              {illustration}
              <div aria-hidden className="book-bind" />
              <div className="book-content">
                {iconEl}
                {titleEl}
              </div>
            </div>
            <div className="book-body">
              <div aria-hidden className="book-bind" />
              <div className="book-content">{descriptionEl}</div>
            </div>
          </>
        : <div className="book-body">
            <div aria-hidden className="book-bind" />
            <div className="book-content">
              <div>
                {titleEl}
                {descriptionEl}
              </div>
              {iconEl}
            </div>
          </div>
        }
      </div>
      <div
        aria-hidden
        className={cn('book-pages', textured && 'book-textured')}
      />
      <div aria-hidden className="book-back" />
    </div>
  )
  return href ?
      <Link
        href={href}
        className={cn(
          'book focus-visible:outline-ring focus-visible:outline-2',
          className,
        )}
        style={style}>
        {book}
      </Link>
    : <div className={cn('book', className)} style={style}>
        {book}
      </div>
}
