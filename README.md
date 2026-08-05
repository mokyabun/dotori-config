# dotori

A personal Bun-powered declarative setup tool for macOS.

## Installation

Requirements:

- macOS
- Bun
- Homebrew

Install dependencies:

```bash
bun install
```

Check the local environment:

```bash
bun run dotori doctor
```

## Usage

The default config entrypoint is `config/index.ts`.

```ts
import { defineConfig, type Context } from 'dotori'

export default defineConfig((ctx: Context) => {
    ctx.brew.install('ripgrep')
    ctx.brew.cask('kitty')

    ctx.file.symlink('~/.config/kitty', './dotfiles/kitty')

    ctx.macos.plist('dock', 'com.apple.dock', {
        mode: 'patch',
        values: {
            autohide: true,
            'show-recents': false,
        },
        afterChange: [['killall', 'Dock']],
    })
})
```

Run commands:

```bash
bun run dotori plan
bun run dotori apply
bun run dotori clean
```

Run a single group:

```bash
bun run dotori plan developer/vscode
bun run dotori apply settings
```

Use a custom config path:

```bash
bun run dotori plan --config ./my-config.ts
```

## Customization

Split config into small modules and group related steps with `ctx.group()`.

```ts
export default defineConfig((ctx: Context) => {
    ctx.group('developer', (g) => {
        g.brew.install('node')
        g.vscode.extensions('default', ['biomejs.biome'])
    })

    ctx.group('settings', (g) => {
        g.macos.plist('finder', 'com.apple.finder', {
            mode: 'patch',
            values: {
                ShowPathbar: true,
                AppleShowAllFiles: true,
            },
            afterChange: [['killall', 'Finder']],
        })
    })
})
```

Available providers:

- `ctx.brew`: Homebrew formulae, casks, and taps
- `ctx.file`: symlinks, managed text blocks, JSON files, and downloads
- `ctx.macos`: defaults and plist files
- `ctx.vscode`: profiles, settings, extensions, keybindings, tasks, MCP, and snippets
- `ctx.launchd`: user LaunchAgents

Hooks can run after a step or group:

- `afterChange`: runs only when something changed
- `afterApply`: runs after apply, even when nothing changed

## Notes

- `clean` command removes items that dotori previously applied but are no longer declared.
- `patch` command keeps existing data and updates declared keys.
- `replace` command rewrites the target with the declared value.
- `adopt` command can be adopt pre-installed resources into dotori state.
- Applied state is stored in `~/.local/share/dotori/state.sqlite`.
- Relative paths in config are resolved from the config file directory.

## Development

```bash
bun run format
bun run lint
bun run lint:fix
```
