<template>
    <v-app>
        <NuxtLoadingIndicator :color="false" />
        <div class="app-frame">
            <header class="app-header">
                <span class="app-title">IQPlus VDO Control</span>
                <v-chip size="small" variant="outlined">
                    {{ runtimeConfig.public.appVersion }}
                </v-chip>
            </header>
            <NuxtPage />
        </div>
    </v-app>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
</script>
