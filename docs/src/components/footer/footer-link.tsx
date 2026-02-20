import type { Content } from './content'

const FooterLink = ({ slug, icon, href }: Content) => {
  return (
    <a href={href}>
      <button
        role="link"
        className="duration-250 my-0 inline-flex cursor-pointer items-center text-nowrap bg-transparent p-0 text-sm font-medium text-neutral-500 transition-all hover:text-foreground">
        {icon && (
          <span className="mr-2 flex items-center justify-center">
            {icon({ className: 'size-4' })}
          </span>
        )}
        {slug}
      </button>
    </a>
  )
}

export { FooterLink }
