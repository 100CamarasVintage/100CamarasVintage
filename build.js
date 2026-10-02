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

  const allItems = files.map(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const item = JSON.parse(raw);
    item.photos = (item.photos || []).map(cleanPath).filter(Boolean);
    item.thumb = cleanPath(item.thumb) || item.photos[0] || '';
    item.code = item.code || '';
    item.category = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    return item;
  });

  // Las productos marcados como "Oculta" en el panel no se publican en el
  // catalogo (quedan afuera de data.js) pero su archivo JSON sigue guardado
  // en content/productos, con todas sus fotos y datos, por si hay que
  // reactivarlos despues (por ejemplo si vuelve a entrar stock).
  const items = allItems.filter(item => !item.hidden);
  const ocultos = allItems.length - items.length;

  // Ordenar segun content/orden.json (lista arrastrable del panel de admin).
  // Los productos que estan en esa lista se muestran en el orden en que fueron
  // acomodados ahi. Los que NO estan en la lista (por ejemplo, recien creados
  // y todavia no ubicados a mano) aparecen primero, mas nuevos arriba.
  const ORDEN_FILE = path.join(__dirname, 'content', 'orden.json');
  let ordenPosicion = new Map();
  if (fs.existsSync(ORDEN_FILE)) {
    try {
      const ordenRaw = fs.readFileSync(ORDEN_FILE, 'utf-8');
      const ordenData = JSON.parse(ordenRaw);
      const lista = Array.isArray(ordenData.items) ? ordenData.items : [];
      lista.forEach((entry, idx) => {
        const pid = Number(entry.producto);
        if (!isNaN(pid) && !ordenPosicion.has(pid)) {
          ordenPosicion.set(pid, idx);
        }
      });
    } catch (e) {
      console.error('No se pudo leer content/orden.json, se usa orden por fecha.', e);
    }
  }

  function ordenKey(item) {
    if (ordenPosicion.has(item.id)) {
      return [1, ordenPosicion.get(item.id)];
    }
    return [0, -(item.id || 0)];
  }
  items.sort((a, b) => {
    const ka = ordenKey(a);
    const kb = ordenKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1] - kb[1];
  });

  const json = JSON.stringify(items, null, 0);
  const output = `const ITEMS = ${json};\n`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`data.js generado con ${items.length} productos (${ocultos} ocultos no publicados).`);
}

main();
