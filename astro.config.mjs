import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL || 'https://can-weatherhaven.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap({ filter: p => !/\/(api|ar)\//.test(p) })],
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  vite: { define: { __WH_BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 10)) }, build: { assetsInlineLimit: 0, minify: process.env.NOMIN ? false : 'esbuild' } }
});
