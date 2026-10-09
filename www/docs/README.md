# @vltpkg/docs

The source for [docs.vlt.sh](https://docs.vlt.sh), built with Next.js
and fumadocs. Pages live in `content/`.

```bash
vlr dev            # local dev server on http://localhost:3000
vlr typedoc        # generate content/client/api-reference
vlr build          # skills copy + typedoc + production build
vlr lint:mdx       # structural MDX checks
vlr typedoc:check  # validate TypeDoc links without writing
```

`vlr dev` and `vlr build` copy the agent skills in the repo's root
`skills/` into `public/skills` (gitignored), which serves them at
`/skills/<name>/SKILL.md`. Restart `vlr dev` after editing a skill.
