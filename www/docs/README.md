# @vltpkg/docs

The source for [docs.vlt.sh](https://docs.vlt.sh), built with Next.js
and fumadocs. Pages live in `content/`.

```bash
vlr dev            # local dev server on http://localhost:3000
vlr typedoc        # generate content/client/api-reference
vlr build          # typedoc + production build
vlr lint:mdx       # structural MDX checks
vlr typedoc:check  # validate TypeDoc links without writing
```
