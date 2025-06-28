export default defineAppConfig({
    title: "VDO Control",
    theme: {
        dark: true,
        colors: {
            primary: "#ff0000",
        },
    },
    version: process.env.APP_VERSION || "dev",
})
