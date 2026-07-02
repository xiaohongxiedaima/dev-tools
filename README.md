# Dev Tools

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

## Constraints

- Do not change the JSON formatter tool logic unless the user has explicitly confirmed the change first.

## Good next extensions

- service status monitoring
- saved API/debug commands
- log viewer and grep shortcuts
- local environment and database helpers

## Release packaging

Push a version tag like `v0.1.0` to trigger GitHub Actions packaging for macOS, Linux, and Windows.

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow will build the Tauri bundles and upload the generated assets to GitHub Releases for that tag.

For macOS builds, the workflow now supports a **free Apple account signing path**:

Required macOS signing secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `KEYCHAIN_PASSWORD`

Optional notarization secrets for a paid Apple Developer account:

- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

Behavior:

- With only the required signing secrets, the macOS app is **signed but not notarized**.
- With the optional notarization secrets added, the macOS app is **signed and notarized**.

Note that free-account signing improves things, but downloaded `.app` or `.dmg` files can still be blocked by Gatekeeper on another Mac because notarization is not included.
