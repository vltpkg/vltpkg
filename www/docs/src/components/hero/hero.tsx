import { type Props } from '@astrojs/starlight/props'
import CliInstall from '@/components/cli-install/cli-install'
import { ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '@/state'
import {
  WorkspacesCard,
  VSRCard,
  StartedCard,
  ConfigCard,
} from './cards'

const Hero = ({ entry }: Props) => {
  const data = entry.data
  const title = data.title
  const tagline = data.hero?.tagline ?? ''

  return (
    <section className="mx-auto flex flex-col grow w-full justify-between max-w-screen-xl gap-x-4 py-6">
      <Introduction title={title} tagline={tagline} />
      <Workspaces />
    </section>
  )
}

const Introduction = ({
  title,
  tagline,
}: {
  title: string
  tagline: string
}) => {
  const { getResolvedTheme } = useStore()
  const theme = getResolvedTheme()

  return (
    <section className="py-16">
      {/* background image */}
      <div
        className={clsx('absolute h-[848px] inset-0 -z-10', {
          'light-wave': theme === 'light',
          'dark-wave': theme === 'dark',
        })}
      />

      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-5xl">{title}</h1>
        <p className="text-md max-w-md text-muted-foreground">
          {tagline}
        </p>
      </div>
      <div className="max-w-lg mx-auto relative flex items-center justify-center py-8">
        <CliInstall />
      </div>

      <div className="flex items-center justify-center gap-4">
        <a
          href="/cli"
          role="link"
          className="no-underline text-white dark:text-black cursor-pointer rounded-sm bg-foreground px-8 py-2 hover:bg-foreground/90 transition-all"
          target="_blank">
          Quick Start
        </a>
        <a
          href="https://www.vlt.sh/serverless-registry"
          target="_blank"
          role="link"
          className="flex items-center gap-1 no-underline text-foreground cursor-pointer rounded-sm bg-white dark:bg-black border-muted-foreground/25 border-[1px] px-8 py-2 hover:bg-muted-foreground/20 transition-all">
          Serverless Registry
          <ArrowUpRight size={20} />
        </a>
      </div>
    </section>
  )
}

const Workspaces = () => {
  return (
    <section className="flex flex-col py-4 gap-8">
      <div className="absolute h-[1px] left-0 right-0 w-full bg-muted-foreground/10" />

      <div className="mt-24 mb-10 flex flex-col text-center">
        <p className="text-muted-foreground/50">
          Get started in minutes
        </p>
        <h2 className="text-4xl">Guides and Tutorials</h2>
      </div>

      <div className="flex flex-col items-center md:flex-row flex-wrap gap-10 md:gap-3 justify-between">
        <StartedCard
          title="Getting Started"
          subtitle="Quick Start"
          link="/cli"
        />
        <ConfigCard
          title="Configuration"
          subtitle="Personalize vlt"
          link="/cli/configuring"
        />
        <VSRCard
          title="Serverless Registry"
          subtitle="VSR"
          link="https://www.vlt.sh/serverless-registry"
        />
        <WorkspacesCard
          title="Packages of vlt"
          subtitle="Workspaces"
          link="/packages/"
        />
      </div>
    </section>
  )
}

export default Hero
