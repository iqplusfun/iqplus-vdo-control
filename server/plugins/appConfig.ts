export default defineNitroPlugin(() => {
    const appConfig = useAppConfig()
    console.log("App Version:", appConfig.version)
})
