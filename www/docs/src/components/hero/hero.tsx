import { type Props } from '@astrojs/starlight/props'
import CliInstall from '@/components/cli-install/cli-install'
import { ArrowUpRight } from 'lucide-react'

const Hero = ({ entry }: Props) => {
  const { data } = entry
  const { title } = data
  const tagline = data.hero?.tagline ?? ''

  return (
    <section className="mx-auto flex flex-col grow w-full justify-between max-w-screen-xl gap-x-4 py-6">
      <Hero.Introduction title={title} tagline={tagline} />
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
        <a
          href="/cli"
          role="link"
          className="no-underline text-background cursor-pointer rounded-sm bg-foreground px-8 py-2 hover:bg-foreground/90 transition-all"
          target="_blank">
          Quick Start
        </a>
        <a
          href="https://www.vlt.sh/serverless-registry"
          target="_blank"
          role="link"
          className="flex items-center gap-1 no-underline text-foreground cursor-pointer rounded-sm bg-muted-foreground/10 border-muted-foreground/25 border-[1px] px-8 py-2 hover:bg-muted-foreground/20 transition-all">
          Serverless Registry
          <ArrowUpRight size={20} />
        </a>
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
      <div className="absolute -top-[1px] flex items-center justify-center -right-[1px] border-[1px] border-muted-foreground/25 h-[45px] w-[45px] bg-white dark:bg-black group-hover:border-muted-foreground transition-colors" />
      <div className="absolute top-0 h-full ml-[10px] border-r-[1px] border-muted-foreground/25 group-hover:border-muted-foreground transition-colors" />
      <div className="flex flex-col ml-[10px] pl-4">
        <p className="text-xs text-muted-foreground/50">{subtitle}</p>
        <h3 className="text-lg">{title}</h3>
      </div>
    </div>
  )
}

export default Hero
