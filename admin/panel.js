/* Panel visual de 100 Cámaras Vintage
 * Se ve igual que la web. Los cambios quedan "pendientes" hasta que se toca
 * "Publicar en la web": ahí se guardan todos juntos en un solo paso (un solo
 * commit en GitHub vía Netlify Git Gateway) y la web se actualiza sola.
 */
(function () {
  'use strict';

  var DEMO = ['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1;
  var API = '/.netlify/git/github';
  var BRANCH = 'main';
  var SNAP_KEY = 'panel100_ultima_publicacion';

  var FOOTER = 'Estamos en Cramer y Monroe BELGRANO CABA, donde podes pasar a retirar y probar las camaras\nTambién hacemos envios';

  var STYLE_ORDER = ['Nuevos ingresos', 'Cámaras analógicas', 'Cámaras point and shoot', 'Cámaras digitales',
    'Cámaras nuevas en caja sin uso', 'Lentes', 'Flashes', 'Raras/coleccionables', 'TLR', 'Micro 4/3',
    'Cámaras de fuelle', 'Filmadoras a cuerda', 'Otros', 'Para deco o restauración'];
  var BRAND_ORDER = ['Nikon', 'Canon', 'Pentax', 'Olympus', 'Yashica', 'Fuji', 'Soviéticas', 'Minolta', 'Kodak', 'Sony'];
  var ICONS = {
    'Nuevos ingresos': 'icon-nuevoingresos.png', 'Cámaras analógicas': 'icon-reflex.png',
    'Cámaras point and shoot': 'icon-compacta.png', 'Cámaras digitales': 'icon-digitales.png',
    'Cámaras nuevas en caja sin uso': 'icon-cajasinuso.png', 'Lentes': 'icon-lentes.png', 'Flashes': 'icon-flash.png',
    'Raras/coleccionables': 'icon-raras.png', 'TLR': 'icon-tlr.png', 'Micro 4/3': 'icon-micro43.png',
    'Cámaras de fuelle': 'icon-fuelles.png', 'Filmadoras a cuerda': 'icon-acuerda.png', 'Otros': 'icon-tripode.png',
    'Para deco o restauración': 'icon-decoyrestauracion.png'
  };
  var KNOWN = ['id', 'title', 'price', 'hidden', 'category', 'code', 'description', 'photos', 'thumb'];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- Estado ---------------- */
  var items = [];             // todos los productos (incluye ocultos), en el orden de la web
  var baseline = {};          // id -> firma del producto como está publicado
  var baseOrder = [];         // ids en el orden publicado
  var pending = {};           // nombre de foto nueva -> { b64, url }
  var cats = {};              // categorías seleccionadas
  var onlyHidden = false;
  var orderMode = false;
  var booted = false;
  var ed = null;              // estado del editor abierto

  /* ---------------- Utilidades de datos ---------------- */
  function clean(it) {
    var o = { id: it.id, title: it.title || '', price: it.price || '', hidden: !!it.hidden };
    Object.keys(it).forEach(function (k) {
      if (k.charAt(0) !== '_' && KNOWN.indexOf(k) === -1) o[k] = it[k];
    });
    var photos = (it.photos || []).slice();
    o.category = (it.category || []).slice();
    o.code = it.code || '';
    o.description = it.description || '';
    o.photos = photos;
    o.thumb = it.thumb || photos[0] || '';
    return o;
  }
  function sig(it) { return JSON.stringify(clean(it)); }
  function isDirty(it) { return !!it._new || baseline[it.id] !== sig(it); }
  function orderDirty() { return items.map(function (i) { return i.id; }).join() !== baseOrder.join(); }
  function dirtyItems() { return items.filter(isDirty); }
  function imgUrl(name) {
    if (!name) return '';
    if (pending[name]) return pending[name].url;
    return '/images/' + name;
  }
  function setBaseline() {
    baseline = {};
    items.forEach(function (it) { baseline[it.id] = sig(it); delete it._new; });
    baseOrder = items.map(function (i) { return i.id; });
  }
  function nextCode() {
    var max = 0;
    items.forEach(function (i) { var n = parseInt(i.code, 10); if (!isNaN(n) && n > max && n < 100000) max = n; });
    return String(max + 1);
  }
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }

  /* ---------------- Carga ---------------- */
  function loadData() {
    return fetch('todos.json?t=' + Date.now()).then(function (r) {
      if (!r.ok) throw new Error('No se pudo leer todos.json (' + r.status + ')');
      return r.json();
    }).then(function (list) {
      // Si publicaste hace poco y la web todavía se está actualizando, usamos tu última versión.
      try {
        var snap = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null');
        if (snap && Date.now() - snap.ts < 10 * 60 * 1000 && snap.items && snap.items.length) list = snap.items;
      } catch (e) { /* sin snapshot */ }
      items = list;
      setBaseline();
    });
  }

  /* ---------------- Barras de categorías ---------------- */
  function pill(cat, active, onClick) {
    var b = document.createElement('button');
    b.className = 'category-pill' + (active ? ' active' : '');
    b.type = 'button';
    if (ICONS[cat]) {
      var im = document.createElement('img');
      im.src = '/images/brand/' + ICONS[cat]; im.alt = ''; im.className = 'category-icon';
      b.appendChild(im);
    }
    b.appendChild(document.createTextNode(cat));
    b.addEventListener('click', onClick);
    return b;
  }
  function fillBar(bar, list, withAll) {
    bar.innerHTML = '';
    if (withAll) {
      bar.appendChild(pill('Todas', Object.keys(cats).length === 0 && !onlyHidden, function () {
        cats = {}; onlyHidden = false; renderAll();
      }));
    }
    list.forEach(function (c) {
      bar.appendChild(pill(c, !!cats[c], function () {
        if (cats[c]) delete cats[c]; else cats[c] = true;
        renderAll();
      }));
    });
  }

  /* ---------------- Filtro y grilla ---------------- */
  function visible() {
    var q = $('#searchInput').value.trim().toLowerCase();
    var sel = Object.keys(cats);
    return items.filter(function (i) {
      if (onlyHidden && !i.hidden) return false;
      if (sel.length && !sel.every(function (c) { return (i.category || []).indexOf(c) !== -1; })) return false;
      if (q) {
        if (/^\d+$/.test(q)) return (i.code || '').trim() === q;
        if (q.charAt(0) === '#') return (i.code || '').toLowerCase().indexOf(q.slice(1).trim()) !== -1;
        return (i.title || '').toLowerCase().indexOf(q) !== -1 || (i.description || '').toLowerCase().indexOf(q) !== -1;
      }
      return true;
    });
  }

  function cardHtml(it, pos) {
    var dirty = isDirty(it);
    return '<div class="card-photo-wrap">' +
      '<img src="' + esc(imgUrl(it.thumb || (it.photos || [])[0])) + '" alt="" loading="lazy" draggable="false">' +
      (it.hidden ? '<span class="pbadge hid">OCULTA</span>' : '') +
      (it.pinned ? '<span class="pbadge pin">FIJA</span>' : '') +
      (it.code ? '<span class="pbadge code">#' + esc(it.code) + '</span>' : '') +
      (orderMode && pos ? '<span class="pbadge pos">' + pos + '</span>' : '') +
      (dirty ? '<span class="pbadge chg">' + (it._new ? 'NUEVO' : 'cambiado') + '</span>' : '') +
      '</div>' +
      '<div class="card-body"><div class="card-title">' + esc(it.title) + '</div>' +
      '<div class="card-price">' + esc(it.price) + '</div>' +
      (orderMode ? '<div class="pcard-order">' +
        '<button type="button" data-act="prev" title="Un lugar antes">←</button>' +
        '<button type="button" data-act="goto" title="Mandar a un lugar exacto">Lugar</button>' +
        '<button type="button" data-act="next" title="Un lugar después">→</button></div>' : '') +
      '</div>';
  }

  function renderGrid() {
    var grid = $('#grid');
    var vis = visible();
    grid.className = 'grid pgrid' + (orderMode ? ' ordering' : '');
    grid.innerHTML = '';
    vis.forEach(function (it, ix) {
      var c = document.createElement('div');
      c.className = 'card pcard' + (it.hidden ? ' is-hidden' : '');
      c.dataset.id = it.id;
      c.innerHTML = cardHtml(it, ix + 1);
      grid.appendChild(c);
    });
    $('#emptyState').hidden = vis.length > 0;
    var sel = Object.keys(cats);
    var txt = vis.length + (vis.length === 1 ? ' producto' : ' productos');
    if (vis.length !== items.length) txt += ' de ' + items.length;
    $('#countTxt').textContent = txt;

    var banner = $('#orderBanner');
    banner.hidden = !orderMode;
    if (orderMode) {
      $('#orderBannerTxt').textContent = sel.length
        ? 'Acomodando «' + sel.join(' + ') + '». Arrastrá cada cámara (en el celu, mantené apretado) o tocá «Lugar» para mandarla directo a una posición.'
        : 'Acomodando todo el catálogo. Arrastrá cada cámara (en el celu, mantené apretado) o tocá «Lugar» para mandarla directo a una posición. Para ordenar dentro de una carpeta, elegí primero la categoría arriba.';
    }
  }

  function renderBars() {
    fillBar($('#categoryBar'), STYLE_ORDER, true);
    fillBar($('#brandBar'), BRAND_ORDER, false);
  }

  function renderStatus() {
    var d = dirtyItems().length;
    var od = orderDirty();
    var n = d + (od ? 1 : 0);
    var b = $('#publishBtn');
    b.disabled = n === 0;
    $('#publishCount').textContent = n ? '(' + n + ')' : '';
    $('#orderBtn').classList.toggle('on', orderMode);
    $('#orderBtn').textContent = orderMode ? '✓ Terminé de acomodar' : '↕ Acomodar';
    $('#hiddenBtn').classList.toggle('on', onlyHidden);
  }

  function renderAll() {
    renderBars();
    renderGrid();
    renderStatus();
  }

  /* ---------------- Reordenar ---------------- */
  // Reacomoda sólo los lugares que ocupan los productos visibles, así el resto no se mueve.
  function applyVisibleOrder(newVis) {
    var set = {};
    newVis.forEach(function (id) { set[id] = true; });
    var byId = {};
    items.forEach(function (i) { byId[i.id] = i; });
    var pos = [];
    items.forEach(function (it, idx) { if (set[it.id]) pos.push(idx); });
    if (pos.length !== newVis.length) return;
    var next = items.slice();
    pos.forEach(function (p, k) { next[p] = byId[newVis[k]]; });
    items = next;
  }
  function visIds() { return visible().map(function (i) { return i.id; }); }

  function moveCard(id, act) {
    var v = visIds();
    var i = v.indexOf(id);
    if (i === -1) return;
    var nv = v.slice();
    nv.splice(i, 1);
    if (act === 'first') nv.unshift(id);
    else if (act === 'prev') nv.splice(Math.max(0, i - 1), 0, id);
    else if (act === 'next') nv.splice(Math.min(nv.length, i + 1), 0, id);
    applyVisibleOrder(nv);
    var y = window.scrollY;
    renderGrid(); renderStatus();
    window.scrollTo(0, y);
  }

  function moveTo(id, pos) {
    var v = visIds();
    var i = v.indexOf(id);
    if (i === -1) return;
    var nv = v.slice();
    nv.splice(i, 1);
    pos = Math.max(1, Math.min(nv.length + 1, Math.round(pos) || 1));
    nv.splice(pos - 1, 0, id);
    applyVisibleOrder(nv);
    renderGrid(); renderStatus();
    var card = document.querySelector('#grid .pcard[data-id="' + id + '"]');
    if (card) {
      card.scrollIntoView({ block: 'center' });
      card.classList.add('just-moved');
      setTimeout(function () { card.classList.remove('just-moved'); }, 1800);
    }
    toast('Quedó en el lugar ' + pos + ' de ' + (nv.length + 1));
  }
  function openGoto(id) {
    var v = visIds();
    var it = items.filter(function (i) { return i.id === id; })[0];
    if (!it) return;
    var cur = v.indexOf(id) + 1;
    $('#posBody').innerHTML =
      '<h2>Mover a otro lugar</h2>' +
      '<p class="pub-lead"><b>' + esc(it.title) + '</b><br>Ahora está en el lugar <b>' + cur + '</b> de ' + v.length + '.</p>' +
      '<label class="f-label" for="posNum">¿A qué lugar lo mandás? <small>(1 = primero, ' + v.length + ' = último)</small></label>' +
      '<input class="f-input" id="posNum" type="number" inputmode="numeric" min="1" max="' + v.length + '" value="' + cur + '">' +
      '<div class="ed-actions">' +
      '<button type="button" class="btn ghost" data-pos="cancel">Cancelar</button>' +
      '<button type="button" class="btn ghost" data-pos="first">Al principio</button>' +
      '<button type="button" class="btn ghost" data-pos="last">Al final</button>' +
      '<button type="button" class="btn primary" data-pos="ok">Mover</button></div>';
    $('#posOverlay').hidden = false;
    $('#posOverlay').dataset.id = id;
    setTimeout(function () { var n = $('#posNum'); if (n) { n.focus(); n.select(); } }, 50);
  }
  function closeGoto() { $('#posOverlay').hidden = true; }
  function doGoto(kind) {
    var id = Number($('#posOverlay').dataset.id);
    var n = visIds().length;
    var pos = kind === 'first' ? 1 : kind === 'last' ? n : Number($('#posNum').value);
    if (kind === 'ok' && !(pos >= 1)) { toast('Poné un número de lugar'); return; }
    closeGoto();
    moveTo(id, pos);
  }

  /* Arrastrar y soltar (ratón y dedo), sin librerías */
  var drag = null;
  function cardFromPoint(x, y) {
    if (drag && drag.ghost) drag.ghost.style.display = 'none';
    var el = document.elementFromPoint(x, y);
    if (drag && drag.ghost) drag.ghost.style.display = '';
    return el && el.closest ? el.closest('.pcard') : null;
  }
  function startDrag(card, x, y) {
    var r = card.getBoundingClientRect();
    var ghost = card.cloneNode(true);
    ghost.className = 'card pcard drag-ghost';
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    document.body.appendChild(ghost);
    drag = { card: card, ghost: ghost, dx: x - r.left, dy: y - r.top, auto: 0, x: x, y: y };
    card.classList.add('drag-src');
    document.body.classList.add('is-dragging');
    moveDrag(x, y);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { /* nada */ }
    drag.raf = requestAnimationFrame(autoScroll);
  }
  function moveDrag(x, y) {
    if (!drag) return;
    drag.x = x; drag.y = y;
    drag.ghost.style.left = (x - drag.dx) + 'px';
    drag.ghost.style.top = (y - drag.dy) + 'px';
    var over = cardFromPoint(x, y);
    if (over && over !== drag.card) {
      var r = over.getBoundingClientRect();
      var after = (y - r.top) / r.height > 0.5 && (x - r.left) / r.width > 0.3 || (y - r.top) / r.height > 0.75;
      var grid = $('#grid');
      if (after) grid.insertBefore(drag.card, over.nextSibling); else grid.insertBefore(drag.card, over);
    }
    var h = window.innerHeight, edge = 90;
    drag.auto = y < edge + 110 ? -Math.ceil((edge + 110 - y) / 6) : (y > h - edge ? Math.ceil((y - (h - edge)) / 6) : 0);
  }
  function autoScroll() {
    if (!drag) return;
    if (drag.auto) { window.scrollBy(0, drag.auto); moveDrag(drag.x, drag.y); }
    drag.raf = requestAnimationFrame(autoScroll);
  }
  function endDrag() {
    if (!drag) return;
    cancelAnimationFrame(drag.raf);
    drag.ghost.remove();
    drag.card.classList.remove('drag-src');
    document.body.classList.remove('is-dragging');
    drag = null;
    var nv = [].slice.call($('#grid').children).map(function (c) { return Number(c.dataset.id); });
    applyVisibleOrder(nv);
    renderGrid(); renderStatus();
  }
  function setupDrag() {
    var grid = $('#grid');
    var press = null;
    function cancelPress() { if (press) { clearTimeout(press.t); press = null; } }

    grid.addEventListener('mousedown', function (e) {
      if (!orderMode || e.button !== 0 || e.target.closest('button')) return;
      var card = e.target.closest('.pcard');
      if (!card) return;
      e.preventDefault();
      press = { card: card, x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mousemove', function (e) {
      if (drag) { e.preventDefault(); moveDrag(e.clientX, e.clientY); return; }
      if (press && Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) > 5) {
        var p = press; press = null; startDrag(p.card, p.x, p.y); moveDrag(e.clientX, e.clientY);
      }
    });
    window.addEventListener('mouseup', function () { press = null; if (drag) endDrag(); });

    grid.addEventListener('touchstart', function (e) {
      if (!orderMode || e.target.closest('button')) return;
      var card = e.target.closest('.pcard');
      if (!card || e.touches.length !== 1) return;
      var t = e.touches[0];
      cancelPress();
      press = { card: card, x: t.clientX, y: t.clientY };
      press.t = setTimeout(function () {
        var p = press; press = null;
        if (p) startDrag(p.card, p.x, p.y);
      }, 260);
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (drag) { e.preventDefault(); moveDrag(t.clientX, t.clientY); return; }
      if (press && Math.abs(t.clientX - press.x) + Math.abs(t.clientY - press.y) > 9) cancelPress();
    }, { passive: false });
    function touchEnd() { cancelPress(); if (drag) endDrag(); }
    window.addEventListener('touchend', touchEnd);
    window.addEventListener('touchcancel', touchEnd);
    grid.addEventListener('contextmenu', function (e) { if (orderMode) e.preventDefault(); });
  }

  /* ---------------- Editor de producto ---------------- */
  function openEditor(id) {
    var src, isNew = false;
    if (id === 'new') {
      isNew = true;
      var nid = Date.now();
      src = {
        id: nid, title: '', price: '', hidden: false, category: ['Nuevos ingresos'],
        code: nextCode(), description: 'Estado: Buen estado general y funcional\n\n' + FOOTER,
        photos: [], thumb: '', _file: 'producto-' + nid + '.json', _new: true
      };
    } else {
      src = items.filter(function (i) { return i.id === id; })[0];
      if (!src) return;
    }
    ed = {
      isNew: isNew, id: src.id, file: src._file,
      data: clean(src), origThumb: src.thumb || '', origFirst: (src.photos || [])[0] || '',
      extra: {}
    };
    Object.keys(src).forEach(function (k) {
      if (k.charAt(0) === '_' && k !== '_new') ed.extra[k] = src[k];
    });
    drawEditor();
    $('#editOverlay').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function drawEditor() {
    var d = ed.data;
    var h = '';
    h += '<h2>' + (ed.isNew ? 'Producto nuevo' : 'Editar producto') + '</h2>';
    h += '<div class="f-label">Fotos <small>(la primera es la portada)</small></div><div class="ed-photos" id="edPhotos">';
    d.photos.forEach(function (p, i) {
      h += '<div class="ed-ph' + (i === 0 ? ' cover' : '') + '" data-i="' + i + '">' +
        '<img src="' + esc(imgUrl(p)) + '" alt="">' +
        (i === 0 ? '<span class="cover-tag">PORTADA</span>' : '') +
        '<div class="ph-btns">' +
        (i > 0 ? '<button type="button" data-ph="cover" title="Hacer portada">★</button>' : '') +
        (i > 0 ? '<button type="button" data-ph="left" title="Mover a la izquierda">←</button>' : '') +
        (i < d.photos.length - 1 ? '<button type="button" data-ph="right" title="Mover a la derecha">→</button>' : '') +
        '<button type="button" data-ph="del" title="Sacar foto">✕</button></div></div>';
    });
    h += '<label class="ed-add"><input type="file" id="edFiles" accept="image/*" multiple hidden><span>＋</span>Agregar fotos</label></div>';

    h += '<label class="f-label" for="edTitle">Título</label><input id="edTitle" class="f-input" value="' + esc(d.title) + '">';
    h += '<div class="f-row"><div><label class="f-label" for="edPrice">Precio <small>(ej: $120.000 o Consultar)</small></label>' +
      '<input id="edPrice" class="f-input" value="' + esc(d.price) + '"></div>' +
      '<div><label class="f-label" for="edCode">Código</label><input id="edCode" class="f-input" value="' + esc(d.code) + '"></div></div>';
    h += '<label class="f-switch"><input type="checkbox" id="edHidden"' + (d.hidden ? ' checked' : '') + '>' +
      '<span class="sw"></span><span><b>Oculta / vendida</b><small>No se muestra en la web, pero no se borra. Destildá para que vuelva a aparecer.</small></span></label>';
    h += '<div class="f-label">Categorías <small>(tocá para tildar varias)</small></div><div class="ed-cats" id="edCats"></div>';
    h += '<label class="f-label" for="edDesc">Descripción</label><textarea id="edDesc" class="f-input" rows="12">' + esc(d.description) + '</textarea>';
    h += '<div class="ed-small"><button type="button" class="link-btn" id="edFooterBtn">Agregar el texto final de la web (Cramer y Monroe…)</button></div>';
    h += '<div class="ed-actions">' +
      '<button type="button" class="btn ghost" id="edCancel">Cancelar</button>' +
      (!ed.isNew && isDirtyId(ed.id) ? '<button type="button" class="btn ghost" id="edRevert">Deshacer mis cambios</button>' : '') +
      '<button type="button" class="btn primary" id="edSave">Guardar</button></div>';
    $('#editBody').innerHTML = h;

    var cb = $('#edCats');
    STYLE_ORDER.concat(BRAND_ORDER).forEach(function (c) {
      var brand = BRAND_ORDER.indexOf(c) !== -1;
      var b = pill(c, d.category.indexOf(c) !== -1, function () {
        var i = d.category.indexOf(c);
        if (i === -1) d.category.push(c); else d.category.splice(i, 1);
        b.classList.toggle('active');
      });
      if (brand) b.classList.add('brandpill');
      cb.appendChild(b);
    });
  }
  function isDirtyId(id) { var it = items.filter(function (i) { return i.id === id; })[0]; return it && isDirty(it); }

  function readEditorFields() {
    var d = ed.data;
    d.title = $('#edTitle').value.trim();
    d.price = $('#edPrice').value.trim();
    d.code = $('#edCode').value.trim();
    d.hidden = $('#edHidden').checked;
    d.description = $('#edDesc').value;
  }

  function closeEditor() {
    $('#editOverlay').hidden = true;
    document.body.style.overflow = '';
    ed = null;
  }

  function saveEditor() {
    readEditorFields();
    var d = ed.data;
    if (!d.title) { toast('Falta el título'); $('#edTitle').focus(); return; }
    if (!d.price) { toast('Falta el precio (podés poner «Consultar»)'); $('#edPrice').focus(); return; }
    if (!d.photos.length) { toast('Agregá al menos una foto'); return; }
    if (ed.isNew && d.description.indexOf(d.title) !== 0) d.description = d.title + '\n\n' + d.description;
    var thumb = d.photos[0] !== ed.origFirst ? d.photos[0] : (d.photos.indexOf(ed.origThumb) !== -1 ? ed.origThumb : d.photos[0]);
    var it = clean(d);
    it.thumb = thumb;
    it._file = ed.file;
    Object.keys(ed.extra).forEach(function (k) { it[k] = ed.extra[k]; });
    if (ed.isNew) {
      it._new = true;
      items.unshift(it);
    } else {
      for (var i = 0; i < items.length; i++) if (items[i].id === ed.id) { it._new = items[i]._new; items[i] = it; break; }
    }
    closeEditor();
    renderAll();
    toast('Guardado en el panel. Cuando termines tocá «Publicar en la web».', 4200);
  }

  function revertEditor() {
    var id = ed.id;
    try {
      var o = JSON.parse(baseline[id]);
      for (var i = 0; i < items.length; i++) if (items[i].id === id) {
        var keep = items[i]._file;
        items[i] = o; items[i]._file = keep;
      }
    } catch (e) { return; }
    closeEditor();
    renderAll();
    toast('Volvió a como está publicado.');
  }

  // Foto -> JPG de hasta 1600px
  function fileToJpg(file) {
    return new Promise(function (resolve, reject) {
      var rd = new FileReader();
      rd.onerror = reject;
      rd.onload = function () {
        var im = new Image();
        im.onerror = reject;
        im.onload = function () {
          var max = 1600, w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * s); c.height = Math.round(h * s);
          var g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(im, 0, 0, c.width, c.height);
          var url = c.toDataURL('image/jpeg', 0.86);
          resolve({ url: url, b64: url.split(',')[1] });
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  function addFiles(files) {
    readEditorFields();
    var list = [].slice.call(files);
    var n = 0;
    function next() {
      if (!list.length) { drawEditor(); return; }
      var f = list.shift();
      fileToJpg(f).then(function (r) {
        var k = ed.data.photos.length + 1, name;
        do { name = 'producto-' + ed.id + '-' + String(k).padStart(2, '0') + '.jpg'; k++; }
        while (pending[name] || ed.data.photos.indexOf(name) !== -1 || (!ed.isNew && usedByAnyone(name)));
        pending[name] = r;
        ed.data.photos.push(name);
        n++;
        next();
      }).catch(function () { toast('No pude leer una de las fotos'); next(); });
    }
    toast('Preparando fotos…', 2000);
    next();
  }
  function usedByAnyone(name) {
    return items.some(function (i) { return (i.photos || []).indexOf(name) !== -1; });
  }

  /* ---------------- Publicar ---------------- */
  function buildFiles() {
    var files = [], used = {};
    var dirty = dirtyItems();
    dirty.forEach(function (it) {
      var c = clean(it);
      (c.photos || []).forEach(function (p) { used[p] = true; });
      Object.keys(it).forEach(function (k) { if (k === '_file') return; });
      files.push({ path: 'content/productos/' + it._file, text: JSON.stringify(c, null, 2) + '\n', label: 'producto: ' + c.title });
    });
    Object.keys(used).forEach(function (n) {
      if (pending[n]) files.push({ path: 'images/' + n, b64: pending[n].b64, label: 'foto: ' + n });
    });
    if (orderDirty()) {
      files.push({
        path: 'content/orden.json',
        text: JSON.stringify({ items: items.map(function (i) { return { producto: i.id }; }) }, null, 2) + '\n',
        label: 'orden del catálogo'
      });
    }
    return files;
  }

  function token() {
    var u = window.netlifyIdentity && window.netlifyIdentity.currentUser();
    if (!u) return Promise.reject(new Error('Tenés que iniciar sesión de nuevo.'));
    return u.jwt();
  }
  function gh(path, opts) {
    return token().then(function (tok) {
      opts = opts || {};
      opts.headers = Object.assign({ Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, opts.headers || {});
      return fetch(API + path, opts).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('GitHub respondió ' + r.status + ' ' + t.slice(0, 200)); });
        return r.json();
      });
    });
  }

  function commitFiles(files, message, progress) {
    var blobs = [];
    var chain = Promise.resolve();
    files.forEach(function (f, i) {
      chain = chain.then(function () {
        progress('Subiendo ' + (i + 1) + ' de ' + files.length + '…');
        return gh('/git/blobs', {
          method: 'POST',
          body: JSON.stringify(f.b64 ? { content: f.b64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' })
        }).then(function (b) { blobs.push({ path: f.path, mode: '100644', type: 'blob', sha: b.sha }); });
      });
    });
    function attempt(n) {
      progress('Guardando en GitHub…');
      return gh('/branches/' + BRANCH).then(function (br) {
        var head = br.commit.sha, tree = br.commit.commit.tree.sha;
        return gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: tree, tree: blobs }) })
          .then(function (t) {
            return gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: message, tree: t.sha, parents: [head] }) });
          })
          .then(function (c) {
            return gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: JSON.stringify({ sha: c.sha, force: false }) });
          });
      }).catch(function (e) {
        if (n < 2) return attempt(n + 1);
        throw e;
      });
    }
    return chain.then(function () { return attempt(1); });
  }

  function openPublish() {
    var files = buildFiles();
    if (!files.length) return;
    var d = dirtyItems();
    var h = '<h2>Publicar en la web</h2>';
    h += '<p class="pub-lead">Esto es lo que se va a actualizar:</p><ul class="pub-list">';
    d.forEach(function (it) { h += '<li>' + (it._new ? '🆕 ' : '✏️ ') + esc(it.title) + '</li>'; });
    var imgs = files.filter(function (f) { return f.b64; }).length;
    if (imgs) h += '<li>📷 ' + imgs + (imgs === 1 ? ' foto nueva' : ' fotos nuevas') + '</li>';
    if (orderDirty()) h += '<li>↕ El nuevo orden del catálogo</li>';
    h += '</ul><div id="pubMsg" class="pub-msg" hidden></div>';
    h += '<div class="ed-actions"><button type="button" class="btn ghost" id="pubCancel">Cancelar</button>' +
      '<button type="button" class="btn primary" id="pubGo">Publicar ahora</button></div>';
    $('#pubBody').innerHTML = h;
    $('#pubOverlay').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closePublish() { $('#pubOverlay').hidden = true; document.body.style.overflow = ''; }

  function doPublish() {
    var files = buildFiles();
    var msg = $('#pubMsg');
    var go = $('#pubGo'), cancel = $('#pubCancel');
    go.disabled = true; cancel.disabled = true;
    msg.hidden = false; msg.className = 'pub-msg';
    function progress(t) { msg.textContent = t; }
    var n = dirtyItems().length;
    var message = 'Panel: ' + (n ? n + (n === 1 ? ' producto' : ' productos') : '') + (orderDirty() ? (n ? ' + orden' : 'orden del catálogo') : '');
    var p;
    if (DEMO) {
      console.log('MODO PRUEBA — se commitearía:', files.map(function (f) { return f.path + (f.b64 ? ' (' + f.b64.length + ' b64)' : ''); }), message);
      window.__lastPlan = files.map(function (f) { return { path: f.path, text: f.text, b64len: f.b64 ? f.b64.length : 0 }; });
      p = new Promise(function (r) { setTimeout(r, 600); });
    } else {
      p = commitFiles(files, message, progress);
    }
    p.then(function () {
      try {
        localStorage.setItem(SNAP_KEY, JSON.stringify({ ts: Date.now(), items: items.map(function (i) { var c = clean(i); c._file = i._file; return c; }) }));
      } catch (e) { /* no pasa nada */ }
      setBaseline();
      pending = {};
      renderAll();
      msg.className = 'pub-msg ok';
      msg.innerHTML = '<b>¡Listo!</b> Los cambios ya están guardados. La web se actualiza sola en 1 o 2 minutos.' +
        '<br><small>Si ves que no cambia, revisá en Netlify que los deploys no estén frenados.</small>' + (DEMO ? '<br><small>(Modo prueba: no se envió nada de verdad.)</small>' : '');
      go.hidden = true; cancel.disabled = false; cancel.textContent = 'Cerrar';
    }).catch(function (e) {
      console.error(e);
      msg.className = 'pub-msg err';
      msg.textContent = 'No se pudo publicar: ' + (e && e.message ? e.message : e) + ' — No se perdió nada, tus cambios siguen acá. Probá de nuevo.';
      go.disabled = false; cancel.disabled = false;
    });
  }

  /* ---------------- Arranque ---------------- */
  function bindUi() {
    $('#searchInput').addEventListener('input', function () { renderGrid(); });
    $('#orderBtn').addEventListener('click', function () { orderMode = !orderMode; renderAll(); });
    $('#hiddenBtn').addEventListener('click', function () { onlyHidden = !onlyHidden; renderAll(); });
    $('#newBtn').addEventListener('click', function () { openEditor('new'); });
    $('#publishBtn').addEventListener('click', openPublish);
    $('#logoutBtn').addEventListener('click', function () {
      if (window.netlifyIdentity && window.netlifyIdentity.currentUser()) window.netlifyIdentity.logout(); else location.reload();
    });

    $('#grid').addEventListener('click', function (e) {
      var card = e.target.closest('.pcard');
      if (!card) return;
      var id = Number(card.dataset.id);
      var b = e.target.closest('button[data-act]');
      if (b) { e.stopPropagation(); if (b.dataset.act === 'goto') openGoto(id); else moveCard(id, b.dataset.act); return; }
      if (orderMode) return;
      openEditor(id);
    });

    $('#posOverlay').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pos]');
      if (b) { if (b.dataset.pos === 'cancel') closeGoto(); else doGoto(b.dataset.pos); return; }
      if (e.target === $('#posOverlay')) closeGoto();
    });
    $('#posOverlay').addEventListener('keydown', function (e) { if (e.key === 'Enter') doGoto('ok'); if (e.key === 'Escape') closeGoto(); });

    $('#editOverlay').addEventListener('click', function (e) {
      if (e.target === $('#editOverlay')) { if (confirmClose()) closeEditor(); }
    });
    $('#editBody').addEventListener('click', function (e) {
      var t = e.target;
      var pb = t.closest('button[data-ph]');
      if (pb) {
        readEditorFields();
        var i = Number(pb.closest('.ed-ph').dataset.i), ph = ed.data.photos, a = pb.dataset.ph;
        if (a === 'del') ph.splice(i, 1);
        else if (a === 'cover') ph.unshift(ph.splice(i, 1)[0]);
        else if (a === 'left') { ph.splice(i - 1, 0, ph.splice(i, 1)[0]); }
        else if (a === 'right') { ph.splice(i + 1, 0, ph.splice(i, 1)[0]); }
        drawEditor();
        return;
      }
      if (t.id === 'edCancel') { if (confirmClose()) closeEditor(); }
      else if (t.id === 'edSave') saveEditor();
      else if (t.id === 'edRevert') revertEditor();
      else if (t.id === 'edFooterBtn') {
        var ta = $('#edDesc');
        if (ta.value.indexOf('Cramer y Monroe') === -1) ta.value = ta.value.replace(/\s+$/, '') + '\n\n' + FOOTER;
        toast('Texto final agregado');
      }
    });
    $('#editBody').addEventListener('change', function (e) {
      if (e.target.id === 'edFiles' && e.target.files.length) addFiles(e.target.files);
    });
    $('#pubBody').addEventListener('click', function (e) {
      if (e.target.id === 'pubCancel') closePublish();
      else if (e.target.id === 'pubGo') doPublish();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('#pubOverlay').hidden) closePublish();
      else if (!$('#editOverlay').hidden && confirmClose()) closeEditor();
    });
    window.addEventListener('beforeunload', function (e) {
      if (dirtyItems().length || orderDirty()) { e.preventDefault(); e.returnValue = ''; }
    });
    setupDrag();
  }
  function confirmClose() { return true; }

  function boot() {
    if (booted) return;
    booted = true;
    $('#loginScreen').hidden = true;
    $('#app').hidden = false;
    bindUi();
    $('#grid').textContent = 'Cargando productos…';
    loadData().then(renderAll).catch(function (e) {
      $('#grid').innerHTML = '<p class="load-err">No pude cargar los productos: ' + esc(e.message) + '</p>';
    });
  }

  function showLogin() {
    if (booted) return;
    $('#loginScreen').hidden = false;
    $('#app').hidden = true;
  }

  function start() {
    $('#loginBtn').addEventListener('click', function () {
      if (window.netlifyIdentity) window.netlifyIdentity.open('login');
    });
    if (DEMO) { boot(); return; }
    var ni = window.netlifyIdentity;
    if (ni) {
      ni.on('init', function (u) { if (u) boot(); else showLogin(); });
      ni.on('login', function () { ni.close(); boot(); });
      ni.on('logout', function () { location.reload(); });
    }
    setTimeout(function () {
      if (booted) return;
      var u = ni && ni.currentUser();
      if (u) boot(); else showLogin();
    }, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
