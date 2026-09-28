import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parse } from 'parse5';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const fonts = Promise.all([400, 700].map(async (weight) => ({
  name: 'Inter', weight, style: 'normal',
  data: await readFile(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`)),
})));
const element = (type, style, children, props = {}) => ({ type, props: { style, children, ...props } });

export async function renderCard({ title, description = '', label = 'Documentation', domain }) {
  // Measure the actual laid-out text, reducing size only when necessary.
  // An unreasonably long title fails visibly instead of silently clipping.
  for (let size = 58; size >= 26; size -= 2) {
    let bottom = 0;
    const svg = await satori(element('div', {
      width: 1200, height: 630, display: 'flex', position: 'relative',
      backgroundColor: '#fbfaf7', color: '#20201d', fontFamily: 'Inter',
    }, [
      element('svg', { position: 'absolute', top: 0, left: 0 }, [
        { type: 'path', props: { d: 'M700 780 C760 490 1030 260 1370 155 L1500 155 L1500 800 L700 800 Z', fill: '#9a4f22' } },
        { type: 'path', props: { d: 'M700 780 C760 490 1030 260 1370 155', fill: 'none', stroke: '#f2eee7', strokeWidth: 130 } },
      ], { width: 1200, height: 630, viewBox: '0 0 1200 630' }),
      element('div', { position: 'absolute', top: 52, left: 72, display: 'flex', fontSize: 48, fontWeight: 700, letterSpacing: -2 }, [
        element('span', {}, 'dot'), element('span', { color: '#9a4f22' }, 'cfg'),
      ]),
      element('div', { position: 'absolute', top: 135, left: 74, fontSize: 17, fontWeight: 700, letterSpacing: 3, color: '#9a4f22' }, label.toUpperCase()),
      element('div', { position: 'absolute', top: 196, left: 72, width: 740, display: 'flex', flexDirection: 'column', gap: 24 }, [
        element('div', { fontSize: size, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1.5, wordBreak: 'break-word' }, title, { 'data-measure': true }),
        ...(description.trim() ? [element('div', { display: 'block', lineClamp: 3, fontSize: 22, lineHeight: 1.45, color: '#696860', wordBreak: 'break-word' }, description, { 'data-measure': true })] : []),
      ]),
      element('div', { position: 'absolute', left: 74, bottom: 34, fontSize: 19, fontWeight: 700, color: '#9a4f22' }, domain),
    ]), {
      width: 1200, height: 630, fonts: await fonts,
      onNodeDetected: (node) => {
        if (node.props?.['data-measure']) bottom = Math.max(bottom, node.top + node.height);
      },
    });
    if (bottom <= 540) return new Resvg(svg).render().asPng();
  }
  throw new Error(`OG text is too long to fit: ${title}`);
}

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

function metadata(html) {
  const values = new Map();
  const visit = (node) => {
    if (node.tagName === 'meta') {
      const attrs = Object.fromEntries(node.attrs.map(({ name, value }) => [name, value]));
      values.set(attrs.property || attrs.name, attrs.content);
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(html));
  return values;
}

export default function ogImages() {
  return {
    name: 'dotcfg-og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const output = fileURLToPath(dir);
        let count = 0;
        for await (const file of htmlFiles(output)) {
          const meta = metadata(await readFile(file, 'utf8'));
          const image = meta.get('og:image');
          if (!image) continue;
          const url = new URL(image);
          if (!url.pathname.startsWith('/og/')) continue;
          const page = new URL(meta.get('og:url'));
          const png = await renderCard({
            title: meta.get('og:title').replace(/\s+[—-]\s+dotcfg$/, ''),
            description: meta.get('og:description') || '',
            label: page.pathname === '/blog' || page.pathname.startsWith('/blog/') ? 'Blog' : 'Documentation',
            domain: page.host,
          });
          const destination = join(output, url.pathname.slice(1));
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination, png);
          count++;
        }
        logger.info(`Generated ${count} social preview images`);
      },
    },
  };
}
