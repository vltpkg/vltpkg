import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'
import { resolve } from 'import-meta-resolve'
import { relative } from 'path'
import { fileURLToPath } from 'url'
import { type CliCommand } from '@vltpkg/cli/types'
import { glob, type LoaderContext } from 'astro/loaders'
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

const commandLoader = glob({
  pattern: '*.js',
  base: relative(
    import.meta.dirname,
    fileURLToPath(resolve('@vltpkg/cli/commands', import.meta.url)),
  ),
})

const commands = defineCollection({
  loader: {
    ...commandLoader,
    load: async (ctx_: LoaderContext) => {
      const ctx = ctx_ as LoaderContext & { entryTypes: EntryTypes }
      const md = ctx.entryTypes.get('.md')
      assert(md, 'no md loader')
      ctx.entryTypes.set('.js', {
        ...md,
        extensions: ['.js'],
        getEntryInfo: async ({ fileUrl }) => {
          const cmd = (await import(
            /* @vite-ignore */ fileUrl
          )) as CliCommand
          const usage = await cmd.usage()
          return md.getEntryInfo({
            contents: usage.usageMarkdown(),
            fileUrl,
          })
        },
      })
      await commandLoader.load(ctx)
    },
  },
})

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
  commands,
}
