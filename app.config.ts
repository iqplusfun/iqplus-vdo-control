export default defineAppConfig({
    title: "VDO Control",
    theme: {
        dark: true,
        colors: {
            primary: "#ff0000",
        },
    },
    version: process.env.NUXT_PUBLIC_APP_VERSION || "dev",
})
