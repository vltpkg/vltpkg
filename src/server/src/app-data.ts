import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadPackageJson } from 'package-json-from-dist'

export const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

export type AppDataOptions = {
  publicDir: string
}

export type AppData = {
  buildVersion: string
}

export class AppDataManager {
  publicDir: string
  version = version

  constructor(options: AppDataOptions) {
    const { publicDir } = options
    this.publicDir = publicDir
  }

  async update() {
    const appData: AppData = {
      buildVersion: this.version,
    }

    writeFileSync(
      resolve(this.publicDir, 'app-data.json'),
      JSON.stringify(appData, null, 2),
    )

    return true
  }
}
