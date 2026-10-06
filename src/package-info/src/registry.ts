import type { RegistryClient } from '@vltpkg/registry-client'

/**
 * What `GET /-/vlt/capabilities` answers: the vlt extensions a registry
 * serves. Every field is optional — a registry that has never heard of the
 * document, or that is down when it is asked, reads as an empty one.
 */
export type Capabilities = {
  /** contract version of `/-/vlt/manifests`, the batch manifest endpoint */
  manifests?: string
  /** contract version of `/-/vlt/resolve`, server-side range resolution */
  resolve?: string
  /** contract version of the `?stable` packument filter */
  'stable-filter'?: string
  /** packument media types the registry serves, most preferred first */
  mimeTypes?: string[]
}

/** What a registry with no vlt extensions supports. */
const none: Capabilities = Object.freeze({})

/**
 * One registry: its url, the urls and keys everything about a package on
 * it is built from, and the capabilities document it answers. A
 * PackageInfoClient keeps one per registry it talks to, so the document is
 * asked for once however many specs name the registry.
 */
export class Registry {
  /** the registry's url, with exactly one trailing slash */
  readonly url: string
  /**
   * origin and path with no trailing slash: the form tokens and caches key
   * on, and what makes two spellings of a registry the same registry
   */
  readonly key: string
  #client: () => Promise<RegistryClient>
  #asked?: Promise<Capabilities>
  #known?: Capabilities

  constructor(url: string, client: () => Promise<RegistryClient>) {
    this.url = url.replace(/\/*$/, '/')
    this.key = Registry.key(url)
    this.#client = client
  }

  /** The key `url` would have as a registry. */
  static key(url: string): string {
    const u = new URL(url)
    return (u.origin + u.pathname).replace(/\/+$/, '')
  }

  /** `path` under this registry. */
  resolve(path: string): URL {
    return new URL(path, this.url)
  }

  /** The packument of `name`, filtered to stable versions when asked. */
  packumentUrl(name: string, stable = false): URL {
    return this.resolve(stable ? `${name}?stable` : name)
  }

  /** The directory a v2 packument's tarball basenames resolve against. */
  tarballDirectory(name: string): string {
    return `${this.url}${name}/-/`
  }

  /** What identifies the package `name` on this registry. */
  packageKey(name: string): string {
    return `${this.url}${name}`
  }

  /** What identifies `spec` of the package `name` on this registry. */
  manifestKey(name: string, spec: string): string {
    return `${this.packageKey(name)}@${spec}`
  }

  /** Whether the capabilities document has arrived. */
  get known(): boolean {
    return this.#known !== undefined
  }

  /**
   * Whether the registry has said it serves `name`. False until the
   * document has arrived; asking starts the request, so a caller that
   * cannot wait gets the answer on a later call without ever waiting.
   */
  hasCapability(name: keyof Capabilities): boolean {
    if (!this.#known) {
      void this.capabilities()
      return false
    }
    return this.#known[name] !== undefined
  }

  /**
   * The vlt extensions this registry serves, from its
   * `GET /-/vlt/capabilities` document. Anything short of a document — a
   * registry that 404s it, a request that fails, a body that does not
   * parse — answers an empty one, so a missing key means unsupported.
   * Asked once; the RegistryClient disk cache behind it keeps later
   * processes off the network for the day the registry allows.
   */
  async capabilities(): Promise<Capabilities> {
    this.#asked ??= this.#fetchCapabilities().then(caps => {
      this.#known = caps
      return caps
    })
    return this.#asked
  }

  async #fetchCapabilities(): Promise<Capabilities> {
    try {
      const client = await this.#client()
      const response = await client.request(
        this.resolve('-/vlt/capabilities'),
        { headers: { accept: 'application/json' } },
      )
      if (response.statusCode !== 200) return none
      return asCapabilities(response.json())
    } catch {
      return none
    }
  }

  toString(): string {
    return this.url
  }
}

/**
 * Read a parsed body as a capability document, dropping any field that did
 * not arrive in the shape the contract gives it.
 */
const asCapabilities = (body: unknown): Capabilities => {
  if (typeof body !== 'object' || body === null) return none
  const doc = body as Record<string, unknown>
  const caps: Capabilities = {}
  for (const key of [
    'manifests',
    'resolve',
    'stable-filter',
  ] as const) {
    const version = doc[key]
    if (typeof version === 'string') caps[key] = version
  }
  const { mimeTypes } = doc
  if (
    Array.isArray(mimeTypes) &&
    mimeTypes.every(type => typeof type === 'string')
  ) {
    caps.mimeTypes = mimeTypes
  }
  return caps
}
