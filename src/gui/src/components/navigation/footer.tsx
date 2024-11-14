import { useTheme } from '@/components/ui/theme-provider.jsx'

interface SocialMediaLink {
  name: string
  to: string
}

const socialMediaLinks: SocialMediaLink[] = [
  {
    name: 'linkedin',
    to: 'https://www.linkedin.com/company/vltpkg/',
  },
  {
    name: 'twitter-x',
    to: 'https://x.com/vltpkg',
  },
  {
    name: 'github',
    to: 'https://github.com/vltpkg',
  },
  {
    name: 'discord',
    to: 'https://discord.gg/vltpkg',
  },
]

export const Footer = () => {
  const { theme } = useTheme()

  return (
    <footer className="flex border-t-[1px] border-solid h-24 items-center justify-between px-8 w-full">
      <div className="flex items-center gap-3">
        {socialMediaLinks.map((link, idx) => (
          <a href={link.to} key={idx}>
            <img
              src={`/icons/${link.name}.svg`}
              width={20}
              style={{
                filter: theme === 'dark' ? 'invert(0)' : 'invert(1)',
              }}
            />
          </a>
        ))}
      </div>
      <div className="flex items-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} vlt technology inc.
        </p>
      </div>
      <div />
    </footer>
  )
}
