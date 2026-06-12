<template>
    <div class="page">
        <v-card class="mb-4">
            <v-card-title class="text-body-1 font-weight-medium pt-4 pb-0 px-4">
                เลือกครูและวิชา
            </v-card-title>
            <v-card-text>
                <v-select
                    v-model="selectedTeacher"
                    :items="teachers"
                    item-title="Name"
                    item-value="Id"
                    label="ครู"
                    hide-details
                    variant="outlined"
                    class="mb-4"
                />
                <v-select
                    v-model="selectedClass"
                    :items="filteredClasses"
                    item-title="Name"
                    item-value="Id"
                    label="วิชา"
                    :disabled="!selectedTeacher"
                    hide-details
                    variant="outlined"
                />
            </v-card-text>
        </v-card>

        <ObsController
            v-for="room in rooms"
            :key="room.roomId"
            class="mb-4"
            :roomName="room.roomName"
            :roomShortName="room.roomShortName"
            :roomId="room.roomId"
            :preferredSceneCollection="room.preferredSceneCollection"
            :preferredCameraInputName="room.preferredCameraInputName"
            :preferredInputNameList="room.preferredInputNameList"
            :obsWebsocketUrl="room.obsWebsocketUrl"
            :selectedSubject="selectedClass"
            @start-record-success="clearSelectedTeacher"
        />
    </div>
</template>

<script setup lang="ts">
import ObsController from "~/components/ObsController.vue"
import iqplusSubjects from "~/constant/subjects"
import iqplusTeachers from "~/constant/teachers"
import iqplusRooms from "~/constant/rooms"
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
            rooms: iqplusRooms,
            selectedTeacher: "",
            selectedClass: "",
        }
    },
    computed: {
        filteredClasses() {
            return this.classes.filter((c) => c.TeacherId === this.selectedTeacher)
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
