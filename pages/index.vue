<template>
    <div class="container mx-auto px-4 max-w-xl">
        <div>
            <div class="pt-4">
                <v-select
                    ref="teacher-select"
                    v-model="selectedTeacher"
                    :items="teachers"
                    item-text="Name"
                    item-title="Name"
                    item-value="Id"
                    label="ครู"
                    outlined
                ></v-select>
                <v-select
                    v-model="selectedClass"
                    :items="filteredClasses"
                    item-text="Name"
                    item-title="Name"
                    item-value="Id"
                    label="วิชา"
                    outlined
                ></v-select>
            </div>

            <ObsController
                roomName="ห้องเขียว"
                roomShortName="เขียว"
                roomId="green"
                preferredSceneCollection="Green_room"
                preferredCameraInputName="Green_room_webcam_front"
                :preferredInputNameList="[
                    'Green_room_webcam_front',
                    'ipad',
                    'Green_room_mic',
                ]"
                obsWebsocketUrl="ws://192.168.1.10:4444"
                :selectedSubject="selectedClass"
                @start-record-success="clearSelectedTeacher"
            />
            <ObsController
                roomName="ห้องชายกลาง"
                roomShortName="ชายกลาง"
                roomId="chaiklang"
                preferredSceneCollection="Chaiklang_room"
                preferredCameraInputName="Chaiklang_room_cam"
                :preferredInputNameList="[
                    'Chaiklang_room_cam',
                    'Chaiklang_ipad_or_tablet',
                ]"
                obsWebsocketUrl="ws:///192.168.1.10:4445"
                :selectedSubject="selectedClass"
                @start-record-success="clearSelectedTeacher"
            />
        </div>
    </div>
</template>
<script setup lang="ts">
import ObsController from "~/components/ObsController.vue"
import iqplusSubjects from "~/constant/subjects"
import iqplusTeachers from "~/constant/teachers"
</script>
<script lang="ts">
export default {
    name: "index",
    components: {
        ObsController,
    },
    data() {
        return {
            teachers: iqplusTeachers,
            classes: iqplusSubjects,
            selectedTeacher: "",
            selectedClass: "",
        }
    },
    mounted() {},
    computed: {
        filteredClasses() {
            return this.classes.filter((c) => {
                return c.TeacherId === this.selectedTeacher
            })
        },
    },
    methods: {
        clearSelectedTeacher() {
            this.$nextTick(() => {
                this.selectedTeacher = ""
                this.selectedClass = ""
            })
        },
    },
}
</script>
