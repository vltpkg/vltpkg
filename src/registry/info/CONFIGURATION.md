# Configuration

You use `vsr` as a private local registry, a proxy registry or both.
If you want to publish into or consume from the local registry you can
use `http://localhost:<port>`.

To proxy requests to `npm` you can just add `npm` to the pathname (ex.
`http://localhost:<port>/npm` will proxy all requests to `npmjs.org`)

##### For `vlt`:

In your project or user-level `vlt.json` file add the relevant
configuration.

```json
{
  "registries": {
    "npm": "http://localhost:1337npm",
    "local": "http://localhost:1337"
  }
}
```

##### For `npm`, `pnpm`, `yarn` & `bun`:

To use `vsr` as your registry you must either pass a registry config
through a client-specific flag (ex. `--registry=...` for `npm`) or
define client-specific configuration which stores the reference to
your registry (ex. `.npmrc` for `npm`). Access to the registry &
packages is private by default although an `"admin"` user is created
during setup locally (for development purposes) with a default auth
token of `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`.

```ini
; .npmrc
registry=http://localhost:1337
//localhost:1337/:_authToken=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
