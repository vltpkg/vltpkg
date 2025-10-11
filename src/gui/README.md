![gui](https://github.com/user-attachments/assets/864bef92-2198-45f7-8c37-1f46ba324b00)

# @vltpkg/gui

The vlt gui for visualizing dependencies in your project.

### Documentation

#### Development

Create a `.env` file in the `src/gui` directory with your development
settings:

```bash
# Enable live reload for development
__VLT_INTERNAL_LIVE_RELOAD=1

# Optional: Simulate hosted environment (useful for testing auth and other hosted-only features)
# __VLT_FORCE_HOSTED=1
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
> Environment variables are loaded from your `.env` file and injected
> at build time. If the esbuild dev server is not running, then
> requests will fallback to the static asset like normal and message
> will be logged in the browser.
>
> - `__VLT_INTERNAL_LIVE_RELOAD` has no effect on production builds.
>   The code is stripped by esbuild from both the GUI and the CLI.
> - `__VLT_FORCE_HOSTED` forces the application to behave as if it's
>   running in a hosted environment, disabling local GUI server
>   features. This has no effect on production builds where hosted
>   mode is determined automatically based on the hostname and port.

See the [contributing guide](../../CONTRIBUTING.md) for more
information on how to build and develop the various workspaces.

### License

This project is licensed under the
[Functional Source License](https://fsl.software)
([**FSL-1.1-MIT**](LICENSE.md)).
