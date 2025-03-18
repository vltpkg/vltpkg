![gui](https://github.com/user-attachments/assets/864bef92-2198-45f7-8c37-1f46ba324b00)

# @vltpkg/gui

The vlt gui for visualizing dependencies in your project.

### Documentation

#### Development

To enable live reload, first set the environment variable
`_VLT_DEV_LIVE_RELOAD`:

```bash
$ export _VLT_DEV_LIVE_RELOAD=1
```

To start the esbuild dev server, run the gui watch script:

```bash
$ pnpm -F gui watch
```

In a separate terminal, run the app:

```bash
$ ./scripts/bins/vlt gui
```

Changes to `src/gui` will cause open browser windows to `reload()`.

> ##### Note:
>
> If the esbuild dev server is not running, then requests will
> fallback to the static asset like normal and message will be logged
> in the browser.
>
> `_VLT_DEV_LIVE_RELOAD` has no effect on production builds. The code
> is stripped by esbuild from both the GUI and the CLI.

See the [contributing guide](../../CONTRIBUTING.md) for more
information on how to build and develop the various workspaces.

### License

[BSD-2-Clause Plus Patent License](../../LICENSE)
