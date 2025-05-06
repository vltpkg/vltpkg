// Note: this class does NOT handle reading from the environment,
// only the keychain file. Any other source of auth data should be
// handled before or instead of this utility.
import { XDG } from '@vltpkg/xdg'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export class Keychain<V extends string = string> {
  #data?: Record<string, V>
  #didExitSave = false
  #dirty = false
  #file: string
  #xdg: XDG

  constructor(application: string) {
    this.#xdg = new XDG(application)
    this.#file = this.#xdg.data('keychain.json')
  }

  get file() {
    return this.#file
  }
  get dirty() {
    return this.#dirty
  }

  async get(key: string): Promise<V | undefined> {
    return (await this.#load()).getSync(key)
  }

  getSync(key: string): V | undefined {
    return this.#data?.[key]
  }

  async load() {
    await this.#load()
  }

  async #load(): Promise<this> {
    if (this.#data) return this
    try {
      this.#data = JSON.parse(
        await readFile(this.#file, 'utf8'),
      ) as Record<string, V>
    } catch {}
    if (!this.#data) {
      // just write the file if it failed in any way.
      this.#data = {}
      await this.#writeFile().catch(() => {})
    }
    return this
  }

  async has(key: string): Promise<boolean> {
    return (await this.#load()).hasSync(key)
  }

  hasSync(key: string): boolean {
    return !!this.#data && Object.hasOwn(this.#data, key)
  }

  async #mkdir() {
    await mkdir(dirname(this.#file), {
      recursive: true,
      mode: 0o700,
    })
  }

  async #writeFile() {
    await this.#mkdir()
    const tmp = this.#file + String(Math.random())
    await writeFile(tmp, JSON.stringify(this.#data) + '\n', {
      mode: 0o600,
    })
    await rename(tmp, this.#file)
  }

  set(key: string, value: V) {
    ;(this.#data ??= {})[key] = value
    this.#makeDirty()
  }

  delete(key: string) {
    if (!this.#data) return
    delete this.#data[key]
    this.#makeDirty()
  }

  #makeDirty() {
    this.#dirty = true
    if (!this.#didExitSave) {
      this.#didExitSave = true
      process.once('beforeExit', () => {
        void this.save()
      })
    }
  }

  async save() {
    if (!this.#dirty || !this.#data) return
    this.#dirty = false
    await this.#writeFile()
  }
}
