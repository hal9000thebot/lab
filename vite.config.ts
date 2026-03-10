import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

function getBuildMeta() {
  let sha = 'dev';
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // ignore
  }

  let releaseName = 'unreleased';
  try {
    const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
    releaseName = pkg.releaseName ?? releaseName;
  } catch {
    // ignore
  }

  return {
    version: process.env.npm_package_version ?? '0.0.0',
    sha,
    releaseName,
    buildTime: new Date().toISOString(),
  };
}

const meta = getBuildMeta();

// https://vite.dev/config/
export default defineConfig({
  base: '/lab/',
  define: {
    __APP_VERSION__: JSON.stringify(meta.version),
    __APP_SHA__: JSON.stringify(meta.sha),
    __RELEASE_NAME__: JSON.stringify(meta.releaseName),
    __BUILD_TIME__: JSON.stringify(meta.buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'GymBro',
        short_name: 'GymBro',
        description: 'Minimal workout log (templates, sessions, progress).',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        start_url: '/lab/',
        scope: '/lab/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
