import type { DashboardTools } from '@/state/types.ts'
import type { LucideProps } from 'lucide-react'
import {
  Bun,
  Deno,
  JavaScript,
  Node,
  Npm,
  Pnpm,
  Yarn,
  Vlt,
} from '@/components/icons/index.ts'

const runtimes: Partial<
  Record<DashboardTools, React.FC<LucideProps>>
> = {
  node: Node,
  deno: Deno,
  js: JavaScript,
  bun: Bun,
}

const packageManagers: Partial<
  Record<DashboardTools, React.FC<LucideProps>>
> = {
  npm: Npm,
  pnpm: Pnpm,
  yarn: Yarn,
  vlt: Vlt,
}

export const getIconSet = (tools: DashboardTools[]) => {
  const runtimeKey = tools.find(tool => runtimes[tool]) ?? null
  const packageManagerKey =
    tools.find(tool => packageManagers[tool]) ?? null

  return {
    runtime: runtimeKey ? runtimes[runtimeKey] : null,
    packageManager:
      packageManagerKey ? packageManagers[packageManagerKey] : null,
  }
}
