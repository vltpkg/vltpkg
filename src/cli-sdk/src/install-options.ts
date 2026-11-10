import type { LoadedConfig } from './config/index.ts'

/** `install()` options from the config, as `vlt install` sets them. */
export const installOptions = (conf: LoadedConfig) => {
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  return {
    ...conf.options,
    frozenLockfile: conf.options['frozen-lockfile'],
    expectLockfile: conf.options['expect-lockfile'],
    allowScripts,
    skillsDirs: conf.get('skills-dir'),
    lockfileOnly: conf.options['lockfile-only'],
    saveExact: conf.values['save-exact'],
    savePrefix: conf.values['save-prefix'],
  }
}
