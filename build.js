// Tiny static site builder. No dependencies. Run: node build.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const out = path.join(root, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(root, 'site.json'), 'utf8'));
const IMG = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>');

function monthYear(d) {
  const date = new Date(d + 'T00:00:00');
  return isNaN(date) ? d : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta = {};
  let body = text;
  if (m) {
    body = m[2];
    m[1].split(/\r?\n/).forEach(line => {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  }
  return { meta, body };
}

function renderBody(body, slug) {
  const src = f => `/albums/${slug}/${encodeURI(f)}`;
  return body.trim().split(/\n\s*\n/).map(block => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.every(l => /^!\[.*\]\(.+\)$/.test(l))) {
      const figs = lines.map(l => {
        const [, alt, file] = l.match(/^!\[(.*)\]\((.+)\)$/);
        return `<figure><img src="${src(file)}" alt="${esc(alt)}" loading="lazy">` +
          (alt ? `<figcaption>${inline(alt)}</figcaption>` : '') + `</figure>`;
      }).join('');
      return `<div class="spread n${Math.min(lines.length, 3)}">${figs}</div>`;
    }
    if (/^##\s+/.test(lines[0])) return `<h2>${inline(lines[0].replace(/^##\s+/, ''))}</h2>`;
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('\n');
}

const page = (title, content, desc) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || site.tagline)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Karla:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body>
${content}
<footer class="foot"><p>${esc(site.footer)}</p></footer>
</body>
</html>
`;

// Reset output
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'style.css'), path.join(out, 'style.css'));

const albumsDir = path.join(root, 'albums');
const albums = [];

for (const slug of fs.readdirSync(albumsDir)) {
  const dir = path.join(albumsDir, slug);
  const storyPath = path.join(dir, 'story.md');
  if (!fs.statSync(dir).isDirectory() || !fs.existsSync(storyPath)) continue;

  const { meta, body } = parse(fs.readFileSync(storyPath, 'utf8'));
  const dest = path.join(out, 'albums', slug);
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(dir).filter(f => IMG.test(f));
  files.forEach(f => fs.copyFileSync(path.join(dir, f), path.join(dest, f)));

  const cover = meta.cover || files.sort()[0];
  const album = {
    slug, cover,
    title: meta.title || slug,
    date: meta.date || '',
    place: meta.place || '',
    summary: meta.summary || ''
  };
  albums.push(album);

  const content = `
<header class="masthead small"><a class="home" href="/">${esc(site.title)}</a></header>
<main class="album">
  <header class="album-head">
    <h1>${inline(album.title)}</h1>
    <p class="where">${esc(album.place)}</p>
    <p class="when">${esc(monthYear(album.date))}</p>
    ${album.summary ? `<p class="lede">${inline(album.summary)}</p>` : ''}
  </header>
  <div class="story">${renderBody(body, slug)}</div>
  <p class="back"><a href="/">Back to all albums</a></p>
</main>`;
  fs.writeFileSync(path.join(dest, 'index.html'), page(`${album.title} | ${site.title}`, content, album.summary));
}

albums.sort((a, b) => b.date.localeCompare(a.date));

const list = albums.map(a => `
<article class="entry">
  <a class="cover" href="/albums/${a.slug}/">${a.cover ? `<img src="/albums/${a.slug}/${encodeURI(a.cover)}" alt="" loading="lazy">` : ''}</a>
  <div class="entry-text">
    <h2><a href="/albums/${a.slug}/">${inline(a.title)}</a></h2>
    <p class="meta">${esc(a.place)}</p>
    <p class="meta">${esc(monthYear(a.date))}</p>
    <p>${inline(a.summary)}</p>
  </div>
</article>`).join('\n');

const home = `
<header class="masthead">
  <h1>${esc(site.title)}</h1>
  <p>${esc(site.tagline)}</p>
</header>
<main class="entries">${list}</main>`;
fs.writeFileSync(path.join(out, 'index.html'), page(site.title, home));

console.log(`Built ${albums.length} album(s) into dist/`);
