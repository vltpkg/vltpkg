import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as yaml from 'yaml'
import { resolveConfig, format as prettier } from 'prettier'

export const ROOT = resolve(import.meta.dirname, '..')

export const configPath = resolve(ROOT, 'pnpm-workspace.yaml')

export const getConfig = () => {
  return yaml.parse(readFileSync(configPath, 'utf8'))
}

export const format = async (source, filepath) =>
  prettier(source, {
    ...(await resolveConfig(filepath)),
    filepath,
  })

export const writeYaml = async (p, data) =>
  writeFileSync(p, await format(yaml.stringify(data), p))

export const readPkgJson = path =>
  JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf8'))

export const writeJson = (p, data) =>
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n')

/**
 * @returns {string[]}
 */
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
