import { useGraphStore } from '@/state/index.js'
import { useLayoutEffect, useState } from 'react'
import { codeToHtml } from 'shiki/bundle/web'

export function CodeBlock({
  code,
  lang,
}: {
  code: string
  lang: string
}) {
  const [out, setOut] = useState<string | null>(null)
  const theme = useGraphStore(state => state.theme)
  useLayoutEffect(() => {
    async function startCodeBlock() {
      const out = await codeToHtml(code, {
        lang,
        theme: theme === 'light' ? 'github-light' : 'poimandres',
      })
      if (out) {
        setOut(out)
      }
    }
    startCodeBlock().catch((err: unknown) => console.error(err))
  }, [code, lang, theme])

  return (
    <>
      {out ?
        <div
          className={`snap-x overflow-x-scroll rounded-md border border-solid border-neutral-600 text-xs ${theme === 'light' ? 'bg-white' : 'bg-[#1b1e28]'} p-4`}>
          <div dangerouslySetInnerHTML={{ __html: out }} />
        </div>
      : ''}
    </>
  )
}
