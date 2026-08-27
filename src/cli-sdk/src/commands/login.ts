import { RegistryClient } from '@vltpkg/registry-client'
import { configWriteTarget } from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import { missingRegistryError } from '../require-registry.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'login',
    usage: [''],
    description: `Authenticate against a registry, and store the token in
                  the appropriate config file for later use.

                  There is no default registry, so a registry must either
                  already be configured or be provided with
                  \`--registry=<url>\`. On success the registry is written to
                  the project's \`vlt.json\`, so that it applies to this
                  project only. Pass \`--config=user\` to configure it for
                  every project instead.`,
    options: {
      registry: {
        value: '<url>',
        description:
          'Registry URL to authenticate against. Saved to vlt.json.',
      },
      identity: {
        value: '<name>',
        description: 'Identity namespace used to store auth tokens.',
      },
      config: {
        value: '<user | project>',
        description:
          'Which config file to write the registry to. Defaults to ' +
          '`project`.',
      },
    },
  })

export const command: CommandFn<void> = async conf => {
  const { registry } = conf.options
  // login is exempt from the needsRegistry pre-check, since it is the
  // guided way out of it -- but it still needs a target.
  if (!registry) throw missingRegistryError()
  const rc = new RegistryClient(conf.options)
  await rc.login(registry)
  // persist the registry so subsequent commands are configured
  await conf.addConfigToFile(configWriteTarget(conf, 'project'), {
    registry,
  })
}
