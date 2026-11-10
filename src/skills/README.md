# @vltpkg/skills

The agent skills from the vlt repository, packaged so a project can
depend on them and pin a version.

## Usage

Install the package with vlt and link its skills:

```bash
vlt install -D @vltpkg/skills --allow-skills="#@vltpkg/skills"
```

Or run `vlt setup --skills`: it does the same in one step, and adds
`#@vltpkg/skills` to a stored `allow-skills` instead of keeping it, so
a fresh clone and `vlt ci` link the skills too. See
[`vlt setup`](https://docs.vlt.io/client/commands/setup#install-vlts-agent-skills).

To link only one skill, end the selector with `:skill()`:
`--allow-skills="#@vltpkg/skills:skill(vlt-cli)"`. After a plain
`vlt install`, `vlt skills link "#@vltpkg/skills"` links them. See
[`vlt skills`](https://docs.vlt.io/client/commands/skills) for where
the links go.

To add a skill without a dependency, use the skills CLI on the repo:
`vlx skills add vltpkg/vltpkg -- --skill <name>`.

## Skills

| Skill                                                                                | Description                                                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| [dss-query](https://docs.vlt.io/skills/dss-query/SKILL.md)                           | Explain and compose vlt Dependency Selector Syntax (DSS) queries, including Socket-powered security auditing. |
| [vlt-cli](https://docs.vlt.io/skills/vlt-cli/SKILL.md)                               | Map of the vlt CLI for coding agents.                                                                         |
| [vlt-registry-migration](https://docs.vlt.io/skills/vlt-registry-migration/SKILL.md) | Moves a JavaScript repository (single package or monorepo) onto a vlt.io registry.                            |
