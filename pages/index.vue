<template>
    <v-main>
        <v-container class="py-6">
            <v-card class="mb-6" elevation="1">
                <v-card-title class="text-body-1 font-weight-medium pt-4 pb-0 px-4">
                    เลือกครูและวิชา
                </v-card-title>
                <v-card-text>
                    <v-row>
                        <v-col cols="12" sm="6">
                            <v-select
                                v-model="selectedTeacher"
                                :items="teachers"
                                item-title="Name"
                                item-value="Id"
                                label="ครู"
                                hide-details
                                variant="outlined"
                            />
                        </v-col>
                        <v-col cols="12" sm="6">
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
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>

            <v-row>
                <v-col
                    v-for="room in rooms"
                    :key="room.roomId"
                    cols="12"
                    md="6"
                >
                    <ObsController
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
                </v-col>
            </v-row>
        </v-container>
    </v-main>
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
