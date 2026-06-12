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
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: '#E84C2B',
            secondary: '#F97316',
            background: '#f4f4f5',
            surface: '#ffffff',
          }
        }
      }
    }
  })

  nuxtApp.vueApp.use(vuetify)
})