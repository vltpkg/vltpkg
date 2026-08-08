![vlt](https://github.com/user-attachments/assets/aec7c817-b83f-4d71-b34a-4e480b97e82c)

# vlt

![vlt Version](https://img.shields.io/npm/v/vlt?logo=npm&label=Version)
![Package Downloads](https://img.shields.io/npm/dm/vlt?logo=npm&label=Downloads)
![GitHub Branch Status](https://img.shields.io/github/checks-status/vltpkg/vltpkg/main?logo=github&label=GitHub)
![Discord Server Status](https://img.shields.io/discord/1093366081067954178?logo=discord&label=Discord)

vlt delivers the tools and infrastructure developers need to
streamline package management, scale efficiently, and secure a faster,
more tailored web experience.

## Getting Started

### Installation

vlt requires Node.js 22.22 or later. Install the CLI with the official
install script:

```bash
curl -fsSL https://install.vlt.sh | bash
```

### Configure a registry

Sign up or log in at [vlt.io](https://www.vlt.io), then run the
onboarding wizard:

```bash
vlt setup
```

The wizard authenticates with your account and configures the registry
aliases used by `vlt install` and `vlx`. You can instead
[configure another registry directly](https://docs.vlt.sh/cli/registries).

### Install and run

In an existing JavaScript project:

```bash
# Install dependencies from package.json
vlt install

# Add a dependency
vlt install lodash

# Run a package.json script
vlt run test

# Execute a package without installing it as a dependency
vlx cowsay "hello from vlt"
```

vlt does not run dependency lifecycle scripts during installation.
Review packages that require scripts and build the approved ones
explicitly:

```bash
vlt query ':scripts'
vlt build
```

## Documentation

Visit [docs.vlt.sh](https://docs.vlt.sh/cli) for guides, migration
instructions, configuration, and the complete command reference.

## Community

Report bugs in
[GitHub Issues](https://github.com/vltpkg/vltpkg/issues), ask
questions and share ideas in
[GitHub Discussions](https://github.com/vltpkg/vltpkg/discussions), or
chat with the community on
[Discord](https://discord.com/invite/qdbXTqxZzZ). Please follow the
[Code of Conduct](https://github.com/vltpkg/vltpkg/blob/main/CODE_OF_CONDUCT.md)
in all community spaces.

## Contributing

Contributions are welcome. Read the
[contributing guide](https://github.com/vltpkg/vltpkg/blob/main/CONTRIBUTING.md)
before opening a pull request.

## License

[BSD-2-Clause-Patent](./LICENSE)
