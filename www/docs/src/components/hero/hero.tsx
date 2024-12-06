import type { Props } from '@astrojs/starlight/props'
import CliInstall from '@/components/cli-install/cli-install'
import { Button } from '@/components/ui/button'
import { ArrowUpRight } from 'lucide-react'

interface HeroProps extends Props {}

const navigateTo = (
  e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  url: string,
  external?: boolean,
) => {
  e.preventDefault()
  if (external) {
    window.open(url, '_blank')
  } else {
    window.location.href = url
  }
}

const Hero = ({ entry }: HeroProps) => {
  const { data } = entry
  const { title } = data
  const { tagline } = data.hero!

  return (
    <section className="mx-auto flex flex-col grow w-full justify-between max-w-screen-xl gap-x-4 py-6">
      <Hero.Introduction title={title} tagline={tagline as string} />
      <Hero.Workspaces />
    </section>
  )
}

Hero.Introduction = ({
  title,
  tagline,
}: {
  title: string
  tagline: string
}) => {
  return (
    <section className="py-16">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-5xl">{title}</h1>
        <p className="w-full md:w-3/5 text-md text-muted-foreground">
          {tagline}
        </p>
      </div>
      <div className="relative flex items-center justify-center py-8">
        <CliInstall />
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={e => navigateTo(e, '/cli')}
          role="link"
          size="lg"
          rounded="sm"
          className="cursor-pointer">
          Quick Start
        </Button>
        <Button
          onClick={e =>
            navigateTo(
              e,
              'https://www.vlt.sh/serverless-registry',
              true,
            )
          }
          role="link"
          size="lg"
          variant="outline"
          className="cursor-pointer">
          Serverless Registry
          <ArrowUpRight size={16} />
        </Button>
      </div>
    </section>
  )
}

Hero.Workspaces = () => {
  return (
    <section className="flex flex-col py-16 gap-8 mt-32 border-t-[1px] border-muted-foreground/10">
      <div className="flex flex-col">
        <p className="text-muted-foreground/50">
          Get started in minutes
        </p>
        <h2 className="text-2xl">The vlt guides</h2>
      </div>
      <div className="flex flex-col md:flex-row flex-wrap gap-3 justify-between">
        <Hero.Card
          title="Getting Started"
          subtitle="Quick Start"
          link="/cli"
        />
        <Hero.Card
          title="Configuration"
          subtitle="Personalize vlt"
          link="/cli/configuring"
        />
        <Hero.Card
          title="Serverless Registry"
          subtitle="VSR"
          link="https://www.vlt.sh/serverless-registry"
        />
        <Hero.Card
          title="The packages of vlt"
          subtitle="Workspaces"
          link="http://localhost:4321/packages/"
        />
      </div>
    </section>
  )
}

Hero.Card = ({
  title,
  subtitle,
  link,
}: {
  title: string
  subtitle: string
  link: string
}) => {
  return (
    <div
      role="link"
      onClick={() => (window.location.href = link)}
      className="group hover:-translate-y-1 transition-all relative flex flex-col border-[1px] border-muted-foreground/25 h-80 w-full md:w-64 px-3 py-3 rounded-sm justify-end transition-all hover:border-muted-foreground cursor-pointer">
      {/* corner */}
      <div className="absolute -top-[1px] flex items-center justify-center -right-[1px] border-[1px] border-muted-foreground/25 h-[45px] w-[45px] bg-black group-hover:border-muted-foreground transition-colors" />
      <div className="absolute top-0 h-full ml-[10px] border-r-[1px] border-muted-foreground/25 group-hover:border-muted-foreground transition-colors" />
      <div className="flex flex-col ml-[10px] pl-4">
        <p className="text-xs text-muted-foreground/50">{subtitle}</p>
        <h3 className="text-lg">{title}</h3>
      </div>
    </div>
  )
}

Hero.Installation = () => {
  return (
    <section className="flex flex-col items-center justify-center py-16 gap-8 mt-32">
      <h2 className="text-3xl">Installation</h2>
      <CliInstall.QuickInstall />
    </section>
  )
}

Hero.GUI = () => {
  return (
    <section className="flex flex-col items-center justify-center py-16 gap-8">
      <h2></h2>
    </section>
  )
}

export default Hero
