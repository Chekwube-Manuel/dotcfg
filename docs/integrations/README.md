# Social preview images

`pnpm build` generates 1200 × 630 PNG cards in `dist/og/` after Astro renders
its pages. The shared docs layout supplies each image URL. The generator reads
the rendered page's Open Graph title, description, and canonical page URL, so
blog frontmatter and documentation layout props remain the source of truth.
New pages using `DocsLayout` automatically receive cards. The homepage retains
`public/brand/og.png`. During `pnpm dev`, pages use that existing image; run
`pnpm build` followed by `pnpm preview` to inspect generated cards.

Satori lays out the text and embeds glyph outlines; Resvg renders the PNG.
Inter's regular and bold WOFF files come from the locked `@fontsource/inter`
package, with no font downloads during builds. Font licensing is included in
that package. The template uses the light-theme background, foreground, primary,
muted, and muted-foreground values from `src/styles/global.css`.

Titles wrap and decrease in size as needed to keep the description above the
footer. Descriptions are capped at three lines with an ellipsis on the card;
the full page metadata is preserved. Empty descriptions are omitted. Text that cannot fit at the minimum
size causes a build error rather than silently producing a clipped card.
Generated PNGs are build output and should not be committed.
