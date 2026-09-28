import { defineConfig } from 'astro/config';
import ogImages from './integrations/og-images.mjs';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://dotcfg.pxxl.click',
  integrations: [mdx(), sitemap(), ogImages()],
  vite: {
    plugins: [tailwindcss()],
  },
});
