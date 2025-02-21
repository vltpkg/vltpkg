import ThemeSwitcher from '@/components/theme-switcher/theme-switcher.jsx'
import {
  Discord,
  Linkedin,
  Github,
  TwitterX,
} from '@/components/icons/index.js'

interface SocialMediaLink {
  name: string
  to: string
  component: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const socialMediaLinks: SocialMediaLink[] = [
  {
    name: 'linkedin',
    to: 'https://www.linkedin.com/company/vltpkg/',
    component: props => <Linkedin {...props} />,
  },
  {
    name: 'twitter-x',
    to: 'https://x.com/vltpkg',
    component: props => <TwitterX {...props} />,
  },
  {
    name: 'github',
    to: 'https://github.com/vltpkg',
    component: props => <Github {...props} />,
  },
  {
    name: 'discord',
    to: 'https://discord.gg/vltpkg',
    component: props => <Discord {...props} />,
  },
]

export const Footer = () => {
  return (
    <footer>
      <div className="flex w-full flex-col gap-x-4 gap-y-4 px-6 py-6">
        {/* footer links */}
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-4">
            {socialMediaLinks.map((link, idx) => (
              <a
                href={link.to}
                key={idx}
                aria-label={link.name}
                target="_blank">
                <link.component className="h-5 fill-black dark:fill-white" />
              </a>
            ))}
          </div>
          <div className="flex">
            <ThemeSwitcher />
          </div>
        </div>

        {/* footer policies */}
        <div className="flex w-full flex-row items-center justify-between">
          <a
            href="https://www.vlt.sh/"
            className="text-sm text-muted-foreground no-underline transition-all hover:text-foreground">
            &copy; {new Date().getFullYear()} vlt technology inc.
          </a>
          <div className="flex flex-row gap-4">
            <a
              href="https://www.vlt.sh/terms"
              className="text-sm text-muted-foreground no-underline transition-all hover:text-foreground">
              Terms
            </a>
            <a
              href="https://www.vlt.sh/privacy"
              className="text-sm text-muted-foreground no-underline transition-all hover:text-foreground">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
