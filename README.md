[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

# SiriusPad

SiriusPad is a dense, dark desktop scratchpad for developers. It is designed for technical notes, bug logs, architecture ideas, shell snippets, and quick commands without the overhead of a full IDE.

![SiriusPad screenshot](./docs/screenshot.svg)

## Features

- Fast markdown note editor built on CodeMirror 6 with custom SiriusPad theming
- Workspace-based organization with pinned notes, tags, and fuzzy search
- Autosave to disk with YAML frontmatter metadata
- Inline snippet runner for `python`, `javascript`, `bash`, `sh`, `ruby`, and `go`
- Command palette powered by `cmdk`
- Global variables injected into runner environments and clipboard exports
- GitHub Gist export for the active note
- Native Tauri shell for Linux and Windows

## Install

- Linux `.deb`: [Latest release](https://github.com/siriusdev/siriuspad/releases/latest)
- Linux `.AppImage`: [Latest release](https://github.com/siriusdev/siriuspad/releases/latest)
- Windows `.msi`: [Latest release](https://github.com/siriusdev/siriuspad/releases/latest)
- Windows `.exe`: [Latest release](https://github.com/siriusdev/siriuspad/releases/latest)

## Build From Source

```bash
git clone https://github.com/siriusdev/siriuspad
cd siriuspad
npm install
npm run tauri:dev
```

## Tech Stack

- Tauri v2 + Rust
- React 18 + TypeScript + Vite
- CodeMirror 6
- Zustand
- TailwindCSS v3
- Lucide React
- cmdk
- date-fns

## Contributing

Issues and pull requests are welcome. If you want to contribute, please open an issue with the bug, feature idea, or workflow improvement you have in mind before starting a larger change.
