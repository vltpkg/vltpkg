import { footerContent } from './content'
import { Vlt } from '@/components/icons/icons'
import { ThemeSwitcher } from './theme-switcher'
import { FooterLink } from './footer-link'
import { Waitlist } from './waitlist'

const Footer = () => {
  return (
    <footer className="flex w-full border-t-[1px] border-border/50">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-8 pb-8 pt-12 md:h-[26rem] md:pb-16">
        <div className="flex items-start justify-start pb-8 md:hidden">
          <a
            href="https://www.vlt.sh"
            className="flex items-center justify-center text-foreground">
            <Vlt className="size-5" />
          </a>
        </div>
        <div className="grid grow grid-cols-2 gap-10 md:grid-cols-5 md:gap-0">
          {footerContent.map((section, idx) => (
            <section className="flex h-full flex-col gap-4" key={idx}>
              <p className="text-sm font-medium">{section.title}</p>
              <ul className="flex list-none flex-col gap-2 p-0 leading-normal">
                {section.contents.map((content, idx) => (
                  <li key={idx}>
                    <FooterLink {...content} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="hidden items-start justify-end md:flex">
            <a href="https://www.vlt.sh" className="text-foreground">
              <Vlt className="size-5" />
            </a>
          </div>
        </div>
        <section className="flex w-full items-center justify-between pt-4 md:pt-0">
          <Waitlist />
          <ThemeSwitcher />
        </section>
      </div>
    </footer>
  )
}

export default Footer
