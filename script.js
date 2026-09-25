const WHATSAPP_NUMBER = "5491166553748";

const grid = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const itemCount = document.getElementById('itemCount');
const emptyState = document.getElementById('emptyState');
const categoryBar = document.getElementById('categoryBar');
const categorySections = document.getElementById('categorySections');
const pinnedRow = document.getElementById('pinnedRow');

const modalOverlay = document.getElementById('modalOverlay');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalCategory = document.getElementById('modalCategory');
const modalPrice = document.getElementById('modalPrice');
const modalCode = document.getElementById('modalCode');
const modalDesc = document.getElementById('modalDesc');
const modalWhatsapp = document.getElementById('modalWhatsapp');
const galleryDots = document.getElementById('galleryDots');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');
const modalClose = document.getElementById('modalClose');

const aboutBtn = document.getElementById('aboutBtn');
const aboutOverlay = document.getElementById('aboutOverlay');
const aboutModalClose = document.getElementById('aboutModalClose');
const buyBtn = document.getElementById('buyBtn');
const buyOverlay = document.getElementById('buyOverlay');
const buyModalClose = document.getElementById('buyModalClose');

let currentItem = null;
let currentPhotoIndex = 0;
let currentCategories = new Set(); // vacio = 'Todas'

const CATALOG_ITEMS = ITEMS.filter(i => !i.pinned);
const PINNED_ITEMS = ITEMS.filter(i => i.pinned);

const CATEGORY_ORDER = [
  'Nuevos ingresos',
  'Cámaras analógicas',
  'Cámaras point and shoot',
  'Cámaras digitales',
  'Cámaras nuevas en caja sin uso',
  'Lentes',
  'Flashes',
  'Raras/coleccionables',
  'TLR',
  'Micro 4/3',
  'Cámaras de fuelle',
  'Filmadoras a cuerda',
  'Otros',
  'Para deco o restauración',
  'Nikon',
  'Canon',
  'Pentax',
  'Olympus',
  'Yashica',
  'Fuji',
  'Soviéticas',
  'Minolta',
  'Kodak',
  'Sony'
];

const CATEGORY_ICONS = {
  'Nuevos ingresos': 'images/brand/icon-nuevoingresos.png',
  'Cámaras analógicas': 'images/brand/icon-reflex.png',
  'Cámaras point and shoot': 'images/brand/icon-compacta.png',
  'Cámaras digitales': 'images/brand/icon-digitales.png',
  'Cámaras nuevas en caja sin uso': 'images/brand/icon-cajasinuso.png',
  'Lentes': 'images/brand/icon-lentes.png',
  'Flashes': 'images/brand/icon-flash.png',
  'Raras/coleccionables': 'images/brand/icon-raras.png',
  'TLR': 'images/brand/icon-tlr.png',
  'Micro 4/3': 'images/brand/icon-micro43.png',
  'Cámaras de fuelle': 'images/brand/icon-fuelles.png',
  'Filmadoras a cuerda': 'images/brand/icon-acuerda.png',
  'Otros': 'images/brand/icon-tripode.png',
  'Para deco o restauración': 'images/brand/icon-decoyrestauracion.png'
};

function renderCategoryBar() {
  const categories = ['Todas', ...CATEGORY_ORDER];
  categoryBar.innerHTML = '';
  categories.forEach(cat => {
    const isActive = cat === 'Todas' ? currentCategories.size === 0 : currentCategories.has(cat);
    const btn = document.createElement('button');
    btn.className = 'category-pill' + (isActive ? ' active' : '');
    if (CATEGORY_ICONS[cat]) {
      const icon = document.createElement('img');
      icon.src = CATEGORY_ICONS[cat];
      icon.alt = '';
      icon.className = 'category-icon';
      btn.appendChild(icon);
    }
    btn.appendChild(document.createTextNode(cat));
    btn.addEventListener('click', () => {
      if (cat === 'Todas') {
        currentCategories.clear();
      } else if (currentCategories.has(cat)) {
        currentCategories.delete(cat);
      } else {
        currentCategories.add(cat);
      }
      renderCategoryBar();
      applyFilter();
    });
    categoryBar.appendChild(btn);
  });
}

function renderPreviewRow(item) {
  const row = document.createElement('div');
  row.className = 'preview-row';
  row.innerHTML = `
    <img class="preview-thumb" src="images/${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy">
    <div class="preview-info">
      <div class="preview-title">${escapeHtml(item.title)}</div>
      <div class="preview-price">${escapeHtml(item.price)}</div>
    </div>
  `;
  row.addEventListener('click', () => openModal(item));
  return row;
}

function renderSections() {
  categorySections.innerHTML = '';
  CATEGORY_ORDER.forEach(cat => {
    const items = CATALOG_ITEMS.filter(i => Array.isArray(i.category) && i.category.includes(cat));
    if (items.length === 0) return;

    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-section-header';

    const title = document.createElement('div');
    title.className = 'category-section-title';
    if (CATEGORY_ICONS[cat]) {
      const icon = document.createElement('img');
      icon.src = CATEGORY_ICONS[cat];
      icon.alt = '';
      title.appendChild(icon);
    }
    title.appendChild(document.createTextNode(cat));
    header.appendChild(title);

    const verTodo = document.createElement('button');
    verTodo.className = 'ver-todo-btn';
    verTodo.textContent = 'Ver todo';
    verTodo.addEventListener('click', () => {
      currentCategories = new Set([cat]);
      renderCategoryBar();
      applyFilter();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    header.appendChild(verTodo);

    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'category-section-list';
    items.slice(0, 3).forEach(item => list.appendChild(renderPreviewRow(item)));
    section.appendChild(list);

    categorySections.appendChild(section);
  });
}

function renderPinnedRow() {
  if (!pinnedRow) return;
  pinnedRow.innerHTML = '';
  PINNED_ITEMS.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <span class="pin-flag">Fijado</span>
      <div class="card-photo-wrap">
        <img src="images/${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-price">${escapeHtml(item.price)}</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(item));
    pinnedRow.appendChild(card);
  });
}

function renderGrid(items) {
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-photo-wrap">
        <img src="images/${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-price">${escapeHtml(item.price)}</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(item));
    grid.appendChild(card);
  });
  emptyState.hidden = items.length > 0;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateCount(n) {
  itemCount.textContent = n === CATALOG_ITEMS.length
    ? `${n} productos`
    : `${n} de ${CATALOG_ITEMS.length} productos`;
}

function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  const showSections = currentCategories.size === 0 && !q;

  if (showSections) {
    categorySections.hidden = false;
    grid.hidden = true;
    emptyState.hidden = true;
    renderSections();
    updateCount(CATALOG_ITEMS.length);
    return;
  }

  categorySections.hidden = true;
  grid.hidden = false;

  let filtered = CATALOG_ITEMS;
  if (currentCategories.size > 0) {
    filtered = filtered.filter(i => Array.isArray(i.category) && [...currentCategories].every(c => i.category.includes(c)));
  }
  if (q) {
    if (q.startsWith('#')) {
      const codeQuery = q.slice(1).trim();
      filtered = filtered.filter(i => i.code && i.code.toLowerCase().includes(codeQuery));
    } else {
      filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
  }
  renderGrid(filtered);
  updateCount(filtered.length);
}

searchInput.addEventListener('input', applyFilter);

function openModal(item) {
  currentItem = item;
  currentPhotoIndex = 0;
  modalCategory.textContent = Array.isArray(item.category) ? item.category.join(' · ') : (item.category || '');
  modalTitle.textContent = item.title;
  modalPrice.textContent = item.price;
  if (item.code) {
    modalCode.textContent = `Código: ${item.code}`;
    modalCode.hidden = false;
  } else {
    modalCode.hidden = true;
  }
  modalDesc.textContent = item.description;
  const directUrl = `${location.origin}${location.pathname}#producto-${item.id}`;
  const codeText = item.code ? ` (Código: ${item.code})` : '';
  const msg = encodeURIComponent(`Hola! Te consulto por: ${item.title}${codeText}\n${directUrl}`);
  modalWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  renderDots();
  showPhoto(0);
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  history.replaceState(null, '', `#producto-${item.id}`);
}

function closeModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
  if (location.hash.startsWith('#producto-')) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

function renderDots() {
  galleryDots.innerHTML = '';
  currentItem.photos.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === currentPhotoIndex) dot.classList.add('active');
    galleryDots.appendChild(dot);
  });
}

function showPhoto(i) {
  const photos = currentItem.photos;
  currentPhotoIndex = (i + photos.length) % photos.length;
  modalImage.src = `images/${photos[currentPhotoIndex]}`;
  modalImage.alt = currentItem.title;
  [...galleryDots.children].forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentPhotoIndex);
  });
}

galleryPrev.addEventListener('click', () => showPhoto(currentPhotoIndex - 1));
galleryNext.addEventListener('click', () => showPhoto(currentPhotoIndex + 1));
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (modalOverlay.hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') showPhoto(currentPhotoIndex - 1);
  if (e.key === 'ArrowRight') showPhoto(currentPhotoIndex + 1);
});

function openAbout() {
  aboutOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeAbout() {
  aboutOverlay.hidden = true;
  document.body.style.overflow = '';
}

aboutBtn.addEventListener('click', openAbout);
aboutModalClose.addEventListener('click', closeAbout);
aboutOverlay.addEventListener('click', (e) => {
  if (e.target === aboutOverlay) closeAbout();
});
document.addEventListener('keydown', (e) => {
  if (aboutOverlay.hidden) return;
  if (e.key === 'Escape') closeAbout();
});

function openBuy() {
  buyOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeBuy() {
  buyOverlay.hidden = true;
  document.body.style.overflow = '';
}

buyBtn.addEventListener('click', openBuy);
buyModalClose.addEventListener('click', closeBuy);
buyOverlay.addEventListener('click', (e) => {
  if (e.target === buyOverlay) closeBuy();
});
document.addEventListener('keydown', (e) => {
  if (buyOverlay.hidden) return;
  if (e.key === 'Escape') closeBuy();
});

function openFromHash() {
  const m = location.hash.match(/^#producto-(\d+)$/);
  if (!m) return;
  const id = Number(m[1]);
  const item = ITEMS.find(i => i.id === id);
  if (item) openModal(item);
}

window.addEventListener('hashchange', openFromHash);

// init
renderPinnedRow();
renderCategoryBar();
applyFilter();
openFromHash();
