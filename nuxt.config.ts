// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: false },
  modules: ["@nuxt/icon", "shadcn-nuxt", "@nuxtjs/color-mode"],
  colorMode: {
    classSuffix: "",
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || "file:./db.sqlite",
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GOOGLE_API_KEY,
    authSecret: process.env.AUTH_SECRET,
  },
  vite: {
    server: {
      hmr: {
        host: "localhost",
      },
      allowedHosts: [
        ".ngrok-free.app",
        "localhost",
      ],
    },
    plugins: [
      // @ts-ignore
      tailwindcss(),
    ],
  },
  css: [
    "~/assets/css/tailwind.css",
    "~/assets/css/highlight.css",
    "~/assets/css/general.css",
  ],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "./components/ui",
  },
});