import { type DashboardTools } from '@/state/types.js'
import {
  Bun,
  Deno,
  JavaScript,
  Node,
  Npm,
  Pnpm,
  Yarn,
  Vlt,
} from '@/components/icons/index.js'

const runtimes: Partial<
  Record<DashboardTools, React.FC<React.SVGProps<SVGSVGElement>>>
> = {
  node: Node,
  deno: Deno,
  js: JavaScript,
  bun: Bun,
}

const packageManagers: Partial<
  Record<DashboardTools, React.FC<React.SVGProps<SVGSVGElement>>>
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
