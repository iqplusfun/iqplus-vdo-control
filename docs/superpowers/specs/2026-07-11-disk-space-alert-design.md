# Disk Space Alert — Design

**Date:** 2026-07-11
**Status:** Approved, ready for implementation plan

## Problem

The app runs on the OBS Recording Server (Windows 11) as an internal-network
static SPA. A previous version of the tool warned operators when a recording
drive was running low on free space: the page background blinked **yellow**
(warning) or **red** (alert). That feature was lost in a rewrite and is not
present in this repo's git history. We are rebuilding it.

## Constraints

- **Static SPA, no backend.** SSR is disabled; there is no Nitro server at
  runtime. Browser JavaScript cannot read the Windows filesystem directly.
- Two OBS instances run on the same machine (`192.168.1.10:4444` /
  `:4445`), already connected via `obs-websocket-js` v5.

## Data source (decided)

Use **`obs.call("GetStats")`** on each already-open WebSocket connection.
`GetStats.availableDiskSpace` reports the free space of the drive that *that*
OBS instance records to. `availableDiskSpace` is expressed in **megabytes**
(GB = value / 1024) — this unit must be verified against a raw logged value
during implementation before shipping.

Each OBS instance reports only its own recording drive, so this covers both
drives **only because** the two rooms record to different drives:

- one room records to **C:**, the other to **D:**

Two `GetStats` calls (one per controller) therefore cover both C and D. No
extra service, script, or infrastructure is required.

## Thresholds (decided, per drive)

- **Warning:** free space `< 20 GB`
- **Alert:** free space `< 10 GB`
- Otherwise: **OK**

Applied independently to each drive. The page reflects the **worst** level
across both rooms.

## UI (decided)

- **Whole-page background blink** — yellow when the worst level is warning,
  red when it is alert (matches the original feature).
- **Per-room chip** showing free space in GB, coloured by that room's level,
  so an operator can see which drive needs clearing.

## Architecture

Chosen approach: a **Nuxt composable backed by `useState`** as the interface
between the per-room disk producers (`ObsController`) and the whole-page blink
consumer (`app.vue`). This avoids prop-drilling and event chains through
`<NuxtPage>` (`app.vue` is the parent of the page, so child-page events do not
naturally bubble to it).

### Unit 1 — `composables/useDiskAlert.ts`

The shared interface. Holds per-room disk status in a `useState` reactive map.

- `setRoomDisk(roomId: string, status: { freeGb: number; level: DiskLevel })`
  — a controller reports its drive's status.
- `clearRoom(roomId: string)` — remove a room's entry (on disconnect/unmount)
  so a stale reading cannot linger.
- `worstLevel: ComputedRef<DiskLevel>` — the most severe level across all
  reported rooms, using precedence `alert` > `warning` > `ok`. Rooms with no
  entry (disconnected / unreadable) do not contribute.

`DiskLevel = "ok" | "warning" | "alert"`.

**Interface contract:** producers only ever call `setRoomDisk` / `clearRoom`;
the consumer only ever reads `worstLevel`. Neither side reads the other's
internals.

### Unit 2 — `components/ObsController.vue` (per room)

Adds disk polling to the existing OBS lifecycle.

- New interval `diskCheckInterval`, polling every **30 s** (disk changes
  slowly). Started in `mounted` after connect; cleared in `beforeUnmount`.
- Each tick: `obs.call("GetStats")` → read `availableDiskSpace` →
  `freeGb = availableDiskSpace / 1024`.
- Compute level: `freeGb < 10 → "alert"`, `freeGb < 20 → "warning"`, else
  `"ok"`.
- Store `freeDiskGb` and `diskLevel` in component data; render a **chip** in
  the card (label e.g. `ดิสก์: 45 GB`, or with drive letter if configured),
  coloured `default`/`warning`/`error` by level.
- Report up via `setRoomDisk(roomId, { freeGb, level })`.
- On OBS disconnect / `GetStats` error: log in dev (matching the existing
  error-handling pattern), do **not** report a status, and do not blink for
  this room. On `beforeUnmount` / disconnect: call `clearRoom(roomId)`.

### Unit 3 — `app.vue` (whole-page blink)

- Reads `worstLevel` from the composable.
- Renders a full-screen overlay `<div>` (fixed, `pointer-events: none`,
  behind page content) whose class is bound to `worstLevel`.
- CSS keyframes: `warning` → yellow background pulse; `alert` → red background
  pulse; `ok` → no overlay / transparent.

### Unit 4 (optional) — `constant/rooms.ts` + `types/room.ts`

Add an optional `recordDriveLabel?: "C:" | "D:"` field to the `Room` type and
room entries, used only to label the per-room chip (e.g. `D: 45 GB`) so the
operator knows which physical drive is low. Purely cosmetic; `GetStats` does
not return the drive letter.

## Error handling

- `GetStats` failure or disconnected OBS: swallow the error (dev-only
  `console` log, consistent with `getCameraStatus` / `getRecordStatus`), skip
  reporting for that tick. The blink reflects only rooms we can actually read.
- On reconnect, the 30 s interval resumes reporting normally.

## Testing / verification

There is no test runner in this project. Verification is manual/observational:

1. Log the raw `availableDiskSpace` value once and confirm the MB→GB
   conversion produces a sane figure against the real drive.
2. Temporarily lower the thresholds (or mock a low `freeGb`) to confirm the
   per-room chip colour changes and the whole-page overlay blinks yellow then
   red as the worst level crosses 20 GB and 10 GB.
3. Disconnect one OBS instance and confirm that room stops contributing to
   `worstLevel` (no false blink) and its chip reflects the disconnected state.

## Out of scope (YAGNI)

- Monitoring drives that no OBS instance records to.
- Per-room configurable thresholds (single global pair for now).
- Persisting / historising disk readings.
- Any separate helper service or OBS script.
