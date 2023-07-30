// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // $production: {
  //   devtools: { enabled: false },
  // },

  // $development: {
  //   devtools: { enabled: true },
  // },
  
  alias: {
    "~": "",
    "@": "",
    "~~": "",
    "@@": "",
    "assets": "/assets",
    "public": "/public",
  },
  app:{
    head: {
      titleTemplate: '%s - IQPlus',
      title: 'VDO control',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: '' },
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    },
  },
  build: {
    transpile: ['vuetify'],
  },
  css: [
    'vuetify/lib/styles/main.sass',
    '@mdi/font/css/materialdesignicons.min.css',
  ],
  modules: [
    '@nuxtjs/tailwindcss',

    "nuxt-lodash",
    
    // // Using package name (recommended usage)
    // '@nuxtjs/example',

    // // Load a local module
    // './modules/example',

    // // Add module with inline-options
    // ['./modules/example', { token: '123' }]

    // // Inline module definition
    // async (inlineOptions, nuxt) => { }
  ],
  ssr: false,
  typescript: {
    strict: true
  },
  runtimeConfig: {
    // The private keys which are only available within server-side
    apiSecret: "123",

    // Keys within public, will be also exposed to the client-side
    public: {
      appEnv: process.env.APP_ENV || "development",
      apiBase: process.env.API_BASE || "default_api_url",
      otherUrl: process.env.OTHER_URL || "default_other_url",
    }
  },
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
  },
})
