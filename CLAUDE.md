# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A Nuxt 3 SPA (SSR disabled) for remotely controlling OBS Studio recording sessions across two classroom rooms at IQPlus. Teachers select their class/subject from a UI, and the app connects to each room's OBS instance via WebSocket to start/stop recordings with the correct profile.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Build for production (output to .output/)
npm run preview    # Preview production build locally
```

There are no test or lint scripts configured.

## Code Style

Enforced by `.prettierrc.json`: 4-space indentation, double quotes, no semicolons, trailing comma (ES5). Run `prettier` manually if needed — no pre-commit hook.

## Architecture

### Data flow
1. `pages/index.vue` renders a teacher + class selector
2. Selecting a teacher filters available subjects (`constant/subjects.ts` → `constant/teachers.ts`)
3. Two `<ObsController>` instances are mounted — one per room (green / chaiklang)
4. Each controller independently connects to its OBS instance and manages recording

### Core component: `components/ObsController.vue`
The entire OBS logic lives here (~790 lines). Key responsibilities:
- **WebSocket lifecycle** — connects/disconnects on mount/unmount via `obs-websocket-js`
- **Recording control** — switches scene collection → sets profile → starts/stops recording
- **Stream health monitoring** — screenshots the camera input every 2 s, compares frames to detect freezes, auto-recovers by toggling source visibility (up to 3 retries before alerting)
- **Duration tracking** — updates an HH:MM:SS display every second while recording

OBS WebSocket URLs are **hardcoded** inside this component (not in env):
- Green room: `ws://192.168.1.10:4444`
- Chaiklang room: `ws://192.168.1.10:4445`

### Recording profile convention
Profiles follow the pattern `{subjectId}_{roomId}_profile` (e.g. `Math_p5_green_profile`). Scene collections are named `Green_room` and `Chaiklang_room`.

### Static data
- `constant/teachers.ts` — list of teachers with IDs
- `constant/subjects.ts` — subjects linked to teacher IDs, each with a `subjectId` used to build the OBS profile name
- `types/teacher.ts`, `types/subject.ts` — TypeScript interfaces for the above

### Runtime config (`nuxt.config.ts`)
`APP_ENV`, `API_BASE`, `OTHER_URL` can be set via environment variables (see `.env.example`). `appVersion` is resolved at **build time** via `resolveVersion()` in `nuxt.config.ts` — it prefers `APP_VERSION` env var, then falls back to `git describe --tags --abbrev=0`. The server plugin `server/plugins/version.ts` is intentionally empty (the runtime env override pattern does not work for static/SPA deployments).

### Deployment
The app is deployed as a **static site** (no persistent Nitro server). All `runtimeConfig.public` values are embedded in the JS bundle at `nuxt build` time. Set env vars in the CI/CD build environment, not at serve time.

## Git

Run `gitconfigsw iqplus` before committing to switch to the IQPlus git profile.
