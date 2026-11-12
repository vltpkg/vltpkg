/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/setup.ts > TAP > usage > must match snapshot 1`] = `
Usage:

\`\`\`
vlt setup [<account>]
vlt setup --path [--yes] [--global-bin-dir=<path>]
vlt setup --skills
\`\`\`

Connect vlt to your vlt.io account. vlt installs public packages without it, through vlt's public npm mirror; setup points the \`npm\` alias at your account's npm mirror (no usage limits) and adds your private \`main\` registry.

Sign up or log in at https://www.vlt.io first. The wizard authenticates against your account, stores the token for both the \`npm\` and \`main\` registries, and writes those aliases (and any additional aliases you add) to your user \`vlt.json\`.

In a terminal, if the global bin folder isn't on your \`PATH\` or set up yet, it ends by asking \`Setup PATH for global installs? (Y/n)\`: yes adds it (same as \`--path\`), no skips it. Run \`vlt setup --path\` later to do just that step.

With \`--config=project\`, in a project with a \`package.json\`, it then asks \`Do you want to install vlt skills? (Y/n)\` (\`--yes\` accepts): yes adds \`@vltpkg/skills\` to \`devDependencies\`, saves \`allow-skills\` to the project \`vlt.json\` and links the skills. Run \`vlt setup --skills\` to do just that step.

With \`--path\`, add the global bin folder (\`--global-bin-dir\`) to your \`PATH\` instead: writes \`<global-dir>/env\` and a marked section that loads it into your shell config. On Windows it adds it to your user \`Path\` (\`HKCU\\\\Environment\`).

## Options

### config

Which config file to write to. Defaults to \`user\`; pass \`--config=project\` to write to the project \`vlt.json\`.

\`\`\`
--config=<user | project>
\`\`\`

### registries

Additional registry aliases to stage non-interactively. Combine with \`--yes\` to run setup unattended.

\`\`\`
--registries=<name=url>
\`\`\`

### yes

Skip interactive prompts (requires <account> and does not open a browser for authentication). With --path: edit without asking. Without --path: skips the PATH prompt. With --config=project: installs the vlt skills.

\`\`\`
--yes
\`\`\`

### path

Only add the global bin folder to your PATH via your shell config (user Path on Windows).

\`\`\`
--path
\`\`\`

### skills

Only install vlt's agent skills (\`@vltpkg/skills\`) in the current project. No prompt.

\`\`\`
--skills
\`\`\`

### global-bin-dir

The folder to add to your PATH.

\`\`\`
--global-bin-dir=<path>
\`\`\`

`
