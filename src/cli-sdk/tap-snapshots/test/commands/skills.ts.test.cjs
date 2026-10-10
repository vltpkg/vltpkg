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

Skills are linked into \`./skills/<package>/<skill>\`. Only links made by vlt
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
      Link the skills of the selected packages, then remove stale skill links
      (dangling, or no longer a skill of a linked package). Selects
      \`:not(:malware)\` by default.

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
  skills/foo/a
  skills/foo/b
🧹 Removed 1 stale skill link:
  skills/gone/x
⚠️ Skipped 2 skills, path in use:
  skills/bar/b
  skills/bar/c
`

exports[`test/commands/skills.ts > TAP > views > human link nothing 1`] = `
No agent skills found to link.
`

exports[`test/commands/skills.ts > TAP > views > human link one 1`] = `
🔗 Linked 1 agent skill:
  skills/foo/a
`

exports[`test/commands/skills.ts > TAP > views > human link removed only 1`] = `
🧹 Removed 2 stale skill links:
  skills/gone/x
  skills/gone/y
`

exports[`test/commands/skills.ts > TAP > views > human link unchanged 1`] = `
1 agent skill already linked.
⚠️ Skipped 1 skill, path in use:
  skills/bar/b
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
  skills/foo/a
  skills/foo/b
`

exports[`test/commands/skills.ts > TAP > views > human unlink nothing 1`] = `
No skill links to remove.
`

exports[`test/commands/skills.ts > TAP > views > human unlink one 1`] = `
🧹 Removed 1 skill link:
  skills/foo/a
`
