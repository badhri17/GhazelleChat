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
      allowedHosts: [".ngrok-free.app", "localhost"],
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
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "./components/ui",
  },
  nitro: {
    hooks: {
      'compiled': (nitro) => {
        // @ts-ignore
        if (nitro.options.preset === 'node-server' || nitro.options.preset === 'node') {
          const fs = require('node:fs')
          const path = require('node:path')
          const arch = process.arch
          const platform = process.platform
          
          const libsqlNodeModulesDir = path.join(nitro.options.workspaceDir, 'node_modules', '@libsql');
          if (!fs.existsSync(libsqlNodeModulesDir)) {
            return;
          }

          const files = fs.readdirSync(libsqlNodeModulesDir);
          const nativePackageDirName = files.find((file: string) => file.includes(platform) && file.includes(arch));

          if (nativePackageDirName) {
            const srcDir = path.join(libsqlNodeModulesDir, nativePackageDirName);
            const destDir = path.join(nitro.options.output.serverDir, 'node_modules', '@libsql', nativePackageDirName);
            
            if (fs.existsSync(srcDir)) {
              console.log(`Copying native dependency ${nativePackageDirName} to build output...`);
              fs.mkdirSync(destDir, { recursive: true });
              fs.cpSync(srcDir, destDir, { recursive: true });
            }
          }
        }
      }
    }
  },
});