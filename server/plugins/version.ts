// Version is resolved at build time in nuxt.config.ts via resolveVersion().
// This plugin is intentionally empty — setting process.env.NUXT_PUBLIC_* at
// server startup has no effect for static/SPA deployments (no persistent server).
export default defineNitroPlugin(() => {})
