// build-seo.js
// Genera, a partir de content/productos/*.json (los mismos datos que usa build.js):
//   - producto/<slug>/index.html  -> una página propia por producto (para que Google las encuentre una por una)
//   - sitemap.xml                 -> mapa del sitio
//   - robots.txt                  -> indica a Google dónde está el mapa del sitio
//   - feed/google.xml             -> archivo de productos para Google Merchant Center (Shopping gratis)
// Es ADITIVO: no toca index.html, data.js ni el catálogo. Si algo falla, el deploy sigue igual (no corta el build).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content', 'productos');
const SITE = 'https://www.100camarasvintage.com';
const WHATSAPP_NUMBER = '5491166553748';
const NEW_BOX = 'Cámaras nuevas en caja sin uso';
const BRANDS = ['Nikon', 'Canon', 'Olympus', 'Kodak', 'Minolta', 'Pentax', 'Sony', 'Fuji', 'Yashica', 'Leica', 'Panasonic', 'Casio', 'Sanyo', 'Konica', 'Ricoh', 'Zeiss', 'Voigtländer', 'Voigtlander', 'Yongnuo', 'Neewer', 'Laowa', 'Samyang', 'Tamron', 'Sigma', 'Vivitar', 'Braun', 'Polaroid', 'Fujifilm'];

function rmDirSafe(p) { try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) {} }
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cleanPath = p => (p ? String(p).replace(/^\/?images\//, '') : p);
const imgUrl = f => SITE + '/images/' + encodeURI(f);
const priceNum = p => { const n = Number(String(p || '').replace(/[^\d]/g, '')); return n > 0 ? n : 0; };
function slugify(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '');
}
function estado(i) { const m = (i.description || '').match(/^\s*estado:[^\n]*/im); return m ? m[0].trim() : ''; }
function isNew(i) {
  return i.category.includes(NEW_BOX) || /^estado:\s*nuev[oa]/i.test(estado(i)) ||
    /\bnuev[oa]\b/i.test(String(i.title).replace(/como nuevo/ig, ''));
}
function brandOf(i) {
  const hay = [i.title].concat(i.category).join(' ').toLowerCase();
  const b = BRANDS.find(b => hay.includes(b.toLowerCase()));
  return b ? (b === 'Fuji' ? 'Fujifilm' : b === 'Voigtlander' ? 'Voigtländer' : b) : '';
}
function plain(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function shortDesc(i) {
  // descripción corta para Google: sacamos el título repetido al comienzo
  let d = String(i.description || '');
  if (d.startsWith(i.title)) d = d.slice(i.title.length);
  d = plain(d);
  return d.length > 155 ? d.slice(0, 152).replace(/\s+\S*$/, '') + '…' : d;
}

function loadItems() {
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));
  const items = [];
  for (const f of files) {
    try {
      const it = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8'));
      if (it.hidden) continue;
      it.photos = (it.photos || []).map(cleanPath).filter(Boolean);
      it.thumb = cleanPath(it.thumb) || it.photos[0] || '';
      if (!it.photos.length && it.thumb) it.photos = [it.thumb];
      if (!it.photos.length || !it.title) continue;
      it.code = it.code ? String(it.code) : '';
      it.category = Array.isArray(it.category) ? it.category : (it.category ? [it.category] : []);
      items.push(it);
    } catch (e) { console.warn('build-seo: se salteó', f, e.message); }
  }
  return items;
}

function productPage(i, url, others) {
  const price = priceNum(i.price);
  const cond = isNew(i);
  const desc = shortDesc(i);
  const title = `${i.title} | 100 Cámaras Vintage`;
  const ld = {
    '@context': 'https://schema.org/', '@type': 'Product', name: i.title,
    image: i.photos.slice(0, 10).map(imgUrl), description: plain(i.description).slice(0, 5000), url,
    sku: i.code || String(i.id)
  };
  const b = brandOf(i); if (b) ld.brand = { '@type': 'Brand', name: b };
  if (price) ld.offers = {
    '@type': 'Offer', url, priceCurrency: 'ARS', price: String(price),
    availability: 'https://schema.org/InStock',
    itemCondition: cond ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    seller: { '@type': 'Organization', name: '100 Cámaras Vintage' }
  };
  const code = i.code ? ` (Código: ${i.code})` : '';
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(`Hola! Te consulto por: ${i.title}${code}\n${url}`);
  const thumbs = i.photos.map((p, k) => `<button type="button" class="th${k === 0 ? ' on' : ''}" data-src="/images/${esc(encodeURI(p))}"><img src="/images/${esc(encodeURI(p))}" alt="" loading="lazy"></button>`).join('');
  const more = others.map(o => `<a href="${o.href}"><img src="/images/${esc(encodeURI(o.thumb))}" alt="" loading="lazy"><span>${esc(o.title)}</span></a>`).join('');
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="100 Cámaras Vintage">
<meta property="og:title" content="${esc(i.title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(imgUrl(i.thumb))}"><meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/images/brand/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bevan&family=Archivo:wght@400;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
:root{--terracotta:#a9694c;--terracotta-dark:#8b5439;--forest:#2e4a3b;--forest-dark:#1f3329;--cream:#f3e8d3;--cream-bg:#faf3e7;--ink:#2b2420;--ink-soft:#5a4f45;--shadow:0 2px 10px rgba(43,36,32,.12)}
*{box-sizing:border-box}body{margin:0;background:var(--cream-bg);color:var(--ink);font-family:'Archivo',sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit}.top{border-bottom:3px solid var(--forest)}.top-inner{max-width:1100px;margin:0 auto;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:8px;text-decoration:none;font-family:'Bevan',serif;font-size:24px;color:var(--forest)}.brand img{width:44px;height:44px;border-radius:50%}
.back{font-size:14px;font-weight:600;color:var(--forest);text-decoration:none;border:2px solid var(--forest);padding:7px 14px;border-radius:4px}.back:hover{background:var(--forest);color:#fff}
.wrap{max-width:1100px;margin:0 auto;padding:28px 20px 10px;display:grid;grid-template-columns:1.1fr 1fr;gap:34px;align-items:start}
.main{width:100%;aspect-ratio:1/1;object-fit:contain;background:#fff;border-radius:4px;box-shadow:var(--shadow);display:block}
.ths{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.th{border:2px solid transparent;padding:0;background:#fff;width:68px;height:68px;border-radius:4px;overflow:hidden;cursor:pointer}.th.on{border-color:var(--terracotta)}.th img{width:100%;height:100%;object-fit:cover;display:block}
.cats{font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.06em}h1{font-family:'Bevan',serif;font-weight:400;font-size:clamp(24px,4vw,34px);line-height:1.15;color:var(--forest);margin:6px 0 10px}
.price{font-family:'Bevan',serif;font-size:30px;color:var(--terracotta-dark);margin:0}.code{color:var(--ink-soft);font-size:14px;margin:2px 0 16px}
.btn{display:inline-block;background:var(--forest);color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:4px}.btn:hover{background:var(--forest-dark)}
.desc{white-space:pre-line;margin-top:22px;font-size:16px}
.more{max-width:1100px;margin:0 auto;padding:10px 20px 40px}.more h2{font-family:'Bevan',serif;font-weight:400;color:var(--forest);font-size:24px}
.more .row{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}.more a{background:#fff;border-radius:4px;box-shadow:var(--shadow);text-decoration:none;overflow:hidden;font-size:13px;font-weight:600}
.more a img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}.more a span{display:block;padding:8px 10px}
footer{text-align:center;color:var(--ink-soft);font-size:14px;padding:24px 20px 40px}
@media(max-width:760px){.wrap{grid-template-columns:1fr;gap:18px}}
</style></head><body>
<header class="top"><div class="top-inner"><a class="brand" href="/"><img src="/images/brand/logo-badge.png" alt="" width="44" height="44">100 Cámaras</a><a class="back" href="/">Ver todo el catálogo</a></div></header>
<main class="wrap">
 <div><img class="main" id="main" src="/images/${esc(encodeURI(i.photos[0]))}" alt="${esc(i.title)}">${i.photos.length > 1 ? `<div class="ths">${thumbs}</div>` : ''}</div>
 <div>
  <div class="cats">${esc(i.category.filter(c => c !== 'Nuevos ingresos').join(' · '))}</div>
  <h1>${esc(i.title)}</h1>
  <p class="price">${esc(i.price || '')}</p>${i.code ? `<p class="code">Código: ${esc(i.code)}</p>` : ''}
  <a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
  <div class="desc">${esc(String(i.description || '').startsWith(i.title) ? String(i.description).slice(i.title.length).replace(/^\s+/, '') : (i.description || ''))}</div>
 </div>
</main>
${more ? `<section class="more"><h2>Más para ver</h2><div class="row">${more}</div></section>` : ''}
<footer>100 Cámaras Vintage · @100camarasvintage · Cramer y Monroe, Belgrano, CABA · Envíos a todo el país</footer>
<script>document.querySelectorAll('.th').forEach(function(b){b.addEventListener('click',function(){document.getElementById('main').src=b.dataset.src;document.querySelectorAll('.th').forEach(function(x){x.classList.remove('on')});b.classList.add('on')})})</script>
</body></html>`;
}

function main() {
  const items = loadItems();
  // slugs únicos
  const used = new Set();
  items.forEach(i => {
    let s = slugify(i.title) || 'producto';
    s = i.code ? `${s}-${i.code}` : `${s}-${i.id}`;
    while (used.has(s)) s += '-x';
    used.add(s);
    i.slug = s; i.url = `${SITE}/producto/${s}/`;
  });

  // páginas de producto
  rmDirSafe(path.join(ROOT, 'producto'));
  const byNew = items.slice().sort((a, b) => (parseInt(b.code, 10) || 0) - (parseInt(a.code, 10) || 0));
  items.forEach((i, idx) => {
    const others = byNew.filter(o => o !== i).slice(0, 6).map(o => ({ href: `/producto/${o.slug}/`, thumb: o.thumb, title: o.title }));
    const dir = path.join(ROOT, 'producto', i.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), productPage(i, i.url, others), 'utf-8');
  });

  // sitemap
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = ['/', '/nuevos-ingresos/', '/dia-de-la-madre/', '/lista-de-espera/', '/devoluciones/'].filter(u => u === '/' || fs.existsSync(path.join(ROOT, u.replace(/^\/|\/$/g, ''), 'index.html')));
  const urls = staticUrls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .concat(items.map(i => `  <url><loc>${esc(i.url)}</loc><lastmod>${today}</lastmod></url>`));
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, 'utf-8');
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf-8');

  // feed para Google Merchant Center
  const feedItems = items.filter(i => priceNum(i.price) > 0 && i.category.indexOf('Gift Card') === -1).map(i => {
    const b = brandOf(i);
    const d = plain(String(i.description || '').startsWith(i.title) ? i.description.slice(i.title.length) : i.description).slice(0, 4900) || i.title;
    return `<item>
<g:id>${esc(i.code || i.id)}</g:id>
<g:title>${esc(i.title.slice(0, 150))}</g:title>
<g:description>${esc(d)}</g:description>
<g:link>${esc(i.url)}</g:link>
<g:image_link>${esc(imgUrl(i.thumb))}</g:image_link>
${i.photos.filter(p => p !== i.thumb).slice(0, 9).map(p => `<g:additional_image_link>${esc(imgUrl(p))}</g:additional_image_link>`).join('\n')}
<g:availability>in_stock</g:availability>
<g:price>${priceNum(i.price)}.00 ARS</g:price>
<g:condition>${isNew(i) ? 'new' : 'used'}</g:condition>
${b ? `<g:brand>${esc(b)}</g:brand>` : '<g:identifier_exists>no</g:identifier_exists>'}
<g:google_product_category>${i.category.includes('Lentes') ? '2911' : i.category.includes('Flashes') ? '2898' : '142'}</g:google_product_category>
</item>`;
  });
  fs.mkdirSync(path.join(ROOT, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'feed', 'google.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>\n<title>100 Cámaras Vintage</title><link>${SITE}</link><description>Cámaras, lentes y accesorios vintage</description>\n${feedItems.join('\n')}\n</channel></rss>\n`, 'utf-8');
  console.log(`build-seo: ${items.length} páginas de producto, sitemap.xml, robots.txt y feed/google.xml (${feedItems.length} productos).`);
}

try { main(); } catch (e) { console.error('build-seo: no se pudo generar (el sitio sigue funcionando igual):', e.message); }
