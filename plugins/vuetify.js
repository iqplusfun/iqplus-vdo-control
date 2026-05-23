// plugins/vuetify.js
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    ssr: true,
    components,
    directives,
    theme: {
      defaultTheme: 'dark',
      themes: {
        dark: {
          colors: {
            primary: '#E84C2B',
            secondary: '#F97316',
          }
        }
      }
    }
  })

  nuxtApp.vueApp.use(vuetify)
})