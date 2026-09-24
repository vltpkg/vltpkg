import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRightLeftIcon,
  BookMarkedIcon,
  BookOpenIcon,
  BoxesIcon,
  FileTextIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PackageIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TerminalIcon,
  TextSearchIcon,
  UploadIcon,
  UsersIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentPrompt } from '@/components/agent-prompt'

const lede =
  'Most registries treat your packages as files to store. vlt treats them as a dependency graph to understand.'

export const metadata: Metadata = {
  title: { absolute: 'vlt docs' },
  description: lede,
  alternates: { canonical: '/' },
}

const docs = 'https://docs.vlt.sh'
const skill =
  'https://github.com/vltpkg/vltpkg/tree/main/src/query/skills/dss-query'

const prompt = `Help me use vlt in this project. Start by reading ${docs}/llms.txt, which lists every page of the vlt docs. Any page is available as Markdown by adding .md to its URL (for example ${docs}/client/auth.md), and ${docs}/llms-full.txt has the whole site in one file.

1. Install the vlt CLI with \`curl -fsSL https://install.vlt.sh | bash\` (it requires Node.js 22.22 or later), then run \`vlt install\`.
2. To use vlt.io registries, run \`vlt setup\`. It authenticates and configures the account's registry aliases in one step.
3. To answer questions about dependencies, write Dependency Selector Syntax queries and run them with \`vlt query '<selector>'\`. The syntax is documented at ${docs}/client/selectors.md. If you support Agent Skills, the dss-query skill at ${skill} covers it.

Only use commands and flags that appear in the docs.`

const cards: Card[] = [
  {
    icon: BookOpenIcon,
    title: 'llms.txt',
    description:
      'An index of every page on this site, for agents to read before anything else.',
    href: '/llms.txt',
  },
  {
    icon: FileTextIcon,
    title: 'Markdown pages',
    description:
      "Add .md to any page's URL for a plain Markdown copy, or read the whole site in one file.",
    href: '/llms-full.txt',
  },
  {
    icon: TerminalIcon,
    title: 'DSS query skill',
    description:
      'An agent skill that composes and explains vlt query selectors, including Socket-powered security audits.',
    href: skill,
  },
]

type Card = {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

// descriptions paraphrase each page's intro in content/
const sections: { title: string; cards: Card[] }[] = [
  {
    title: 'Host your packages',
    cards: [
      {
        icon: PackageIcon,
        title: 'Using Packages',
        description:
          "Pull public and private packages through your account's registries with the package manager you already use.",
        href: '/registry/using-packages',
      },
      {
        icon: UploadIcon,
        title: 'Publishing',
        description:
          'The registry speaks the npm registry protocol, so publish with vlt, npm, pnpm, yarn, bun, deno, or from CI.',
        href: '/registry/publishing',
      },
      {
        icon: UsersIcon,
        title: 'Members & Access',
        description:
          'Manage who can reach your registries, packages, tokens, and settings through account membership and roles.',
        href: '/registry/access',
      },
      {
        icon: KeyRoundIcon,
        title: 'Authentication & Tokens',
        description:
          'Every registry request is authenticated with a bearer token that belongs to your account.',
        href: '/registry/tokens',
      },
      {
        icon: LayoutDashboardIcon,
        title: 'Dashboard',
        description:
          'See your account overview and recent publishes, and manage registries from one place.',
        href: '/registry/dashboard',
      },
    ],
  },
  {
    title: 'Manage your dependencies',
    cards: [
      {
        icon: ShieldCheckIcon,
        title: 'Security & Malware Detection',
        description:
          "Identify and assess security risks in your dependencies through vlt's integration with Socket.",
        href: '/client/security',
      },
      {
        icon: TextSearchIcon,
        title: 'Dependency Selector Syntax',
        description:
          'Filter and select packages in your dependency graph with CSS-selector-like queries.',
        href: '/client/selectors',
      },
      {
        icon: BoxesIcon,
        title: 'Workspaces',
        description:
          'Define multiple workspaces in a single monorepo project and work across them with the vlt client.',
        href: '/client/workspaces',
      },
      {
        icon: BookMarkedIcon,
        title: 'Catalogs',
        description:
          'Define dependency versions centrally and share them across your projects and workspaces.',
        href: '/client/catalogs',
      },
      {
        icon: NetworkIcon,
        title: 'Affected Dependencies',
        description:
          'Find the workspace you touched plus everything that depends on it before you test, build, or publish.',
        href: '/client/affected',
      },
      {
        icon: SlidersHorizontalIcon,
        title: 'Graph Modifiers',
        description:
          'Alter and refine how the dependency graph is traversed and evaluated, with granular control.',
        href: '/client/graph-modifiers',
      },
      {
        icon: ArrowRightLeftIcon,
        title: 'Migrating to vlt',
        description:
          'Switch from npm, yarn, or pnpm with step-by-step guides for configuration and commands.',
        href: '/client/migration',
      },
    ],
  },
]

const CardGrid = ({ cards }: { cards: Card[] }) => (
  <ul className="mt-6 grid gap-4 md:grid-cols-3">
    {cards.map(({ icon: Icon, title, description, href }) => (
      <li key={title}>
        <a
          href={href}
          className="hover:bg-card focus-visible:outline-ring flex h-full flex-col rounded-xl border p-6 transition-colors focus-visible:outline-2">
          <Icon aria-hidden className="size-5" />
          <h3 className="mt-6 font-medium">{title}</h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {description}
          </p>
        </a>
      </li>
    ))}
  </ul>
)

const Home = () => (
  <div className="typeset-docs mx-auto w-full max-w-6xl">
    <section className="max-w-3xl">
      <h1 className="text-5xl font-semibold tracking-tighter text-balance sm:text-6xl sm:leading-[1.05]">
        Install, publish, and query with vlt
      </h1>
      <p className="text-muted-foreground mt-6 text-lg text-pretty sm:text-xl">
        {lede}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="px-4">
          <Link href="/registry">Registry quickstart</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="px-4">
          <Link href="/client">Client quickstart</Link>
        </Button>
      </div>
    </section>

    <section className="mt-24">
      <h2 className="text-2xl font-semibold tracking-tight">
        Set up your agent
      </h2>
      <p className="text-muted-foreground mt-3 max-w-[65ch] text-pretty">
        Every page on this site is also available as Markdown, and{' '}
        <code className="text-foreground font-mono text-[0.875em]">
          /llms.txt
        </code>{' '}
        indexes them all. Paste this prompt into your agent to point
        it at the docs:
      </p>
      <div className="mt-6">
        <AgentPrompt prompt={prompt} />
      </div>
      <div className="mt-4">
        <CardGrid cards={cards} />
      </div>
    </section>

    {sections.map(section => (
      <section key={section.title} className="mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          {section.title}
        </h2>
        <CardGrid cards={section.cards} />
      </section>
    ))}
  </div>
)

export default Home
