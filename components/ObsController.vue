<template>
    <v-card elevation="2">
        <v-progress-linear v-if="isConnecting" indeterminate color="primary" />

        <v-card-title class="d-flex align-center justify-space-between py-3 px-4">
            <span class="text-h6 font-weight-bold">{{ roomName }}</span>
            <div class="d-flex align-center ga-2">
                <v-chip
                    v-if="isObsConnected"
                    :color="diskChipColor"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-harddisk"
                >{{ diskChipText }}</v-chip>
                <v-chip
                    size="small"
                    :color="isObsConnected ? 'success' : 'error'"
                    variant="tonal"
                >
                    {{ isObsConnected ? "เชื่อมต่อแล้ว" : "ไม่ได้เชื่อมต่อ" }}
                </v-chip>
            </div>
        </v-card-title>

        <v-divider />

        <!-- Disconnected empty state -->
        <v-card-text v-if="!isObsConnected && !isConnecting">
            <div class="d-flex flex-column align-center py-6">
                <v-icon icon="mdi-lan-disconnect" size="56" color="grey" />
                <p class="text-body-2 text-medium-emphasis mt-3 text-center">
                    {{ connectionError || "ไม่สามารถเชื่อมต่อ OBS" }}
                </p>
                <v-btn variant="outlined" class="mt-4" @click="connectOBS">
                    ลองใหม่
                </v-btn>
            </div>
        </v-card-text>

        <!-- Connected UI -->
        <v-card-text v-if="isObsConnected">
            <!-- Action buttons -->
            <v-row dense>
                <v-col cols="6">
                    <v-btn
                        block
                        size="large"
                        rounded="lg"
                        :color="isRecording ? 'success-lighten-3' : 'success'"
                        :disabled="isRecording || isStreamHung"
                        @click="startRecording"
                    >
                        <v-progress-circular
                            v-if="isStarting"
                            indeterminate
                            size="20"
                            width="2"
                            class="mr-2"
                        />
                        <v-icon v-else icon="mdi-record-circle-outline" start />
                        อัด{{ roomShortName }}
                    </v-btn>
                </v-col>
                <v-col cols="6">
                    <v-btn
                        block
                        size="large"
                        rounded="lg"
                        color="error"
                        :disabled="!isRecording || isStopping"
                        @click="askConfirmStopRecord"
                    >
                        <v-icon icon="mdi-stop" start />
                        หยุดอัด{{ roomShortName }}
                    </v-btn>
                </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Status row -->
            <v-row>
                <!-- Camera status -->
                <v-col cols="6" class="d-flex flex-column align-center">
                    <div class="text-caption text-medium-emphasis mb-2">
                        สถานะกล้อง{{ roomShortName }}
                    </div>
                    <v-chip
                        v-if="isStreamHung"
                        color="warning"
                        prepend-icon="mdi-video-off-outline"
                        variant="tonal"
                    >กล้องค้าง</v-chip>
                    <v-btn
                        v-if="isStreamHung"
                        size="small"
                        color="warning"
                        variant="outlined"
                        :loading="isResettingStream"
                        class="mt-2"
                        prepend-icon="mdi-camera-retake"
                        @click="manualResetCamera"
                    >รีเซ็ตกล้อง</v-btn>
                    <v-chip
                        v-else-if="isCameraStatusOk"
                        color="success"
                        prepend-icon="mdi-video-check"
                        variant="tonal"
                    >ปกติ</v-chip>
                    <v-chip
                        v-else
                        color="error"
                        prepend-icon="mdi-video-off-outline"
                        variant="tonal"
                    >ยังไม่เปิดกล้อง</v-chip>
                </v-col>

                <!-- Recording status -->
                <v-col cols="6" class="d-flex flex-column align-center">
                    <div v-if="isStopping" class="text-center">
                        <v-chip
                            color="warning"
                            prepend-icon="mdi-stop"
                            variant="tonal"
                            class="animate-pulse mb-2"
                        >{{ roomShortName }}กำลังหยุด</v-chip>
                        <div class="text-caption text-medium-emphasis mt-1">
                            {{ currentProfileReadable() }}
                        </div>
                    </div>
                    <div v-else-if="isRecording" class="text-center">
                        <v-chip
                            color="error"
                            prepend-icon="mdi-record-circle"
                            variant="tonal"
                            class="animate-pulse mb-2"
                        >{{ roomShortName }}กำลังอัด</v-chip>
                        <div class="text-h5 font-weight-bold font-mono mt-1">
                            {{ durationString }}
                        </div>
                        <div class="text-h6 font-weight-bold mt-1">
                            {{ currentProfileReadable() }}
                        </div>
                    </div>
                    <div v-else class="text-center">
                        <v-chip
                            color="default"
                            prepend-icon="mdi-video-wireless"
                            variant="tonal"
                        >พร้อมอัด</v-chip>
                    </div>
                </v-col>
            </v-row>
        </v-card-text>

        <!-- Stop confirmation dialog -->
        <v-dialog v-model="dialog" persistent max-width="400px">
            <v-card>
                <v-card-title>หยุดอัด {{ roomName }}?</v-card-title>
                <v-card-text>
                    <div class="text-body-1">{{ currentProfileReadable() }}</div>
                    <div class="text-h6 font-mono mt-1">{{ durationString }}</div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        color="success"
                        variant="outlined"
                        @click="dialog = false"
                    >ยกเลิก</v-btn>
                    <v-btn
                        color="error"
                        prepend-icon="mdi-stop"
                        @click="confirmStopRecord"
                    >ยืนยัน</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Alert snackbar -->
        <v-snackbar
            v-model="alertShow"
            :color="alertLevel"
            location="bottom"
            :timeout="alertTimeoutMs"
        >
            {{ alertText }}
            <template #actions>
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    @click="alertShow = false"
                />
            </template>
        </v-snackbar>
    </v-card>
</template>

<style>
.font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>

<script setup lang="ts">
import OBSWebSocket, { EventSubscription } from "obs-websocket-js"
import type { OBSEventTypes } from "obs-websocket-js"

const emit = defineEmits(["StartRecordSuccess"])
</script>

<script lang="ts">
import type { DiskLevel } from "~/composables/useDiskAlert"

const runtimeConfig = useRuntimeConfig()
const { setRoomDisk, clearRoom } = useDiskAlert()

export default {
    props: {
        roomName: String,
        roomShortName: String,
        roomId: String,
        preferredSceneCollection: String,
        preferredCameraInputName: String,
        preferredInputNameList: Array as () => string[],
        obsWebsocketUrl: String,
        selectedSubject: String,
        recordDriveLabel: String,
    },
    data() {
        return {
            obs: new OBSWebSocket(),
            isObsConnected: false,
            isConnecting: false,
            connectionError: "",
            isCameraStatusOk: false,
            isRecording: false,
            isStarting: false,
            isStopping: false,
            durationMs: 0,
            recordingStatusInterval: 0,
            currentSceneCollection: "",
            currentProfile: "",
            alertShow: false,
            alertText: "",
            alertLevel: "",
            alertTimeoutMs: 3000,
            dialog: false,
            isStreamHung: false,
            lastScreenshot: "",
            hungCheckInterval: 0,
            hungCounter: 0,
            streamRetryCount: 0,
            isResettingStream: false,
            freeDiskGb: -1,
            diskLevel: "ok" as DiskLevel,
            diskCheckInterval: 0,
        }
    },
    computed: {
        durationString() {
            return new Date(this.durationMs).toISOString().slice(12, 19)
        },
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
    },
    methods: {
        async connectOBS() {
            this.isConnecting = true
            this.connectionError = ""
            try {
                const { obsWebSocketVersion, negotiatedRpcVersion } =
                    await this.obs.connect(this.obsWebsocketUrl, undefined, {
                        eventSubscriptions:
                            EventSubscription.All |
                            EventSubscription.InputActiveStateChanged |
                            EventSubscription.InputShowStateChanged,
                    })
                if (runtimeConfig.public.appEnv === "development") {
                    console.log(
                        `Connected to OBS ${obsWebSocketVersion} (using RPC version ${negotiatedRpcVersion})`
                    )
                }

                this.isObsConnected = true

                this.obs.on("CurrentProfileChanged", this.onCurrentProfileChanged)
                this.obs.on("RecordStateChanged", this.onRecordStateChanged)
                this.obs.on("VirtualcamStateChanged", this.onVirtualcamStateChanged)
                this.obs.on("CurrentSceneCollectionChanged", this.onCurrentSceneCollectionChanged)
                this.obs.on("InputActiveStateChanged", this.onInputActiveStateChanged)
                this.obs.on("InputShowStateChanged", this.onInputShowStateChanged)
                this.obs.on("InputVolumeMeters", this.onInputVolumeMeters)
            } catch (error) {
                this.isObsConnected = false
                const msg = error instanceof Error ? error.message : String(error)
                this.connectionError = msg
                this.alertError("เชื่อมต่อ OBS ไม่ได้: " + msg)
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("Failed to connect to OBS:", error)
                }
            } finally {
                this.isConnecting = false
            }
        },

        selectedProfileName() {
            if (
                this.selectedSubject === "" ||
                this.selectedSubject === "not_select"
            ) {
                throw new Error("please select class")
            }
            return this.selectedSubject + "_" + this.roomId + "_profile"
        },

        currentProfileReadable(): string {
            if (this.currentProfile.length) {
                const p = this.currentProfile.split("_")
                return p[0] + " " + p[1]
            }
            return ""
        },

        async getCameraStatus(): Promise<boolean> {
            try {
                const preferredInputName = this.preferredCameraInputName ?? ""
                const scene = await this.obs.call("GetSceneCollectionList")
                const input = await this.obs.call("GetInputList")
                const sourceActive = await this.obs.call("GetSourceActive", {
                    sourceName: preferredInputName,
                })

                if (runtimeConfig.public.appEnv === "development") {
                    console.log("getCameraStatus", { scene, input, sourceActive })
                }

                const mainInputIndex = input.inputs.findIndex(
                    (p: { inputName: string }) => p.inputName === preferredInputName
                )

                const ok =
                    scene.currentSceneCollectionName === this.preferredSceneCollection &&
                    sourceActive.videoActive &&
                    mainInputIndex >= 0

                this.isCameraStatusOk = ok
                return ok
            } catch (err: unknown) {
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("getCameraStatus error:", err)
                } else if (!(err instanceof Error)) {
                    console.error("getCameraStatus unknown error:", err)
                }
                this.isCameraStatusOk = false
                return false
            }
        },

        async checkStreamHealth() {
            if (
                !this.isObsConnected ||
                !this.preferredCameraInputName ||
                this.isResettingStream
            ) {
                return
            }
            try {
                const screenshot = await this.obs.call("GetSourceScreenshot", {
                    sourceName: this.preferredCameraInputName,
                    imageFormat: "jpeg",
                    imageWidth: 64,
                    imageHeight: 36,
                    imageCompressionQuality: 20,
                })

                if (
                    this.lastScreenshot &&
                    this.lastScreenshot === screenshot.imageData
                ) {
                    this.hungCounter++
                } else {
                    this.hungCounter = 0
                    this.streamRetryCount = 0
                }

                this.lastScreenshot = screenshot.imageData

                if (this.hungCounter > 5) {
                    // 5 checks × 2 s interval = 10 s of frozen frames before recovery
                    if (this.streamRetryCount < 3) {
                        this.alertInfo(
                            `Webcam stream frozen. Attempting to reset... (${
                                this.streamRetryCount + 1
                            }/3)`
                        )
                        await this.resetWebcamStream()
                    } else if (!this.isStreamHung) {
                        this.isStreamHung = true
                        this.alertError(
                            "Webcam stream is frozen. Automatic recovery failed after 3 attempts."
                        )
                    }
                } else {
                    this.isStreamHung = false
                }
            } catch (error) {
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("Failed to check stream health:", error)
                }
            }
        },

        async resetWebcamStream() {
            if (!this.preferredCameraInputName) return
            this.isResettingStream = true
            this.streamRetryCount++
            this.hungCounter = 0

            try {
                await this.obs.call("SetInputSettings", {
                    inputName: this.preferredCameraInputName,
                    inputSettings: { deactivate_when_not_showing: true },
                    overlay: true,
                })

                const sceneName = (
                    await this.obs.call("GetCurrentProgramScene")
                ).currentProgramSceneName

                const sceneItems = await this.obs.call("GetSceneItemList", {
                    sceneName,
                })

                const sceneItem = sceneItems.sceneItems.find(
                    (item: { sourceName: string; sceneItemId: number }) =>
                        item.sourceName === this.preferredCameraInputName
                )

                if (sceneItem && typeof sceneItem.sceneItemId === "number") {
                    await this.obs.call("SetSceneItemEnabled", {
                        sceneName,
                        sceneItemId: sceneItem.sceneItemId,
                        sceneItemEnabled: false,
                    })

                    await new Promise((resolve) => setTimeout(resolve, 500))

                    await this.obs.call("SetSceneItemEnabled", {
                        sceneName,
                        sceneItemId: sceneItem.sceneItemId,
                        sceneItemEnabled: true,
                    })

                    if (runtimeConfig.public.appEnv === "development") {
                        console.log(
                            `Webcam stream for ${this.preferredCameraInputName} was reset.`
                        )
                    }
                } else if (runtimeConfig.public.appEnv === "development") {
                    console.warn(
                        `Could not find ${this.preferredCameraInputName} in current scene.`
                    )
                }
            } catch (error) {
                console.error("Failed to reset webcam stream:", error)
                this.alertError("Failed to execute stream reset command.")
            } finally {
                this.isResettingStream = false
            }
        },

        async getCurrentProfile() {
            try {
                const profile = await this.obs.call("GetProfileList")
                this.currentProfile = profile.currentProfileName
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("getCurrentProfile", profile)
                }
            } catch (err: unknown) {
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("getCurrentProfile error:", err)
                } else if (!(err instanceof Error)) {
                    console.error("Failed get profile unknown error:", err)
                }
            }
        },

        async getRecordStatus() {
            try {
                const status = await this.obs.call("GetRecordStatus")
                this.isRecording = status.outputActive
                this.durationMs = status.outputDuration
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("getRecordStatus", status)
                }
                return status
            } catch (err: unknown) {
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("getRecordStatus error:", err)
                }
            }
        },

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
                this.freeDiskGb = -1
                this.diskLevel = "ok"
                clearRoom(this.roomId ?? "")
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("checkDiskSpace error:", err)
                }
            }
        },

        async startRecording() {
            if (this.isRecording) {
                this.alertError("กำลังอัดอยู่")
                return
            }
            this.isStarting = true
            try {
                if (
                    this.currentSceneCollection !== this.preferredSceneCollection
                ) {
                    await this.changeSceneCollection(
                        this.preferredSceneCollection ?? ""
                    )
                }

                await this.obs.call("SetCurrentProfile", {
                    profileName: this.selectedProfileName(),
                })

                await this.obs.call("StartRecord")

                this.streamRetryCount = 0
                this.alertSuccess("เริ่มอัดแล้ว")
                this.$emit("StartRecordSuccess")
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                this.alertError("Failed to start recording: " + msg)
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("Failed to start recording:", err)
                }
            } finally {
                this.isStarting = false
            }
        },

        async manualResetCamera() {
            this.streamRetryCount = 0
            this.hungCounter = 0
            this.isStreamHung = false
            await this.resetWebcamStream()
        },

        askConfirmStopRecord() {
            if (this.isRecording) {
                this.dialog = true
            }
        },

        async confirmStopRecord() {
            this.dialog = false
            await this.stopRecording()
        },

        async stopRecording() {
            try {
                if (this.isRecording) {
                    await this.obs.call("StopRecord")
                    this.durationMs = 0
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                this.alertError("Failed to stop recording: " + msg)
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("Failed to stop recording:", err)
                }
            }
        },

        async changeSceneCollection(name: string) {
            try {
                if (this.isRecording) return
                if (
                    this.currentSceneCollection === this.preferredSceneCollection
                ) {
                    return
                }

                await this.obs.call("SetCurrentSceneCollection", {
                    sceneCollectionName: name,
                })

                if (runtimeConfig.public.appEnv === "development") {
                    console.log("SetCurrentSceneCollection", name)
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                this.alertError(msg)
                if (runtimeConfig.public.appEnv === "development") {
                    console.error("Failed to change scene collection:", err)
                }
            }
        },

        onCurrentProfileChanged(event: OBSEventTypes["CurrentProfileChanged"]) {
            this.currentProfile = event.profileName
            if (runtimeConfig.public.appEnv === "development") {
                console.log("onCurrentProfileChanged", event.profileName)
            }
        },

        onRecordStateChanged(event: OBSEventTypes["RecordStateChanged"]) {
            if (runtimeConfig.public.appEnv === "development") {
                console.log("onRecordStateChanged", event)
            }

            switch (event.outputState) {
                case "OBS_WEBSOCKET_OUTPUT_STARTING":
                // falls through
                case "OBS_WEBSOCKET_OUTPUT_STARTED":
                    this.isRecording = true
                    this.getCurrentProfile()
                    if (!this.recordingStatusInterval) {
                        this.recordingStatusInterval = window.setInterval(() => {
                            this.getRecordStatus()
                        }, 2000)
                    }
                    break

                case "OBS_WEBSOCKET_OUTPUT_STOPPING":
                    this.isStopping = true
                    break

                case "OBS_WEBSOCKET_OUTPUT_STOPPED":
                    clearInterval(this.recordingStatusInterval)
                    this.recordingStatusInterval = 0
                    this.isStopping = false
                    this.isRecording = false
                    this.durationMs = 0
                    break

                default:
                    break
            }
        },

        onVirtualcamStateChanged(event: OBSEventTypes["VirtualcamStateChanged"]) {
            if (runtimeConfig.public.appEnv === "development") {
                console.log("onVirtualcamStateChanged", event)
            }
        },

        onInputActiveStateChanged(event: OBSEventTypes["InputActiveStateChanged"]) {
            if (runtimeConfig.public.appEnv === "development") {
                console.log("InputActiveStateChanged", event)
            }
        },

        onInputShowStateChanged(event: OBSEventTypes["InputShowStateChanged"]) {
            if (runtimeConfig.public.appEnv === "development") {
                console.log("InputShowStateChanged", event)
            }
        },

        onCurrentSceneCollectionChanged(
            event: OBSEventTypes["CurrentSceneCollectionChanged"]
        ) {
            if (runtimeConfig.public.appEnv === "development") {
                console.log("CurrentSceneCollectionChanged", event)
            }
            this.currentSceneCollection = event.sceneCollectionName
            this.getCameraStatus()
            this.getCurrentProfile()
            this.getRecordStatus()
        },

        onInputVolumeMeters(_event: OBSEventTypes["InputVolumeMeters"]) {
            // reserved
        },

        alertSuccess(text: string) {
            this.alertText = text
            this.alertLevel = "success"
            this.alertTimeoutMs = 3000
            this.alertShow = true
        },

        alertInfo(text: string, timeoutMs = 5000) {
            this.alertText = text
            this.alertLevel = "info"
            this.alertTimeoutMs = timeoutMs
            this.alertShow = true
        },

        alertWarning(text: string, timeoutMs = 5000) {
            this.alertText = text
            this.alertLevel = "warning"
            this.alertTimeoutMs = timeoutMs
            this.alertShow = true
        },

        alertError(text: string, timeoutMs = 5000) {
            this.alertText = text
            this.alertLevel = "error"
            this.alertTimeoutMs = timeoutMs
            this.alertShow = true
        },
    },

    async mounted() {
        try {
            await this.connectOBS()
            this.getCameraStatus()
            this.getCurrentProfile()
            await this.getRecordStatus()

            if (!this.recordingStatusInterval && this.isRecording) {
                this.recordingStatusInterval = window.setInterval(() => {
                    this.getRecordStatus()
                }, 2000)
            }

            if (!this.hungCheckInterval) {
                this.hungCheckInterval = window.setInterval(() => {
                    this.checkStreamHealth()
                }, 2000)
            }

            await this.checkDiskSpace()
            if (!this.diskCheckInterval) {
                this.diskCheckInterval = window.setInterval(() => {
                    this.checkDiskSpace()
                }, 30000)
            }
        } catch (err: unknown) {
            if (runtimeConfig.public.appEnv === "development") {
                console.error("Failed to init:", err)
            } else if (!(err instanceof Error)) {
                console.error("Failed to init with unknown error:", err)
            }
        }
    },

    beforeUnmount() {
        clearInterval(this.recordingStatusInterval)
        clearInterval(this.hungCheckInterval)
        clearInterval(this.diskCheckInterval)
        clearRoom(this.roomId ?? "")
        this.obs.off("CurrentProfileChanged", this.onCurrentProfileChanged)
        this.obs.off("RecordStateChanged", this.onRecordStateChanged)
        this.obs.off("VirtualcamStateChanged", this.onVirtualcamStateChanged)
        this.obs.off(
            "CurrentSceneCollectionChanged",
            this.onCurrentSceneCollectionChanged
        )
        this.obs.off("InputActiveStateChanged", this.onInputActiveStateChanged)
        this.obs.off("InputShowStateChanged", this.onInputShowStateChanged)
        this.obs.off("InputVolumeMeters", this.onInputVolumeMeters)
        this.obs.disconnect()
    },
}
</script>
