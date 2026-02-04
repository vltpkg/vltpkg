/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/config/index.ts > TAP > load both configs, project writes over userconfig > formatted options uses custom inspect 1`] = `
{
  'git-hosts': {
    github: 'https://github',
    bitbucket: 'git+ssh://git@bitbucket.org:$1/$2.git',
    gitlab: 'git+ssh://git@gitlab.com:$1/$2.git',
    gist: 'git+ssh://git@gist.github.com/$1.git',
    asdfasdf: 'https://example.com'
  },
  projectRoot: '{CWD}/.tap/fixtures/test-config-index.ts-load-both-configs-project-writes-over-userconfig',
  catalog: undefined,
  catalogs: undefined,
  'jsr-registries': { jsr: 'https://npm.jsr.io/' },
  registry: 'https://registry.npmjs.org/',
  'scope-registries': {},
  registries: {
    npm: 'https://registry.npmjs.org/',
    gh: 'https://npm.pkg.github.com/'
  },
  'git-host-archives': {
    github: 'https://api.github.com/repos/$1/$2/tarball/$committish',
    bitbucket: 'https://bitbucket.org/$1/$2/get/$committish.tar.gz',
    gist: 'https://codeload.github.com/gist/$1/tar.gz/$committish',
    gitlab: 'https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish'
  }
}
`
