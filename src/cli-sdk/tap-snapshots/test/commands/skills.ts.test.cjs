/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/skills.ts > TAP > mermaid workspaces > workspace under the project 1`] = `
flowchart TD
a("root:my-project")
a -->|"a#64;workspace:*"| b("workspace:a")
b -->|"x#64;1"| c("npm:x#64;1.0.0")
c -->|"x#64;1.0.0"| d("s"):::b
classDef b fill:turquoise,color:#242424
`

exports[`test/commands/skills.ts > TAP > usage > usage 1`] = `
Usage:
  vlt skills
  vlt skills list [<query>]
  vlt skills link [<query>]

Manage the agent skills shipped by installed packages.

A skill is a folder with a \`SKILL.md\` file
(https://agentskills.io/specification). Packages ship them as a root \`SKILL.md\`,
or at \`<name>/SKILL.md\` in \`skills/\`, \`dist/skills/\` or \`.agents/skills/\`: the
first skill of a name wins.

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

    view
      Output format. mermaid: list only.

      ​--view=[human | json | mermaid]

`

exports[`test/commands/skills.ts > TAP > views > human colors list aliased 1`] = `
[0mmy-project
├── [33mfind-skills (vercelskills (skills@1.7.2)) (linked)[39m
└── x (mine (theirs))[0m
`

exports[`test/commands/skills.ts > TAP > views > human colors list empty 1`] = `
No agent skills found in installed packages.
`

exports[`test/commands/skills.ts > TAP > views > human colors list many 1`] = `
[0mmy-project
├── [33ma (foo@1.0.0) (linked)[39m
├── [33mb (foo@1.0.0) (linked in .claude/skills)[39m
└── bar (@s/bar)[0m
`

exports[`test/commands/skills.ts > TAP > views > human colors list no dirs 1`] = `
[0mmy-project
└── [33ma (foo@1.0.0) (linked in .agents/skills)[39m[0m
No agent skill dirs: skills-dir is empty
`

exports[`test/commands/skills.ts > TAP > views > human colors list one 1`] = `
[0mmy-project
└── a (foo@1.0.0)[0m
`

exports[`test/commands/skills.ts > TAP > views > human colors list skipped 1`] = `
No agent skills found in installed packages.
⚠️ Skipped .claude/skills (outside the project)
`

exports[`test/commands/skills.ts > TAP > views > human colors list unscanned 1`] = `
No agent skills found in installed packages.
⏳ 1 skill left out, security data timed out: a (foo@1.0.0). Try again later.
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

exports[`test/commands/skills.ts > TAP > views > human link unscanned 1`] = `
🧹 Removed 1 skill link:
  .agents/skills/a
⏳ 2 skills left out, Socket has not scanned their packages yet: a (foo@1.0.0), b (foo@1.0.0). Try again later.
`

exports[`test/commands/skills.ts > TAP > views > human list aliased 1`] = `
my-project
├── find-skills (vercelskills (skills@1.7.2)) (linked)
└── x (mine (theirs))
`

exports[`test/commands/skills.ts > TAP > views > human list empty 1`] = `
No agent skills found in installed packages.
`

exports[`test/commands/skills.ts > TAP > views > human list many 1`] = `
my-project
├── a (foo@1.0.0) (linked)
├── b (foo@1.0.0) (linked in .claude/skills)
└── bar (@s/bar)
`

exports[`test/commands/skills.ts > TAP > views > human list no dirs 1`] = `
my-project
└── a (foo@1.0.0) (linked in .agents/skills)
No agent skill dirs: skills-dir is empty
`

exports[`test/commands/skills.ts > TAP > views > human list one 1`] = `
my-project
└── a (foo@1.0.0)
`

exports[`test/commands/skills.ts > TAP > views > human list skipped 1`] = `
No agent skills found in installed packages.
⚠️ Skipped .claude/skills (outside the project)
`

exports[`test/commands/skills.ts > TAP > views > human list unscanned 1`] = `
No agent skills found in installed packages.
⏳ 1 skill left out, security data timed out: a (foo@1.0.0). Try again later.
`

exports[`test/commands/skills.ts > TAP > views > human unchanged 1`] = `
No changes made.
`

exports[`test/commands/skills.ts > TAP > views > json list aliased 1`] = `
Object {
  "action": "list",
  "dirs": Array [
    ".agents/skills",
  ],
  "skills": Array [
    Object {
      "dependency-name": "vercelskills",
      "description": undefined,
      "linked": Array [
        ".agents/skills",
      ],
      "name": "find-skills",
      "package-id": "~npm~skills@1.7.2",
      "path": "/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a",
    },
    Object {
      "dependency-name": "mine",
      "description": undefined,
      "linked": Array [],
      "name": "x",
      "package-id": "~npm~theirs@1.0.0",
      "path": "/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a",
    },
  ],
}
`

exports[`test/commands/skills.ts > TAP > views > json list empty 1`] = `
Object {
  "action": "list",
  "dirs": Array [
    ".agents/skills",
    ".claude/skills",
  ],
  "skills": Array [],
}
`

exports[`test/commands/skills.ts > TAP > views > json list many 1`] = `
Object {
  "action": "list",
  "dirs": Array [
    ".agents/skills",
    ".claude/skills",
  ],
  "skills": Array [
    Object {
      "dependency-name": "foo",
      "description": undefined,
      "linked": Array [
        ".agents/skills",
        ".claude/skills",
      ],
      "name": "a",
      "package-id": "~npm~foo@1.0.0",
      "path": "/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a",
    },
    Object {
      "dependency-name": "foo",
      "description": undefined,
      "linked": Array [
        ".claude/skills",
      ],
      "name": "b",
      "package-id": "~npm~foo@1.0.0",
      "path": "/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a",
    },
    Object {
      "dependency-name": "@s/bar",
      "description": undefined,
      "linked": Array [],
      "name": "bar",
      "package-id": "~npm~@s+bar@1.0.0",
      "path": "/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a",
    },
  ],
}
`

exports[`test/commands/skills.ts > TAP > views > json list no dirs 1`] = `
Object {
  "action": "list",
  "dirs": Array [],
  "skills": Array [
    Object {
      "dependency-name": "foo",
      "description": undefined,
      "linked": Array [
        ".agents/skills",
      ],
      "name": "a",
      "package-id": "~npm~foo@1.0.0",
      "path": "/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a",
    },
  ],
}
`

exports[`test/commands/skills.ts > TAP > views > json list one 1`] = `
Object {
  "action": "list",
  "dirs": Array [
    ".agents/skills",
    ".claude/skills",
  ],
  "skills": Array [
    Object {
      "dependency-name": "foo",
      "description": "does a",
      "linked": Array [],
      "name": "a",
      "package-id": "~npm~foo@1.0.0",
      "path": "/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a",
    },
  ],
}
`

exports[`test/commands/skills.ts > TAP > views > json list skipped 1`] = `
Object {
  "action": "list",
  "dirs": Array [],
  "skills": Array [],
  "skipped": Array [
    ".claude/skills (outside the project)",
  ],
}
`

exports[`test/commands/skills.ts > TAP > views > json list unscanned 1`] = `
Object {
  "action": "list",
  "dirs": Array [
    ".agents/skills",
    ".claude/skills",
  ],
  "skills": Array [],
  "unscanned": Array [
    "a (foo@1.0.0)",
  ],
  "unscannedReason": "timeout",
}
`

exports[`test/commands/skills.ts > TAP > views > mermaid list aliased 1`] = `
flowchart TD
a("root:my-project")
a -->|"vercelskills#64;npm:skills#64;1"| d("npm:skills#64;1.7.2")
d -->|"vercelskills (skills#64;1.7.2)"| g("find-skills (linked)"):::b
a -->|"mine#64;npm:theirs#64;1"| e("npm:theirs#64;1.0.0")
e -->|"mine (theirs)"| h("x"):::b
classDef b fill:turquoise,color:#242424
`

exports[`test/commands/skills.ts > TAP > views > mermaid list empty 1`] = `
flowchart TD
a("root:my-project")
`

exports[`test/commands/skills.ts > TAP > views > mermaid list many 1`] = `
flowchart TD
a("root:my-project")
a -->|"foo#64;1"| b("npm:foo#64;1.0.0")
b -->|"foo#64;1.0.0"| g("a (linked)"):::b
b -->|"foo#64;1.0.0"| h("b (linked in .claude/skills)"):::b
b -->|"#64;s/bar#64;1"| c("npm:#64;s/bar#64;1.0.0")
c -->|"#64;s/bar"| i("bar"):::b
classDef b fill:turquoise,color:#242424
`

exports[`test/commands/skills.ts > TAP > views > mermaid list no dirs 1`] = `
flowchart TD
a("root:my-project")
a -->|"foo#64;1"| b("npm:foo#64;1.0.0")
b -->|"foo#64;1.0.0"| g("a (linked in .agents/skills)"):::b
classDef b fill:turquoise,color:#242424
%% No agent skill dirs: skills-dir is empty
`

exports[`test/commands/skills.ts > TAP > views > mermaid list one 1`] = `
flowchart TD
a("root:my-project")
a -->|"foo#64;1"| b("npm:foo#64;1.0.0")
b -->|"foo#64;1.0.0"| g("a"):::b
classDef b fill:turquoise,color:#242424
`

exports[`test/commands/skills.ts > TAP > views > mermaid list skipped 1`] = `
flowchart TD
a("root:my-project")
%% ⚠️ Skipped .claude/skills (outside the project)
`

exports[`test/commands/skills.ts > TAP > views > mermaid list unscanned 1`] = `
flowchart TD
a("root:my-project")
%% ⏳ 1 skill left out, security data timed out: a (foo@1.0.0). Try again later.
`
