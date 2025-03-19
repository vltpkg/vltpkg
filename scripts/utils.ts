import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as yaml from 'yaml'
import { resolveConfig, format as prettier } from 'prettier'

export const ROOT = resolve(import.meta.dirname, '..')

export const configPath = resolve(ROOT, 'pnpm-workspace.yaml')

export const getConfig = () => {
  return yaml.parse(readFileSync(configPath, 'utf8')) as {
    packages: string[]
    catalog: Record<string, string>
  }
}

export const format = async (source: string, filepath: string) =>
  prettier(source, {
    ...(await resolveConfig(filepath)),
    filepath,
  })

export const writeYaml = async (p: string, data: unknown) =>
  writeFileSync(p, await format(yaml.stringify(data), p))

export const readPkgJson = (path: string) =>
  JSON.parse(
    readFileSync(resolve(path, 'package.json'), 'utf8'),
  ) as Record<string, unknown>

export const writeJson = (p: string, data: unknown) =>
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n')

export const getWorkspaces = () => [
  ROOT,
  ...getConfig().packages.flatMap(p =>
    readdirSync(resolve(ROOT, p.replaceAll('*', '')), {
      withFileTypes: true,
    })
      .filter(w => w.isDirectory())
      .map(w => resolve(w.parentPath, w.name)),
  ),
]
