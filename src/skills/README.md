# @vltpkg/skills

Discovers agent skills (`src/*/skills/*/SKILL.md`) anywhere under this
repo's `src/`, resolves each skill's linked file set, and packages
them for publishing — per-skill files plus a
`.well-known/agent-skills/index.json` discovery manifest per the
[agent-skills-discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc).

## Usage

```js
import { syncAgentSkills } from '@vltpkg/skills'

const { skillCount, fileCount, archiveCount } = await syncAgentSkills(
  srcRoot,
  outputRoot,
  siteUrl,
)
```

`www/docs/scripts/sync-agent-skills.mts` is the reference consumer: it
supplies the docs-specific output path and site URL and wires this
into `predev`/`prebuild`.
