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
  vlt skills unlink [<query>]

Manage the agent skills shipped by installed packages.

A skill is a folder with a \`SKILL.md\` file
(https://agentskills.io/specification). Packages ship them at
\`skills/<name>/SKILL.md\`, or as a root \`SKILL.md\`.

Skills are linked into \`./skills/<skill>\`. When packages ship skills with the
same name, one is linked and the others are reported. Only links made by vlt
(pointing into \`node_modules/.vlt\`) are ever replaced or removed; anything else
in the way is skipped.

Use --target or a query after the subcommand to select packages using DSS query
syntax. Use \`vlt install --allow-skills=<query>\` to link skills on install.

  Subcommands

    list
      List the skills of installed packages. The default. Selects all packages
      (\`*\`) by default.

      ​vlt skills list [<query>]

    link
      Link the skills of the selected packages, then remove skill links whose
      skill is no longer installed. Selects \`:not(:malware)\` by default.

      ​vlt skills link [<query>]

    unlink
      Remove the skill links of the selected packages, plus any dangling ones.
      Removes all by default.

      ​vlt skills unlink [<query>]

  Options

    target
      Query selector to filter packages using DSS syntax.

      ​--target=<query>

`

exports[`test/commands/skills.ts > TAP > views > human link all 1`] = `
🔗 Linked 2 agent skills:
  skills/a
  skills/b
🧹 Removed 1 stale skill link:
  skills/x
⚠️ Skipped 2 skills, path in use or taken by another package:
  skills/c
  skills/b (bar@1.0.0)
`

exports[`test/commands/skills.ts > TAP > views > human link nothing 1`] = `
No agent skills found to link.
`

exports[`test/commands/skills.ts > TAP > views > human link one 1`] = `
🔗 Linked 1 agent skill:
  skills/a
`

exports[`test/commands/skills.ts > TAP > views > human link removed only 1`] = `
🧹 Removed 2 stale skill links:
  skills/x
  skills/y
`

exports[`test/commands/skills.ts > TAP > views > human link unchanged 1`] = `
1 agent skill already linked.
⚠️ Skipped 1 skill, path in use or taken by another package:
  skills/b
`

exports[`test/commands/skills.ts > TAP > views > human list aliased 1`] = `
Found 2 agent skills:
  vercelskills (skills@1.7.2) › find-skills (linked)
  mine (theirs) › x
`

exports[`test/commands/skills.ts > TAP > views > human list empty 1`] = `
No agent skills found in installed packages.
`

exports[`test/commands/skills.ts > TAP > views > human list many 1`] = `
Found 2 agent skills:
  foo@1.0.0 › a (linked)
  @s/bar › bar
`

exports[`test/commands/skills.ts > TAP > views > human list one 1`] = `
Found 1 agent skill:
  foo@1.0.0 › a
    does a
`

exports[`test/commands/skills.ts > TAP > views > human unlink many 1`] = `
🧹 Removed 2 skill links:
  skills/a
  skills/b
`

exports[`test/commands/skills.ts > TAP > views > human unlink nothing 1`] = `
No skill links to remove.
`

exports[`test/commands/skills.ts > TAP > views > human unlink one 1`] = `
🧹 Removed 1 skill link:
  skills/a
`
