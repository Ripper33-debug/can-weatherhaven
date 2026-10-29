import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL || 'https://weatherhaven-redesign.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap({ filter: p => !/\/(api|ar)\//.test(p) })],
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0, minify: process.env.NOMIN ? false : 'esbuild' } }
});
