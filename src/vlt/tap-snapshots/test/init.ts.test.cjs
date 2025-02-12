/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/init.ts > TAP > init > should init a new package.json file 1`] = `
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": "User <foo@bar.ca>"
}

`

exports[`test/init.ts > TAP > init > should output expected message 1`] = `
Wrote to {CWD}/.tap/fixtures/test-init.ts-init/my-project/package.json:

{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": "User <foo@bar.ca>"
}

Modify & add package.json properties using \`vlt pkg\`, e.g:

  vlt pkg set "description=My new project"

`

exports[`test/init.ts > TAP > init with author info > should init a new package.json file with author info 1`] = `
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": "Ruy Adorno"
}

`

exports[`test/init.ts > TAP > init with author info > should output expected message with author info 1`] = `
Wrote to {CWD}/.tap/fixtures/test-init.ts-init-with-author-info/my-project/package.json:

{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": "Ruy Adorno"
}

Modify & add package.json properties using \`vlt pkg\`, e.g:

  vlt pkg set "description=My new project"

`

exports[`test/init.ts > TAP > missing user info > should init a new package.json file with no user info 1`] = `
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js"
}

`

exports[`test/init.ts > TAP > missing user info > should output expected message when no user info is found 1`] = `
Wrote to {CWD}/.tap/fixtures/test-init.ts-missing-user-info/my-project/package.json:

{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js"
}

Modify & add package.json properties using \`vlt pkg\`, e.g:

  vlt pkg set "description=My new project"

`
