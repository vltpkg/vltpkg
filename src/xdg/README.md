<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/72b3e499-40c0-4f2a-8cd7-7761303bda62" />
        <h1 align="center">
            <strong>@vltpkg/xdg</strong>
        </h1>
    </a>
</section>

<p align="center">
    Get appropriate data, cache, and config directories following the [XDG spec](https://wiki.archlinux.org/title/XDG_Base_Directory), namespaced to a specific app-name subfolder.
</p>

## Usage

```js
import XDG from '@vltpkg/xdg'

// instantiate with the name of your thing.
const xdg = new XDG('vlt')

const cachePath = xdg.cache('some-path') // ~/.cache/vlt/some-path
const configFile = xdg.config('vlt.json') // ~/.config/vlt/vlt.json
const dataFolder = xdg.data('blah') // ~/.local/share/vlt/blah
const someState = xdg.state('foobar') // ~/.local/state/vlt/fooobar
```
