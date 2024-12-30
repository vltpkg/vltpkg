/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > darwin > defaults > must match snapshot 1`] = `
Object {
  "base": Object {
    "cache": "/home/Library/Caches",
    "config": "/home/Library/Preferences",
    "data": "/home/Library/Application Support",
    "runtime": "/tmp/501/.run",
    "state": "/home/Library/State",
  },
  "cache": "/home/Library/Caches/app/test",
  "cacheBase": "/home/Library/Caches/app",
  "config": "/home/Library/Preferences/app/test",
  "configBase": "/home/Library/Preferences/app",
  "data": "/home/Library/Application Support/app/test",
  "dataBase": "/home/Library/Application Support/app",
  "name": "app",
  "runtime": "/tmp/501/.run/app/test",
  "runtimeBase": "/tmp/501/.run/app",
  "state": "/home/Library/State/app/test",
  "stateBase": "/home/Library/State/app",
}
`

exports[`test/index.ts > TAP > darwin > with xdg envs > must match snapshot 1`] = `
Object {
  "base": Object {
    "cache": "/xdg-env/cache",
    "config": "/xdg-env/config",
    "data": "/xdg-env/data",
    "runtime": "/xdg-env/runtime",
    "state": "/xdg-env/state",
  },
  "cache": "/xdg-env/cache/app/test",
  "cacheBase": "/xdg-env/cache/app",
  "config": "/xdg-env/config/app/test",
  "configBase": "/xdg-env/config/app",
  "data": "/xdg-env/data/app/test",
  "dataBase": "/xdg-env/data/app",
  "name": "app",
  "runtime": "/xdg-env/runtime/app/test",
  "runtimeBase": "/xdg-env/runtime/app",
  "state": "/xdg-env/state/app/test",
  "stateBase": "/xdg-env/state/app",
}
`

exports[`test/index.ts > TAP > others > defaults > linux > must match snapshot 1`] = `
Object {
  "base": Object {
    "cache": "/home/.cache",
    "config": "/home/.config",
    "data": "/home/.local/share",
    "runtime": "/tmp/501/.run",
    "state": "/home/.local/state",
  },
  "cache": "/home/.cache/app/test",
  "cacheBase": "/home/.cache/app",
  "config": "/home/.config/app/test",
  "configBase": "/home/.config/app",
  "data": "/home/.local/share/app/test",
  "dataBase": "/home/.local/share/app",
  "name": "app",
  "runtime": "/tmp/501/.run/app/test",
  "runtimeBase": "/tmp/501/.run/app",
  "state": "/home/.local/state/app/test",
  "stateBase": "/home/.local/state/app",
}
`

exports[`test/index.ts > TAP > others > with xdg envs > linux > must match snapshot 1`] = `
Object {
  "base": Object {
    "cache": "/xdg-env/cache",
    "config": "/xdg-env/config",
    "data": "/xdg-env/data",
    "runtime": "/xdg-env/runtime",
    "state": "/xdg-env/state",
  },
  "cache": "/xdg-env/cache/app/test",
  "cacheBase": "/xdg-env/cache/app",
  "config": "/xdg-env/config/app/test",
  "configBase": "/xdg-env/config/app",
  "data": "/xdg-env/data/app/test",
  "dataBase": "/xdg-env/data/app",
  "name": "app",
  "runtime": "/xdg-env/runtime/app/test",
  "runtimeBase": "/xdg-env/runtime/app",
  "state": "/xdg-env/state/app/test",
  "stateBase": "/xdg-env/state/app",
}
`

exports[`test/index.ts > TAP > win32 > with APPDATA/LOCALAPPDATA envs set > must match snapshot 1`] = `
Object {
  "base": Object {
    "cache": "/localappdata/xdg.cache",
    "config": "/appdata/xdg.config",
    "data": "/appdata/xdg.data",
    "runtime": "/tmp/xdg.run",
    "state": "/localappdata/xdg.state",
  },
  "cache": "/localappdata/xdg.cache/app/test",
  "cacheBase": "/localappdata/xdg.cache/app",
  "config": "/appdata/xdg.config/app/test",
  "configBase": "/appdata/xdg.config/app",
  "data": "/appdata/xdg.data/app/test",
  "dataBase": "/appdata/xdg.data/app",
  "name": "app",
  "runtime": "/tmp/xdg.run/app/test",
  "runtimeBase": "/tmp/xdg.run/app",
  "state": "/localappdata/xdg.state/app/test",
  "stateBase": "/localappdata/xdg.state/app",
}
`

exports[`test/index.ts > TAP > win32 > with no envs set > must match snapshot 1`] = `
Object {
  "base": Object {
    "cache": "/home/AppData/Local/xdg.cache",
    "config": "/home/AppData/Roaming/xdg.config",
    "data": "/home/AppData/Roaming/xdg.data",
    "runtime": "/tmp/xdg.run",
    "state": "/home/AppData/Local/xdg.state",
  },
  "cache": "/home/AppData/Local/xdg.cache/app/test",
  "cacheBase": "/home/AppData/Local/xdg.cache/app",
  "config": "/home/AppData/Roaming/xdg.config/app/test",
  "configBase": "/home/AppData/Roaming/xdg.config/app",
  "data": "/home/AppData/Roaming/xdg.data/app/test",
  "dataBase": "/home/AppData/Roaming/xdg.data/app",
  "name": "app",
  "runtime": "/tmp/xdg.run/app/test",
  "runtimeBase": "/tmp/xdg.run/app",
  "state": "/home/AppData/Local/xdg.state/app/test",
  "stateBase": "/home/AppData/Local/xdg.state/app",
}
`

exports[`test/index.ts > TAP > win32 > with XDG envs set > must match snapshot 1`] = `
Object {
  "base": Object {
    "cache": "/xdg-env/cache",
    "config": "/xdg-env/config",
    "data": "/xdg-env/data",
    "runtime": "/xdg-env/runtime",
    "state": "/xdg-env/state",
  },
  "cache": "/xdg-env/cache/app/test",
  "cacheBase": "/xdg-env/cache/app",
  "config": "/xdg-env/config/app/test",
  "configBase": "/xdg-env/config/app",
  "data": "/xdg-env/data/app/test",
  "dataBase": "/xdg-env/data/app",
  "name": "app",
  "runtime": "/xdg-env/runtime/app/test",
  "runtimeBase": "/xdg-env/runtime/app",
  "state": "/xdg-env/state/app/test",
  "stateBase": "/xdg-env/state/app",
}
`
