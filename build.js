// build.js
// Este script lee todos los productos de /content/productos/*.json
// y genera data.js, el archivo que usa el sitio para mostrar el catálogo.
// Se ejecuta automáticamente en Netlify cada vez que se guarda un producto
// desde el panel de administración (/admin).

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content', 'productos');
const OUTPUT_FILE = path.join(__dirname, 'data.js');

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('No existe la carpeta content/productos');
    process.exit(1);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));

  // El panel de administración a veces guarda las fotos como "/images/archivo.jpg"
  // y a veces como solo "archivo.jpg". Esta función deja siempre el nombre limpio.
  function cleanPath(p) {
    if (!p) return p;
    return p.replace(/^\/?images\//, '');
  }

  const items = files.map(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const item = JSON.parse(raw);
    item.photos = (item.photos || []).map(cleanPath).filter(Boolean);
    item.thumb = cleanPath(item.thumb) || item.photos[0] || '';
    item.code = item.code || '';
    item.category = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    return item;
  });

  // Ordenar: primero los que tienen "orden" manual asignado (de menor a mayor),
  // y despues el resto, mas nuevos primero (por id descendente).
  function ordenKey(item) {
    const n = Number(item.orden);
    return (item.orden !== undefined && item.orden !== null && item.orden !== '' && !isNaN(n))
      ? n
      : Infinity;
  }
  items.sort((a, b) => {
    const ka = ordenKey(a);
    const kb = ordenKey(b);
    if (ka !== kb) return ka - kb;
    return (b.id || 0) - (a.id || 0);
  });

  const json = JSON.stringify(items, null, 0);
  const output = `const ITEMS = ${json};\n`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`data.js generado con ${items.length} productos.`);
}

main();
