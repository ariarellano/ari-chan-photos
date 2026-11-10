# Ari Chan Takes Photos

A small photo-story site. No frameworks, no dependencies, just Node.

## Add an album

1. Make a folder in `albums/`, for example `albums/joshua-tree-2026/`.
2. Put your photos in it (jpg, png, webp). Resize to about 2000px on the long edge first so pages load fast.
3. Add a `story.md` (copy the one in `sample-album` as a starting point).
4. Run `node build.js` to test locally. Open `dist/index.html` after running `npx serve dist`.

## Story format

- Top block: `title`, `date` (YYYY-MM-DD), `place`, `cover`, `summary`.
- Blank line = new paragraph. `## Heading` = a chapter heading.
- `![caption](photo.jpg)` places a photo. Two photo lines in a row (no blank line) sit side by side.

## Deploy (Cloudflare Pages)

Build command: `node build.js`
Build output directory: `dist`
