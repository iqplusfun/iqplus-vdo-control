# Disk Space Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn operators when a recording drive runs low on free space by blinking the whole page yellow (< 20 GB) or red (< 10 GB) and showing each room's free space as a chip.

**Architecture:** Each `ObsController` polls its OBS instance's `GetStats.availableDiskSpace` every 30 s and reports a per-room disk level into a shared Nuxt composable (`useDiskAlert`). `app.vue` reads the composable's `worstLevel` and drives a full-screen blinking overlay. Because the two rooms record to different drives (one C:, one D:), the two controllers together cover both drives.

**Tech Stack:** Nuxt 3 (SSR disabled / static SPA), Vue 3 Options API, Vuetify, `obs-websocket-js` v5, TypeScript.

## Global Constraints

- Code style (`.prettierrc.json`): 4-space indent, double quotes, **no semicolons**, ES5 trailing commas.
- No test or lint runner exists — verification is manual/observational (run `npm run dev`, observe browser).
- Static SPA: no backend/Nitro at runtime; all disk data comes from OBS WebSocket, never the filesystem.
- `availableDiskSpace` is in **megabytes**; GB = value / 1024. This unit MUST be confirmed against a real logged value before shipping (Task 2).
- Thresholds (per drive): warning `< 20` GB, alert `< 10` GB. Precedence for worst level: `alert` > `warning` > `ok`.
- Dev-only logging guarded by `runtimeConfig.public.appEnv === "development"`, matching existing code.

---

### Task 1: Shared disk-alert composable

**Files:**
- Create: `composables/useDiskAlert.ts`

**Interfaces:**
- Consumes: nothing (Nuxt auto-imports `useState`, `computed`).
- Produces:
  - `type DiskLevel = "ok" | "warning" | "alert"`
  - `useDiskAlert()` returning:
    - `setRoomDisk(roomId: string, status: { freeGb: number; level: DiskLevel }): void`
    - `clearRoom(roomId: string): void`
    - `worstLevel: ComputedRef<DiskLevel>`

- [ ] **Step 1: Create the composable**

Create `composables/useDiskAlert.ts`:

```ts
export type DiskLevel = "ok" | "warning" | "alert"

interface RoomDiskStatus {
    freeGb: number
    level: DiskLevel
}

const LEVEL_RANK: Record<DiskLevel, number> = {
    ok: 0,
    warning: 1,
    alert: 2,
}

export function useDiskAlert() {
    const roomStatus = useState<Record<string, RoomDiskStatus>>(
        "diskAlertRoomStatus",
        () => ({})
    )

    function setRoomDisk(roomId: string, status: RoomDiskStatus) {
        roomStatus.value = { ...roomStatus.value, [roomId]: status }
    }

    function clearRoom(roomId: string) {
        const next = { ...roomStatus.value }
        delete next[roomId]
        roomStatus.value = next
    }

    const worstLevel = computed<DiskLevel>(() => {
        let worst: DiskLevel = "ok"
        for (const status of Object.values(roomStatus.value)) {
            if (LEVEL_RANK[status.level] > LEVEL_RANK[worst]) {
                worst = status.level
            }
        }
        return worst
    })

    return { setRoomDisk, clearRoom, worstLevel }
}
```

- [ ] **Step 2: Verify it compiles and auto-imports**

Run: `npm run dev`
Expected: dev server starts with no TypeScript / Nuxt error referencing `useDiskAlert` or `composables/useDiskAlert.ts`. (Nuxt auto-imports files under `composables/`; nothing consumes it yet, so the app renders unchanged.)

- [ ] **Step 3: Commit**

```bash
git add composables/useDiskAlert.ts
git commit -m "add useDiskAlert composable for disk-space alert state"
```

---

### Task 2: Poll disk stats in ObsController and report per-room level

**Files:**
- Modify: `components/ObsController.vue` (data, methods, `mounted`, `beforeUnmount`)

**Interfaces:**
- Consumes: `useDiskAlert()` from Task 1 (`setRoomDisk`, `clearRoom`), `DiskLevel`.
- Produces (component data other tasks read in Task 3):
  - `freeDiskGb: number` (`-1` when unknown)
  - `diskLevel: DiskLevel`
  - method `checkDiskSpace(): Promise<void>`

- [ ] **Step 1: Import DiskLevel type and grab the composable helpers**

In the `<script setup lang="ts">` block near the top of `components/ObsController.vue` (currently lines 196-201), add the type import and obtain the composable. Because the component logic lives in the separate Options-API `<script>` block, expose the helpers via module-scope like the existing `runtimeConfig`.

Change the `<script lang="ts">` opening (currently `const runtimeConfig = useRuntimeConfig()` at line 204) to also pull the composable:

```ts
import type { DiskLevel } from "~/composables/useDiskAlert"

const runtimeConfig = useRuntimeConfig()
const { setRoomDisk, clearRoom } = useDiskAlert()
```

(Place the `import type` at the top of the `<script lang="ts">` block, above `const runtimeConfig`.)

- [ ] **Step 2: Add disk state to `data()`**

In `data()` (currently returning the object at lines 217-243), add three fields alongside the existing ones:

```ts
            freeDiskGb: -1,
            diskLevel: "ok" as DiskLevel,
            diskCheckInterval: 0,
```

- [ ] **Step 3: Add the `checkDiskSpace` method**

Add this method inside `methods` (e.g. right after `getRecordStatus`, around line 485):

```ts
        async checkDiskSpace() {
            if (!this.isObsConnected) return
            try {
                const stats = await this.obs.call("GetStats")
                // availableDiskSpace is reported in megabytes
                const freeGb = stats.availableDiskSpace / 1024
                let level: DiskLevel = "ok"
                if (freeGb < 10) {
                    level = "alert"
                } else if (freeGb < 20) {
                    level = "warning"
                }
                this.freeDiskGb = freeGb
                this.diskLevel = level
                setRoomDisk(this.roomId ?? "", { freeGb, level })
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("checkDiskSpace", {
                        availableDiskSpace: stats.availableDiskSpace,
                        freeGb,
                        level,
                    })
                }
            } catch (err: unknown) {
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("checkDiskSpace error:", err)
                }
            }
        },
```

- [ ] **Step 4: Start the interval in `mounted` and run one immediate check**

In `mounted` (currently lines 685-710), after the existing `hungCheckInterval` block (around line 702), add:

```ts
            await this.checkDiskSpace()
            if (!this.diskCheckInterval) {
                this.diskCheckInterval = window.setInterval(() => {
                    this.checkDiskSpace()
                }, 30000)
            }
```

- [ ] **Step 5: Clear the interval and room status in `beforeUnmount`**

In `beforeUnmount` (currently lines 712-726), after `clearInterval(this.hungCheckInterval)` (line 714), add:

```ts
        clearInterval(this.diskCheckInterval)
        clearRoom(this.roomId ?? "")
```

- [ ] **Step 6: Verify the raw unit and level logic in the browser**

Run: `npm run dev`, open `http://localhost:3000` with an OBS instance reachable, open the browser console (ensure `APP_ENV=development` so logs show).
Expected: a `checkDiskSpace` log appears within a few seconds showing `availableDiskSpace` (raw), `freeGb`, and `level`. Confirm `freeGb` matches the drive's real free space in Windows Explorer (this validates the MB→GB assumption). If the raw number is already in GB (e.g. matches free GB without dividing), STOP and adjust the divisor before continuing — record the finding in the commit message.

- [ ] **Step 7: Commit**

```bash
git add components/ObsController.vue
git commit -m "poll OBS disk stats per room and report level to useDiskAlert"
```

---

### Task 3: Show per-room free-space chip in the controller card

**Files:**
- Modify: `components/ObsController.vue` (template + a small computed)

**Interfaces:**
- Consumes: `freeDiskGb`, `diskLevel` from Task 2.
- Produces: visible chip; computed `diskChipColor` and `diskChipText`.

- [ ] **Step 1: Add computed properties for the chip**

In `computed` (currently lines 244-248, holding `durationString`), add:

```ts
        diskChipColor(): string {
            if (this.diskLevel === "alert") return "error"
            if (this.diskLevel === "warning") return "warning"
            return "default"
        },
        diskChipText(): string {
            if (this.freeDiskGb < 0) return "ดิสก์: -"
            const label = this.recordDriveLabel ? this.recordDriveLabel + " " : ""
            return "ดิสก์: " + label + Math.floor(this.freeDiskGb) + " GB"
        },
```

(Note: `recordDriveLabel` comes from Task 4. If Task 4 is not yet done, the `this.recordDriveLabel` reference is still safe because it will be `undefined` and the ternary yields `""`. To avoid a TypeScript prop error before Task 4, add the prop in Task 4 before this task is exercised, or implement Task 4 first.)

- [ ] **Step 2: Render the chip in the connected UI**

In the connected `v-card-text` block, add a chip row. Insert it right after the action-buttons `v-row` closes and before the `<v-divider class="my-4" />` (around line 69-70):

```html
            <div class="d-flex justify-center mt-3">
                <v-chip
                    :color="diskChipColor"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-harddisk"
                >{{ diskChipText }}</v-chip>
            </div>
```

- [ ] **Step 3: Verify the chip renders and colours correctly**

Run: `npm run dev`, connect to OBS.
Expected: a "ดิสก์: N GB" chip shows the free space. To confirm colour logic without filling the disk, temporarily edit `checkDiskSpace` thresholds (e.g. treat `< 999` as warning) and confirm the chip turns amber, then `< 999` as alert → red. Revert the temporary edit before committing.

- [ ] **Step 4: Commit**

```bash
git add components/ObsController.vue
git commit -m "show per-room free disk space chip in controller card"
```

---

### Task 4: Optional drive label on rooms

**Files:**
- Modify: `types/room.ts`
- Modify: `constant/rooms.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: optional prop `recordDriveLabel?: string` on `Room` and on the component; used by Task 3's `diskChipText`.

- [ ] **Step 1: Add the field to the Room type**

In `types/room.ts`, add to the `Room` interface (keep existing fields):

```ts
    recordDriveLabel?: string
```

- [ ] **Step 2: Set the drive label on each room**

In `constant/rooms.ts`, add `recordDriveLabel` to each room to match its actual OBS recording drive (confirm which room records to which drive before setting):

```ts
        // in the green room object:
        recordDriveLabel: "C:",
```

```ts
        // in the chaiklang room object:
        recordDriveLabel: "D:",
```

- [ ] **Step 3: Declare the prop and pass it through**

In `components/ObsController.vue` `props` (lines 207-216), add:

```ts
        recordDriveLabel: String,
```

In `pages/index.vue`, add the prop to the `<ObsController>` binding (in the `v-for`, alongside the other `:roomName` etc. bindings):

```html
            :recordDriveLabel="room.recordDriveLabel"
```

- [ ] **Step 4: Verify the label appears**

Run: `npm run dev`, connect to OBS.
Expected: the chip now reads e.g. `ดิสก์: C: 45 GB` / `ดิสก์: D: 120 GB`. Confirm each label matches the drive that room actually records to.

- [ ] **Step 5: Commit**

```bash
git add types/room.ts constant/rooms.ts components/ObsController.vue pages/index.vue
git commit -m "add optional recordDriveLabel to rooms and disk chip"
```

---

### Task 5: Whole-page blinking overlay in app.vue

**Files:**
- Modify: `app.vue` (template, script, style)

**Interfaces:**
- Consumes: `useDiskAlert().worstLevel` from Task 1.
- Produces: full-screen overlay that blinks yellow (warning) / red (alert).

- [ ] **Step 1: Read `worstLevel` in the script**

In `app.vue` `<script setup lang="ts">` (currently just `const runtimeConfig = useRuntimeConfig()`), add:

```ts
const { worstLevel } = useDiskAlert()
```

- [ ] **Step 2: Add the overlay element bound to the level**

In `app.vue` template, add the overlay as the first child inside `<v-app>` (before `<NuxtLoadingIndicator>`), so it sits behind content:

```html
        <div
            class="disk-alert-overlay"
            :class="`disk-alert-overlay--${worstLevel}`"
            aria-hidden="true"
        />
```

- [ ] **Step 3: Add the blink styles**

Add a `<style>` block to `app.vue` (or extend an existing one):

```css
.disk-alert-overlay {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0;
    background: transparent;
}

.disk-alert-overlay--warning {
    background: #ffb300;
    animation: disk-alert-blink 1s ease-in-out infinite;
}

.disk-alert-overlay--alert {
    background: #d50000;
    animation: disk-alert-blink 0.6s ease-in-out infinite;
}

@keyframes disk-alert-blink {
    0%,
    100% {
        opacity: 0;
    }
    50% {
        opacity: 0.55;
    }
}
```

Note: the existing `.app-frame` / page content must sit above this overlay. If content is hidden behind it, add `position: relative; z-index: 1;` to `.app-frame` in the existing `assets` stylesheet or `app.vue`. Verify in Step 4 and adjust only if needed.

- [ ] **Step 4: Verify the blink triggers on worst level**

Run: `npm run dev`, connect to OBS. To simulate, temporarily force a low level in `ObsController.checkDiskSpace` (e.g. set `level = "warning"` unconditionally, then `"alert"`).
Expected: with `warning`, the whole page background pulses amber ~1 s cycle; with `alert`, it pulses red faster. Page content (cards, selects, buttons) stays visible and clickable above the overlay. With both rooms `ok`, no overlay shows. Revert the temporary edit before committing.

- [ ] **Step 5: Commit**

```bash
git add app.vue
git commit -m "blink whole-page overlay on low disk space worst level"
```

---

### Task 6: End-to-end verification and cleanup

**Files:** none (verification only), plus revert of any temporary edits.

- [ ] **Step 1: Confirm all temporary threshold/level edits are reverted**

Run: `git diff`
Expected: no leftover debug overrides in `checkDiskSpace` or elsewhere; only the intended feature code remains.

- [ ] **Step 2: Full-flow observation**

Run: `npm run dev` with both OBS instances reachable.
Expected, in order:
1. Both room chips show real free space with correct drive labels and `default` colour when both drives are healthy.
2. No page blink while both are `ok`.
3. When one drive crosses below 20 GB (or simulated), that room's chip turns amber AND the page blinks amber.
4. When any drive crosses below 10 GB (or simulated), the page blinks red (worst level wins even if the other room is only warning/ok).
5. Disconnecting one OBS instance removes its contribution: if the other room is `ok`, the page stops blinking; the disconnected card shows its normal disconnected state.

- [ ] **Step 3: Confirm the MB→GB unit finding from Task 2 is reflected**

Verify the divisor in `checkDiskSpace` matches what the raw-value check in Task 2 Step 6 concluded. If Task 2 found the value was already in GB, the divisor should have been removed there — confirm no `/ 1024` remains if so.

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "clean up disk-space alert debug overrides"
```

(If `git diff` in Step 1 was clean, skip this commit.)

---

## Self-Review Notes

- **Spec coverage:** data source via `GetStats` (Task 2) ✓; thresholds 20/10 (Task 2) ✓; per-room chip (Task 3) ✓; whole-page yellow/red blink (Task 5) ✓; composable interface `setRoomDisk`/`clearRoom`/`worstLevel` (Task 1) ✓; disconnect clears status (Task 2 Step 5, verified Task 6) ✓; optional `recordDriveLabel` (Task 4) ✓; MB→GB verification (Task 2 Step 6, Task 6 Step 3) ✓; dev-only logging ✓.
- **Type consistency:** `DiskLevel` defined in Task 1, imported in Tasks 2 & used in 3; `setRoomDisk(roomId, { freeGb, level })` signature identical across Task 1 producer and Task 2 caller; `worstLevel` computed consumed only in Task 5.
- **Ordering note:** Task 4 adds the `recordDriveLabel` prop that Task 3's `diskChipText` references. If executing strictly in order, do Task 4 Step 3 (declare prop) before exercising Task 3 in the browser, OR accept `undefined` (chip simply omits the drive letter). Either is safe; no runtime error.
