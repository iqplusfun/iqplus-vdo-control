<template>
    <v-app>
        <NuxtLoadingIndicator :color="false" />
        <v-app-bar flat>
            <v-app-bar-title class="font-weight-bold">IQPlus VDO Control</v-app-bar-title>
            <template #append>
                <v-chip size="small" variant="outlined" class="mr-4">
                    {{ runtimeConfig.public.appVersion }}
                </v-chip>
            </template>
        </v-app-bar>
        <NuxtPage />
    </v-app>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
</script>
