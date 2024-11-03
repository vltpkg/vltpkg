import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'
import { resolve } from 'import-meta-resolve'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { type CliCommand } from '@vltpkg/cli/types'
import { glob, type Loader, type LoaderContext } from 'astro/loaders'
import assert from 'assert'

type EntryTypes = Map<
  string,
  {
    extensions: string[]
    getEntryInfo: (o: {
      contents: string
      fileUrl: string
    }) => Promise<unknown>
  }
>

const jackLoader = (
  loader: Loader,
  getJack: (js: any) => Promise<{ usageMarkdown: () => string }>,
) => {
  return defineCollection({
    loader: {
      ...loader,
      load: async (ctx_: LoaderContext) => {
        const ctx = ctx_ as LoaderContext & { entryTypes: EntryTypes }
        const md = ctx.entryTypes.get('.md')
        assert(md, 'no md loader')
        ctx.entryTypes.set('.js', {
          ...md,
          extensions: ['.js'],
          getEntryInfo: async ({ fileUrl }) => {
            const jack = await import(
              /* @vite-ignore */ fileUrl
            ).then(js => getJack(js))
            return md.getEntryInfo({
              contents: jack.usageMarkdown(),
              fileUrl,
            })
          },
        })
        await loader.load(ctx)
      },
    },
  })
}

const commands = jackLoader(
  glob({
    pattern: '*.js',
    base: fileURLToPath(
      resolve('@vltpkg/cli/commands', import.meta.url),
    ),
  }),
  async (cmd: CliCommand) => {
    return cmd.usage()
  },
)

const config = jackLoader(
  glob({
    pattern: 'index.js',
    base: dirname(
      fileURLToPath(resolve('@vltpkg/cli/config', import.meta.url)),
    ),
  }),
  async (js: typeof import('@vltpkg/cli/config')) => {
    const conf = await js.Config.load()
    return conf.jack
  },
)

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
  commands,
  config,
}
