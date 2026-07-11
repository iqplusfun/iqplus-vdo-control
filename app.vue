<template>
    <v-app>
        <div
            class="disk-alert-overlay"
            :class="`disk-alert-overlay--${worstLevel}`"
            aria-hidden="true"
        />
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
const { worstLevel } = useDiskAlert()
</script>

<style>
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
</style>
