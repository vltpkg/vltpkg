/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/skills.ts > TAP > usage > usage 1`] = `
Usage:
  vlt skills
  vlt skills list [<query>]
  vlt skills link [<query>]

Manage the agent skills shipped by installed packages.

A skill is a folder with a \`SKILL.md\` file
(https://agentskills.io/specification). Packages ship them at
\`skills/<name>/SKILL.md\`, or as a root \`SKILL.md\`.

Skills are linked into the project's agent skill dirs: \`.agents/skills\`, plus
\`<folder>/skills\` for each agent folder at the project root (e.g. \`.claude/\`),
or the \`skills-dir\` config. When packages ship skills with the same name, one is
linked and the others are reported. Only links made by vlt (pointing into
\`node_modules/.vlt\`) are ever replaced or removed; anything else in the way is
skipped.

Use --target or a query after the subcommand to select packages using DSS query
syntax. End a selector with \`:skill(<name>, …)\` to pick single skills, e.g.
\`#skills:skill(find-skills)\`. Use \`vlt install --allow-skills=<query>\` to link
skills on install.

  Subcommands

    list
      List the skills of installed packages. The default. Selects all packages
      (\`*\`) by default. Applies \`:skill()\`: preview a query before \`link\` saves
      it.

      ​vlt skills list [<query>]

    link
      Set, save and apply \`allow-skills\`: link what the query selects and remove
      vlt links to other skills. With no query: the stored one, or
      \`:not(:malware)\`. Asks before replacing or editing a stored query (-y
      skips). Saves to the project vlt.json, or the user one with --config=user.

      ​vlt skills link [<query>]

  Options

    target
      Query selector to filter packages using DSS syntax.

      ​--target=<query>

    yes
      Skip the prompts: replace or keep the stored allow-skills without asking.

      ​--yes

    config
      vlt.json to save allow-skills to (default: project).

      ​--config=user|project

`

exports[`test/commands/skills.ts > TAP > views > human link all 1`] = `
🔗 Linked 2 agent skills:
  .agents/skills/a
  .claude/skills/a
  .agents/skills/b
🧹 Removed 1 skill link:
  .agents/skills/x
⚠️ Skipped 2 skills, path in use or taken by another package:
  .claude/skills/b
  .agents/skills/c (bar@1.0.0)
⚠️ Skipped .kiro/skills (not a directory)
⚠️ Could not update .claude/skills/.gitignore
`

exports[`test/commands/skills.ts > TAP > views > human link nothing 1`] = `
No agent skills found to link.
`

exports[`test/commands/skills.ts > TAP > views > human link one 1`] = `
🔗 Linked 1 agent skill:
  .agents/skills/a
`

exports[`test/commands/skills.ts > TAP > views > human link removed only 1`] = `
🧹 Removed 2 skill links:
  .agents/skills/x
  .claude/skills/y
`

exports[`test/commands/skills.ts > TAP > views > human link saved project 1`] = `
🔗 Linked 1 agent skill:
  .agents/skills/a
Saved allow-skills="#a:skill(x)" to vlt.json
`

exports[`test/commands/skills.ts > TAP > views > human link saved user 1`] = `
🔗 Linked 1 agent skill:
  .agents/skills/a
Saved allow-skills="#a" to user vlt.json
`

exports[`test/commands/skills.ts > TAP > views > human link unchanged 1`] = `
1 agent skill already linked.
⚠️ Skipped 1 skill, path in use or taken by another package:
  .agents/skills/b
`

exports[`test/commands/skills.ts > TAP > views > human link unmatched 1`] = `
No agent skills found to link.
⚠️ No skill matches "nope"; the selected packages ship: a, b
⚠️ No skill matches "x*"; the selected packages ship: a, b
⚠️ No skill matches "y"; the selected packages ship no skills
Saved allow-skills="#a:skill(nope, x*), #b:skill(y)" to vlt.json
`

exports[`test/commands/skills.ts > TAP > views > human list aliased 1`] = `
Agent skill dirs: .agents/skills
Found 2 agent skills:
  vercelskills (skills@1.7.2) › find-skills (linked)
  mine (theirs) › x
`

exports[`test/commands/skills.ts > TAP > views > human list empty 1`] = `
Agent skill dirs: .agents/skills, .claude/skills
No agent skills found in installed packages.
`

exports[`test/commands/skills.ts > TAP > views > human list many 1`] = `
Agent skill dirs: .agents/skills, .claude/skills
Found 3 agent skills:
  foo@1.0.0 › a (linked)
  foo@1.0.0 › b (linked in .claude/skills)
  @s/bar › bar
`

exports[`test/commands/skills.ts > TAP > views > human list no dirs 1`] = `
Agent skill dirs: none (skills-dir is empty)
Found 1 agent skill:
  foo@1.0.0 › a (linked in .agents/skills)
`

exports[`test/commands/skills.ts > TAP > views > human list one 1`] = `
Agent skill dirs: .agents/skills, .claude/skills
Found 1 agent skill:
  foo@1.0.0 › a
    does a
`

exports[`test/commands/skills.ts > TAP > views > human list skipped 1`] = `
Agent skill dirs: none
⚠️ Skipped .claude/skills (outside the project)
No agent skills found in installed packages.
`

exports[`test/commands/skills.ts > TAP > views > human unchanged 1`] = `
No changes made.
`
