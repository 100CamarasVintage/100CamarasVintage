const WHATSAPP_NUMBER = "5491166553748";

const grid = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const itemCount = document.getElementById('itemCount');
const emptyState = document.getElementById('emptyState');
const categoryBar = document.getElementById('categoryBar');

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

let currentItem = null;
let currentPhotoIndex = 0;
let currentCategories = new Set(); // vacio = 'Todas'

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

function renderCategoryBar() {
  const categories = ['Todas', ...CATEGORY_ORDER];
  categoryBar.innerHTML = '';
  categories.forEach(cat => {
    const isActive = cat === 'Todas' ? currentCategories.size === 0 : currentCategories.has(cat);
    const btn = document.createElement('button');
    btn.className = 'category-pill' + (isActive ? ' active' : '');
    btn.textContent = cat;
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
  itemCount.textContent = n === ITEMS.length
    ? `${n} productos`
    : `${n} de ${ITEMS.length} productos`;
}

function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  let filtered = ITEMS;
  if (currentCategories.size > 0) {
    filtered = filtered.filter(i => Array.isArray(i.category) && [...currentCategories].every(c => i.category.includes(c)));
  }
  if (q) {
    filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
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
  const msg = encodeURIComponent(`Hola! Te consulto por: ${item.title}`);
  modalWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  renderDots();
  showPhoto(0);
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
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

// init
renderCategoryBar();
renderGrid(ITEMS);
updateCount(ITEMS.length);
