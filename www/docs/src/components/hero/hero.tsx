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
    <section className="mx-auto flex w-full max-w-screen-xl grow flex-col justify-between gap-x-4 py-6">
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
        className={clsx('absolute inset-0 -z-10 h-[848px]', {
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
      <div className="relative mx-auto flex max-w-lg items-center justify-center py-8">
        <CliInstall />
      </div>

      <div className="flex items-center justify-center gap-4">
        <a
          href="/cli"
          role="link"
          className="cursor-pointer rounded-sm bg-foreground px-8 py-2 text-white no-underline transition-all hover:bg-foreground/90 dark:text-black">
          Quick Start
        </a>
        <a
          href="https://www.vlt.sh/serverless-registry"
          target="_blank"
          role="link"
          className="flex cursor-pointer items-center gap-1 rounded-sm border-[1px] border-muted-foreground/25 bg-white px-8 py-2 text-foreground no-underline transition-all hover:bg-muted-foreground/20 dark:bg-black">
          Serverless Registry
          <ArrowUpRight size={20} />
        </a>
      </div>
    </section>
  )
}

const Workspaces = () => {
  return (
    <section className="flex flex-col gap-8 py-4">
      <div className="absolute left-0 right-0 h-[1px] w-full bg-muted-foreground/10" />

      <div className="mb-10 mt-24 flex flex-col text-center">
        <p className="text-muted-foreground/50">
          Get started in minutes
        </p>
        <h2 className="text-4xl">Guides and Tutorials</h2>
      </div>

      <div className="flex flex-col flex-wrap items-center justify-between gap-10 md:flex-row md:gap-3">
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
