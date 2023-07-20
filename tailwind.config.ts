import type { Config } from "tailwindcss"
// import defaultTheme from 'tailwindcss/defaultTheme'

export default <Partial<Config>>{
    theme: {
        extend: {
            colors: {
                primary: "#ff0000",
                // primary: defaultTheme.colors.green
            },
        },
        container: {
            center: true,
        },
    },
}
