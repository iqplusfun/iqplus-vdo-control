import { execSync } from "child_process"

export default defineNitroPlugin((nitroApp) => {
    let version = "dev"
    try {
        // Get the latest git tag
        version = execSync("git describe --tags --abbrev=0").toString().trim()
        console.log("Git tag, AppVersion :", version)
    } catch (error) {
        console.warn("Failed to get git version:", error)
    }

    // Make version available in runtime config
    process.env.NUXT_PUBLIC_APP_VERSION = version
})
