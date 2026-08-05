# dotori-config

Personal macOS configuration powered by [`@mokyabun/dotori`](https://www.npmjs.com/package/@mokyabun/dotori).

## Setup

Requirements:

- macOS
- Bun 1.3 or later
- Homebrew

```bash
bun install
bun run doctor
```

## Usage

```bash
bun run plan
bun run apply
bun run clean
```

Run a single group:

```bash
bun run plan developer/vscode
bun run apply settings
```

The entrypoint in `main.ts` imports `config/index.ts`, creates a dotori instance, and delegates command handling to
the library's `runCli()` adapter. Relative provider paths are resolved from the `config/` directory.

## Development

```bash
bun run check
bun run format
```
