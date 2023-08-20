<template>
    <div>
        <v-alert :model-value="alertShow" :text="alertText" :color="alertLevel"></v-alert>
        <v-card v-if="!isObsConnected">
            <div class="grid grid-cols-2 gap-0 pt-4 pb-2">
                ไม่สามารถเชื่อมต่อ OBS {{ roomName }}
            </div>
        </v-card>
        <v-card v-if="isObsConnected">
            <div class="grid grid-cols-2 gap-0">
                <v-btn prepend-icon="mdi-record-circle-outline" size="x-large" :color="startRecordBtnColor" elevation="2"
                    :disabled="isRecording" @click="startRecording">
                    <template v-slot:prepend>
                        <v-icon></v-icon>
                    </template>
                    <span class="action-btn">อัด{{ roomShortName }}</span>
                </v-btn>
                <v-btn prepend-icon="mdi-stop" size="x-large" :color="stopRecordBtnColor" elevation="2"
                    @click="askConfirmStopRecord">
                    <template v-slot:prepend>
                        <v-icon></v-icon>
                    </template>
                    <span class="action-btn">หยุดอัด{{ roomShortName }}</span>
                </v-btn>
            </div>
            <div class="grid grid-cols-2 gap-0 pt-4 pb-2">
                <div class="flex  justify-center">
                    <div class="flex-col">
                        <div>
                            สถานะกล้อง{{ roomShortName }}
                        </div>
                        <div v-if="isCameraStatusOk">
                            <v-icon icon="mdi-video-check" color="green"></v-icon>
                            ปกติ
                        </div>
                        <div v-else>
                            <v-icon icon="mdi-video-off-outline" color="red"></v-icon>
                            ยังไม่เปิดกล้อง
                        </div>
                    </div>
                </div>
                <div class="flex justify-center">
                    <div v-if="isStopping">
                        <p>
                            <v-icon icon="mdi-video-wireless" color="red" class="animate-pulse"></v-icon> {{ roomShortName
                            }}กำลังหยุด
                        </p>
                        <p>{{ currentProfileReadable() }}</p>
                    </div>
                    <div v-else-if="isRecording">
                        <p>
                            <v-icon icon="mdi-video-wireless" color="red" class="animate-pulse"></v-icon> {{ roomShortName
                            }}กำลังอัด
                        </p>
                        <p>{{ currentProfileReadable() }}</p>
                        <p>
                            ความยาว : {{ durationString }}
                        </p>
                    </div>
                    <div v-else>
                        <p>
                            <v-icon icon="mdi-video-wireless" color="grey"></v-icon>
                        </p>
                    </div>
                </div>
            </div>
        </v-card>
        <v-dialog v-model="dialog" persistent max-width="600px">
            <v-card>
                <v-card-text>
                    ต้องการหยุดอัด ?
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn class="mr-8" color="green" size="x-large" variant="outlined"
                        @click="dialog = false">ยกเลิก</v-btn>
                    <v-btn color="red" size="x-large" @click="confirmStopRecord">ยืนยัน</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style>
.action-btn {
    font-size: 0.85em;
}
</style>

<script setup lang="ts">
import OBSWebSocket, { OBSEventTypes, OBSRequestTypes, OBSResponseTypes, EventSubscription } from 'obs-websocket-js';
import { ref, onMounted } from 'vue'

const emit = defineEmits(['StartRecordSuccess', 'test'])

</script>

<script lang="ts">
const runtimeConfig = useRuntimeConfig();
export default {
    props: {
        roomName: String,
        roomShortName: String,
        roomId: String,
        preferredSceneCollection: String,
        obsWebsocketUrl: String,
        selectedSubject: String,
    },
    data() {
        return {
            obs: new OBSWebSocket(),
            isObsConnected: false,
            isCameraStatusOk: false,
            isRecording: false,
            isStopping: false,
            durationMs: 0,
            recordingStatusInterval: 0,
            currentSceneCollection: "", // Unseen, Green_room, Chaiklang_room
            currentProfile: "",
            alertShow: false,
            alertText: "",
            alertLevel: "", // success, info, warning, error
            dialog: false,
        };
    },
    computed: {
        durationString() {
            // const totalMs = this.durationMs * 1000;
            const result = new Date(this.durationMs).toISOString().slice(12, 19);
            return result;
        },
        startRecordBtnColor() {
            return this.isRecording ? "green-lighten-4" : "green";
        },
        stopRecordBtnColor() {
            return this.isRecording ? "red" : "red-lighten-4";
        },
    },
    methods: {
        async connectOBS() {
            console.log(runtimeConfig.public.appEnv)

            try {
                let obsPassword = undefined
                const {
                    obsWebSocketVersion,
                    negotiatedRpcVersion
                } = await this.obs.connect(this.obsWebsocketUrl, obsPassword, {
                    eventSubscriptions: EventSubscription.All | //  all non-high-volume events.
                        // EventSubscription.General |
                        // EventSubscription.Outputs |

                        // EventSubscription.InputVolumeMeters |
                        EventSubscription.InputActiveStateChanged |
                        EventSubscription.InputShowStateChanged,
                    // rpcVersion: 1,
                });
                if (runtimeConfig.public.appEnv === "development") {
                    console.log(`Connected to OBS ${obsWebSocketVersion} (using RPC version ${negotiatedRpcVersion})`)
                }

                this.isObsConnected = true

                this.obs.on('CurrentProfileChanged', this.onCurrentProfileChanged);
                this.obs.on('RecordStateChanged', this.onRecordStateChanged);
                this.obs.on('VirtualcamStateChanged', this.onVirtualcamStateChanged);
                this.obs.on("CurrentSceneCollectionChanged", this.onCurrentSceneCollectionChanged)

                this.obs.on('InputActiveStateChanged', this.onInputActiveStateChanged);
                this.obs.on('InputShowStateChanged', this.onInputShowStateChanged);
                this.obs.on('InputVolumeMeters', this.onInputVolumeMeters);


            } catch (error) {
                this.isObsConnected = false
                console.error('Failed to connect to OBS:', error);
            }
        },
        /////////
        // Data builder
        ////////
        selectedProfileName() {
            if (this.selectedSubject === "" || this.selectedSubject === "not_select") {
                throw new Error("please select class")
            }
            return this.selectedSubject + "_" + this.roomId + "_profile"
        },
        currentProfileReadable(): string {
            if (this.currentProfile.length) {
                let p = this.currentProfile.split("_")
                return p[0] + " " + p[1]
            }
            return ""
        },

        /////////
        // Request handler
        ////////
        async getCameraStatus(): Promise<boolean> {
            try {
                //  It may be "Green_room_cam", "Chaiklang_room_cam"
                const preferInputName = this.preferredSceneCollection + "_cam"

                const scene = await this.obs.call('GetSceneCollectionList');
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("GetSceneCollectionList", scene)
                }

                const input = await this.obs.call('GetInputList');
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("GetInputList", input)
                }

                const sourceActive = await this.obs.call('GetSourceActive', {
                    sourceName: preferInputName
                });
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("GetSourceActive", sourceActive)
                }

                let mainInputIndex = input.inputs.findIndex((p) => { return p.inputName == preferInputName }, 0)
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("inputIndex ", mainInputIndex)
                }

                if (scene.currentSceneCollectionName === this.preferredSceneCollection &&
                    sourceActive.videoActive &&
                    mainInputIndex >= 0) {
                    this.isCameraStatusOk = true
                    return Promise.resolve(true)
                }

                this.isCameraStatusOk = false
                return Promise.resolve(false)
            } catch (err: unknown) {
                if (err instanceof Error) {
                    // Inside this block, err is known to be a Error
                    if (runtimeConfig.public.appEnv === "development") {
                        console.error(err)
                    }
                    this.isCameraStatusOk = false
                    return Promise.resolve(false)
                } else {
                    console.error('Failed getCameraStatus unknown error :', err);
                    this.isCameraStatusOk = false
                    return Promise.resolve(false)
                }
            }
        },
        async getCurrentProfile() {
            try {
                const profile = await this.obs.call('GetProfileList');
                this.currentProfile = profile.currentProfileName
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("getCurrentProfile", profile)
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    // Inside this block, err is known to be a Error
                    if (runtimeConfig.public.appEnv === "development") {
                        console.error(err)
                    }
                } else {
                    console.error('Failed get profile unknown error :', err);
                    return err
                }
            }
        },
        async getRecordStatus() {
            try {
                const status = await this.obs.call('GetRecordStatus');

                this.isRecording = status.outputActive
                this.durationMs = status.outputDuration
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("getRecordStatus", status)
                }

                return status
            } catch (err: unknown) {
                if (err instanceof Error) {
                    // Inside this block, err is known to be a Error
                    if (runtimeConfig.public.appEnv === "development") {
                        console.error(err)
                    }
                } else {
                    return err
                }
            }
        },
        async startRecording() {
            try {
                if (this.isRecording) {
                    this.alertError("กำลังอัดอยู่")
                }

                if (this.currentSceneCollection !== this.preferredSceneCollection) {
                    await this.changeSceneCollection(this.preferredSceneCollection ? this.preferredSceneCollection : "")
                }

                const profileResp = await this.obs.call('SetCurrentProfile', {
                    profileName: this.selectedProfileName(),
                });
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("SetCurrentProfile resp", profileResp)
                }

                const response = await this.obs.call('StartRecord');
                if (runtimeConfig.public.appEnv === "development") {
                    console.log("StartRecord resp", response)
                }

                // tell parent
                this.$emit("StartRecordSuccess")

            } catch (err: unknown) {
                if (err instanceof Error) {
                    // Inside this block, err is known to be a Error
                    if (runtimeConfig.public.appEnv === "development") {
                        console.error('Failed to start recording:', err);
                    }
                    this.alertError('Failed to start recording: ' + err.message)
                } else {
                    console.error('Failed to start recording unknown error :', err);
                    this.alertError('Failed to start recording unknown error : ' + err)
                    return err
                }
            }
        },
        async askConfirmStopRecord() {
            if (this.isRecording) {
                this.dialog = true
            }
        },
        async confirmStopRecord() {
            this.dialog = false
            this.stopRecording()
        },
        async stopRecording() {
            try {
                if (this.isRecording) {
                    await this.obs.call('StopRecord');

                    this.durationMs = 0;
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    // Inside this block, err is known to be a Error
                    if (runtimeConfig.public.appEnv === "development") {
                        console.error('Failed to stop recording:', err);
                    }
                } else {
                    return err
                }
            }
        },
        async changeSceneCollection(name: string) {
            try {
                if (this.isRecording) {
                    return
                }

                if (this.currentSceneCollection === this.preferredSceneCollection) {
                    return
                }

                const changeSceneResponse = await this.obs.call('SetCurrentSceneCollection', {
                    sceneCollectionName: name
                });

                if (runtimeConfig.public.appEnv === "development") {
                    console.log("SetCurrentSceneCollection resp", changeSceneResponse)
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    // Inside this block, err is known to be a Error
                    if (runtimeConfig.public.appEnv === "development") {
                        console.error('Failed to change scene collection:', err);
                    }
                    this.alertError(err.message)
                } else {
                    console.error('Failed to change scene collection unknown error :', err);
                    return err
                }
            }
        },

        /////////
        // Event handler
        ////////
        onCurrentProfileChanged(event: OBSEventTypes["CurrentProfileChanged"]) {
            // profileName	String	Name of the new profile
            if (runtimeConfig.public.appEnv === "development") {
                console.log("onCurrentProfileChanged", event.profileName)
            }
        },
        onRecordStateChanged(event: OBSEventTypes["RecordStateChanged"]) {
            // outputActive	Boolean	Whether the output is active
            // outputState	String	The specific state of the output
            // outputPath	String	File name for the saved recording, if record stopped. null otherwise

            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_UNKNOWN
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_STARTING
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_STARTED
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_STOPPING
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_STOPPED
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_RECONNECTING
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_RECONNECTED
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_PAUSED
            // ObsOutputState::OBS_WEBSOCKET_OUTPUT_RESUMED

            if (runtimeConfig.public.appEnv === "development") {
                console.log("onRecordStateChanged", event)
            }
            if (event.outputActive) {
                // set button's state

            }
            switch (event.outputState) {
                case "OBS_WEBSOCKET_OUTPUT_STARTING":
                // data : {
                //     "outputActive": false,
                //     "outputPath": null,
                //     "outputState": "OBS_WEBSOCKET_OUTPUT_STARTING"
                // }


                case "OBS_WEBSOCKET_OUTPUT_STARTED":
                    this.isRecording = true

                    // update current profile
                    this.getCurrentProfile();

                    // GetRecordStatus start interval
                    if (!this.recordingStatusInterval) {
                        let app = this
                        this.recordingStatusInterval = window.setInterval(function () { app.getRecordStatus() }, 2000);
                    }
                    break;

                case "OBS_WEBSOCKET_OUTPUT_STOPPING":
                    this.isStopping = true;
                    break;
                case "OBS_WEBSOCKET_OUTPUT_STOPPED":
                    // GetRecordStatus stop interval
                    clearInterval(this.recordingStatusInterval);
                    this.isStopping = false;
                    this.isRecording = false;
                    this.durationMs = 0;

                    break;
                default:
                    break;
            }
        },
        onVirtualcamStateChanged(event: OBSEventTypes["VirtualcamStateChanged"]) {
            // outputActive	Boolean	Whether the output is active
            // outputState	String	The specific state of the output
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
        onCurrentSceneCollectionChanged(event: OBSEventTypes["CurrentSceneCollectionChanged"]) {
            if (runtimeConfig.public.appEnv === "development") {
                console.log("CurrentSceneCollectionChanged", event)
            }
            this.currentSceneCollection = event.sceneCollectionName
            this.getCameraStatus();
            this.getCurrentProfile();
            this.getRecordStatus();
        },
        onInputVolumeMeters(event: OBSEventTypes["InputVolumeMeters"]) {

            // event.inputs.forEach(input => {
            //     // input : {
            //     //     inputLevelsMul: Array(
            //     //         []int{0,0,0}
            //     //         []int{0,0,0}
            //     //     ),
            //     //     inputName: String,
            //     // }

            //     console.log(input.inputName, ...input.inputLevelsMul)
            // });
        },
        alertSuccess(text: string) {
            this.alertText = text
            this.alertLevel = "success"
            this.alertShow = true

            let self = this
            setTimeout(function () { self.alertText = "", self.alertShow = false }, 3000);
        },
        alertInfo(text: string) {
            this.alertText = text
            this.alertLevel = "info"
            this.alertShow = true

            let self = this
            setTimeout(function () { self.alertText = "", self.alertShow = false }, 5000);
        },
        alertWarning(text: string) {
            this.alertText = text
            this.alertLevel = "warning"
            this.alertShow = true

            let self = this
            setTimeout(function () { self.alertText = "", self.alertShow = false }, 5000);
        },
        alertError(text: string) {
            this.alertText = text
            this.alertLevel = "error"
            this.alertShow = true

            let self = this
            setTimeout(function () { self.alertText = "", self.alertShow = false }, 5000);
        },

    },

    async mounted() {
        try {

            await this.connectOBS();
            this.getCameraStatus();
            this.getCurrentProfile();
            await this.getRecordStatus();
            if (!this.recordingStatusInterval && this.isRecording) {
                let app = this
                this.recordingStatusInterval = window.setInterval(function () { app.getRecordStatus() }, 2000);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                if (runtimeConfig.public.appEnv === "development") {
                    console.error('Failed to init :', err);
                }
            } else {
                console.error('Failed to init with unknown error : ', err);
            }
        }
    },

    beforeDestroy() {
        clearInterval(this.recordingStatusInterval);
        this.obs.disconnect();
    },
};
</script>