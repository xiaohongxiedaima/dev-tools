# Dev Tools Desktop

Desktop shell for daily backend development workflows, built with:

- Tauri 2
- Vue 3 + TypeScript
- Vite
- SQLite via `@tauri-apps/plugin-sql`

## Getting started

```bash
npm install
npm run tauri dev
```

## What is initialized

- Tauri desktop application scaffolded in the current repository
- Vue frontend replaced with a backend-tooling dashboard shell
- SQLite plugin wired in both Rust and TypeScript
- Seeded `command_presets` table to verify local persistence on first launch

## Good next extensions

- service status monitoring
- saved API/debug commands
- log viewer and grep shortcuts
- local environment and database helpers
