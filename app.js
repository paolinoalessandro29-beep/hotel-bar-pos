/* ============================================================
   HOTEL BAR POS — APPLICATION LOGIC
   Vanilla JS · localStorage persistence · no build step
   ============================================================ */

(() => {
  'use strict';

  /* =====================================================
     DEFAULT DATA
     ===================================================== */

  const DEFAULT_PAYMENTS = [
    'Contanti',
    'POS INTESA',
    'POS BCC',
    'POS 3',
    'POS 4',
    'POS 5',
    'Nexi',
    'Paypal',
    'Stripe',
    'Stripe - Alternativo',
    'Stripe SEPA',
    'Stripe Terminal',
    'INTESA SANPAOLO - Booking',
    'INTESA SANPAOLO - Bonifico',
    'BCC - bonifico',
    'Banca 3',
    'Assegno',
    'Vaglia Postale',
    'Bonus Vacanze',
    'Commissione OTA',
    'Compensato con NOTA DI CREDITO',
    'Omaggio'
  ];

  // "Omaggio" is special — orders paid with this method don't count as revenue
  const GIFT_PAYMENT = 'Omaggio';

  function buildDefaultRooms() {
    const ranges = [
      [101, 112], [113, 116], [118, 121],
      [201, 212], [214, 216], [218, 246]
    ];
    const rooms = [];
    for (const [a, b] of ranges) {
      for (let n = a; n <= b; n++) rooms.push(String(n));
    }
    return rooms;
  }

  const DEFAULT_ITEMS = [
    { name: 'Espresso',              price: 1.50, category: 'Caffetteria' },
    { name: 'Cappuccino',            price: 2.50, category: 'Caffetteria' },
    { name: 'Caffè Macchiato',       price: 1.80, category: 'Caffetteria' },
    { name: 'Tè',                    price: 2.50, category: 'Caffetteria' },
    { name: 'Cornetto',              price: 1.80, category: 'Colazione' },
    { name: 'Acqua Naturale 0.5L',   price: 2.00, category: 'Bibite' },
    { name: 'Acqua Frizzante 0.5L',  price: 2.00, category: 'Bibite' },
    { name: 'Coca Cola',             price: 3.50, category: 'Bibite' },
    { name: 'Succo di Frutta',       price: 3.00, category: 'Bibite' },
    { name: 'Birra Piccola',         price: 4.00, category: 'Birre' },
    { name: 'Birra Media',           price: 5.50, category: 'Birre' },
    { name: 'Calice Vino Bianco',    price: 6.00, category: 'Vini' },
    { name: 'Calice Vino Rosso',     price: 6.00, category: 'Vini' },
    { name: 'Prosecco Calice',       price: 6.00, category: 'Vini' },
    { name: 'Aperol Spritz',         price: 7.00, category: 'Cocktail' },
    { name: 'Negroni',               price: 9.00, category: 'Cocktail' },
    { name: 'Americano',             price: 7.00, category: 'Cocktail' },
    { name: 'Gin Tonic',             price: 9.00, category: 'Cocktail' },
    { name: 'Toast',                 price: 5.00, category: 'Snack' },
    { name: 'Tramezzino',            price: 4.50, category: 'Snack' },
    { name: 'Tagliere',              price: 12.00, category: 'Snack' }
  ];

  /* =====================================================
     STORAGE
     ===================================================== */

  const STORAGE_KEY = 'hotel_bar_pos_v2';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        // Migration: ensure Omaggio exists in payments
        if (!s.payments.includes(GIFT_PAYMENT)) s.payments.push(GIFT_PAYMENT);
        if (typeof s.nextOrderNum !== 'number') s.nextOrderNum = (s.transactions?.length || 0) + 1;
        return s;
      }
    } catch (e) {
      console.warn('Errore caricamento dati:', e);
    }
    return {
      items: DEFAULT_ITEMS.map(i => ({ ...i, id: uid() })),
      rooms: buildDefaultRooms(),
      payments: [...DEFAULT_PAYMENTS],
      transactions: [],
      nextOrderNum: 1
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Errore salvataggio:', e);
      toast('Errore nel salvataggio — spazio esaurito?', 'error');
    }
    // Cloud sync (no-op se non configurato)
    if (window.POSSync && window.POSSync.enabled) {
      window.POSSync.push(state);
    }
  }

  /* =====================================================
     UTILITIES
     ===================================================== */

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function fmt(n) {
    return '€ ' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtDateOnly(d) {
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function fmtOrderNum(n) {
    return '#' + String(n).padStart(4, '0');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

  function catClass(cat) {
    if (!cat) return 'cat-other';
    const c = cat.toLowerCase();
    if (c.includes('caff') || c.includes('coff')) return 'cat-coffee';
    if (c.includes('cock')) return 'cat-cocktail';
    if (c.includes('vin') || c.includes('wine') || c.includes('prosec')) return 'cat-wine';
    if (c.includes('birr') || c.includes('beer')) return 'cat-beer';
    if (c.includes('bibi') || c.includes('acqua') || c.includes('sof')) return 'cat-soft';
    if (c.includes('snack') || c.includes('tagl') || c.includes('cibo')) return 'cat-snack';
    if (c.includes('colaz') || c.includes('brunch') || c.includes('breakf')) return 'cat-breakfast';
    return 'cat-other';
  }

  function isGift(tx) { return tx.payment === GIFT_PAYMENT; }

  function txRevenue(tx) { return isGift(tx) ? 0 : tx.total; }

  /* =====================================================
     STATE
     ===================================================== */

  const state = loadState();

  const ui = {
    view: 'pos',
    cart: [],
    catFilter: 'all',
    search: '',
    checkout: { room: null, payment: null },
    historyDetailId: null,
    historyFilter: '',
    reportPeriod: 'today',
    confirmAction: null
  };

  /* =====================================================
     NAVIGATION
     ===================================================== */

  const PAGE_META = {
    pos: ['Cassa', ''],
    report: ['Report', 'Riepilogo attività'],
    history: ['Storico', 'Tutti gli ordini'],
    items: ['Articoli', 'Gestione listino'],
    settings: ['Impostazioni', 'Configurazione']
  };

  function setView(name) {
    ui.view = name;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));

    const [title, crumbs] = PAGE_META[name] || ['', ''];
    $('#page-title').textContent = title;
    $('#page-crumbs').textContent = name === 'pos' ? fmtDateOnly(new Date()) : crumbs;

    updateMobileCartBar();

    if (name === 'items') renderItemsTable();
    if (name === 'history') renderHistoryList();
    if (name === 'settings') renderSettings();
    if (name === 'report') renderReport();
  }

  /* =====================================================
     POS — ITEMS & CART
     ===================================================== */

  function getCategories() {
    const set = new Set();
    state.items.forEach(i => { if (i.category) set.add(i.category); });
    return [...set].sort((a, b) => a.localeCompare(b, 'it'));
  }

  function renderCatTabs() {
    const cats = getCategories();
    const tabs = [
      `<button class="cat-tab ${ui.catFilter === 'all' ? 'active' : ''}" data-cat="all"><span class="dot"></span>Tutti</button>`,
      ...cats.map(c => `<button class="cat-tab ${ui.catFilter === c ? 'active' : ''}" data-cat="${escapeHtml(c)}"><span class="dot" style="background: var(--${catClass(c).replace('cat-', 'cat-')})"></span>${escapeHtml(c)}</button>`)
    ];
    $('#cat-tabs').innerHTML = tabs.join('');
    $$('.cat-tab', $('#cat-tabs')).forEach(b => {
      b.addEventListener('click', () => {
        ui.catFilter = b.dataset.cat;
        renderCatTabs();
        renderItemsGrid();
      });
    });
  }

  function renderItemsGrid() {
    const grid = $('#items-grid');
    const q = ui.search.trim().toLowerCase();
    const filtered = state.items.filter(i => {
      if (ui.catFilter !== 'all' && (i.category || '') !== ui.catFilter) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      const ca = (a.category || '').localeCompare(b.category || '', 'it');
      return ca !== 0 ? ca : a.name.localeCompare(b.name, 'it');
    });

    if (!filtered.length) {
      grid.innerHTML = `<p class="empty-state">Nessun articolo trovato.</p>`;
      return;
    }

    grid.innerHTML = filtered.map(i => `
      <button class="item-tile ${catClass(i.category)}" data-id="${i.id}">
        <span class="cat-strip"></span>
        ${i.category ? `<span class="cat-label">${escapeHtml(i.category)}</span>` : ''}
        <span class="name">${escapeHtml(i.name)}</span>
        <span class="price">${fmt(i.price)}</span>
      </button>
    `).join('');

    $$('.item-tile', grid).forEach(card => {
      card.addEventListener('click', () => {
        const item = state.items.find(x => x.id === card.dataset.id);
        if (item) addToCart(item);
      });
    });
  }

  function addToCart(item) {
    const ex = ui.cart.find(c => c.itemId === item.id);
    if (ex) ex.qty += 1;
    else ui.cart.push({ itemId: item.id, name: item.name, price: item.price, qty: 1 });
    renderCart();
  }

  function changeQty(itemId, delta) {
    const l = ui.cart.find(c => c.itemId === itemId);
    if (!l) return;
    l.qty += delta;
    if (l.qty <= 0) ui.cart = ui.cart.filter(c => c.itemId !== itemId);
    renderCart();
  }

  function removeFromCart(itemId) {
    ui.cart = ui.cart.filter(c => c.itemId !== itemId);
    renderCart();
  }

  function clearCart() {
    ui.cart = [];
    renderCart();
  }

  function cartTotal() { return ui.cart.reduce((s, l) => s + l.price * l.qty, 0); }
  function cartCount() { return ui.cart.reduce((s, l) => s + l.qty, 0); }

  function renderCart() {
    const total = cartTotal();
    const count = cartCount();
    const empty = !ui.cart.length;

    const html = empty ? `
      <div class="cart-empty">
        <svg class="ico"><use href="#i-cart-empty"/></svg>
        <p>Nessun articolo</p>
        <p class="small">Seleziona dal menu per iniziare</p>
      </div>
    ` : ui.cart.map(l => `
      <div class="cart-line">
        <div>
          <div class="cl-name">${escapeHtml(l.name)}</div>
          <div class="cl-unit">${fmt(l.price)} cad.</div>
        </div>
        <div class="cl-total">${fmt(l.price * l.qty)}</div>
        <div class="cl-controls">
          <div class="qty-control">
            <button class="qty-btn" data-act="dec" data-id="${l.itemId}" aria-label="Diminuisci">
              <svg class="ico"><use href="#i-minus"/></svg>
            </button>
            <span class="qty-num">${l.qty}</span>
            <button class="qty-btn" data-act="inc" data-id="${l.itemId}" aria-label="Aumenta">
              <svg class="ico"><use href="#i-plus"/></svg>
            </button>
          </div>
          <button class="cl-remove" data-act="rm" data-id="${l.itemId}">Rimuovi</button>
        </div>
      </div>
    `).join('');

    $('#cart-body').innerHTML = html;
    $('#mobile-cart-body').innerHTML = html;

    $('#subtotal-label').textContent = empty ? 'Subtotale' : `Subtotale (${count} ${count === 1 ? 'articolo' : 'articoli'})`;
    $('#subtotal-value').textContent = fmt(total);
    $('#total-value').textContent = fmt(total);
    $('#mobile-total').textContent = fmt(total);
    $('#mc-total').textContent = fmt(total);
    $('#mc-count-num').textContent = count;
    $('#order-num').textContent = empty ? '#—' : `Nuovo ordine ${fmtOrderNum(state.nextOrderNum)}`;

    $('#checkout-btn').disabled = empty;
    $('#mobile-checkout-btn').disabled = empty;

    // Bind qty/remove on both desktop and mobile
    [$('#cart-body'), $('#mobile-cart-body')].forEach(root => {
      $$('[data-act]', root).forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          const act = b.dataset.act;
          if (act === 'inc') changeQty(id, 1);
          else if (act === 'dec') changeQty(id, -1);
          else if (act === 'rm') removeFromCart(id);
        });
      });
    });

    updateMobileCartBar();
  }

  function updateMobileCartBar() {
    $('#mobile-cart-bar').classList.toggle('visible', ui.view === 'pos' && cartCount() > 0);
  }

  /* =====================================================
     CHECKOUT
     ===================================================== */

  function openCheckout() {
    if (!ui.cart.length) return;
    ui.checkout = { room: null, payment: null };
    renderCheckoutSummary();
    renderRoomsGrid('');
    renderPaymentsGrid();
    $('#room-search').value = '';
    updateCheckoutTotalsUI();
    updateConfirmBtn();
    openModal('#checkout-modal');
  }

  function renderCheckoutSummary() {
    const total = cartTotal();
    const lines = ui.cart.map(l => `
      <div class="cs-line">
        <span class="name">${l.qty}× ${escapeHtml(l.name)}</span>
        <span>${fmt(l.price * l.qty)}</span>
      </div>
    `).join('');
    const totalLine = `
      <div class="cs-line" style="border-top:1px solid var(--border); margin-top:6px; padding-top:8px; font-weight:700; color:var(--text);">
        <span>Totale (${cartCount()} articoli)</span>
        <span>${fmt(total)}</span>
      </div>
    `;
    $('#checkout-summary').innerHTML = lines + totalLine;
  }

  function renderRoomsGrid(filter) {
    const q = (filter || '').trim();
    const list = q ? state.rooms.filter(r => r.includes(q)) : state.rooms;
    $('#rooms-grid').innerHTML = list.length
      ? list.map(r => `<button type="button" class="room-btn ${ui.checkout.room === r ? 'selected' : ''}" data-room="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')
      : `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-3); font-size:13px;">Nessuna camera trovata</div>`;
    $$('.room-btn', $('#rooms-grid')).forEach(b => {
      b.addEventListener('click', () => {
        ui.checkout.room = b.dataset.room;
        renderRoomsGrid($('#room-search').value);
        updateConfirmBtn();
      });
    });
  }

  function renderPaymentsGrid() {
    $('#payments-grid').innerHTML = state.payments.map(p => {
      const isSpecial = p === GIFT_PAYMENT;
      const selected = ui.checkout.payment === p;
      return `<button type="button" class="payment-btn ${selected ? 'selected' : ''} ${isSpecial ? 'special' : ''}" data-payment="${escapeHtml(p)}">
        ${isSpecial ? '<svg class="ico"><use href="#i-gift"/></svg>' : ''}
        ${escapeHtml(p)}
      </button>`;
    }).join('');
    $$('.payment-btn', $('#payments-grid')).forEach(b => {
      b.addEventListener('click', () => {
        ui.checkout.payment = b.dataset.payment;
        renderPaymentsGrid();
        updateCheckoutTotalsUI();
        updateConfirmBtn();
      });
    });
  }

  function updateCheckoutTotalsUI() {
    const isGiftSel = ui.checkout.payment === GIFT_PAYMENT;
    const wrap = $('.checkout-total', $('#checkout-modal'));
    wrap.classList.toggle('gift', isGiftSel);
    $('#checkout-total-label').textContent = isGiftSel ? 'Omaggio — incasso' : 'Totale';
    $('#checkout-total-value').textContent = isGiftSel ? '€ 0,00' : fmt(cartTotal());
    $('#confirm-order-label').textContent = isGiftSel ? 'Conferma omaggio' : 'Conferma e salva';
  }

  function updateConfirmBtn() {
    $('#confirm-order-btn').disabled = !ui.checkout.payment || !ui.checkout.room;
  }

  function confirmOrder() {
    if (!ui.checkout.payment || !ui.checkout.room || !ui.cart.length) return;
    const tx = {
      id: uid(),
      orderNum: state.nextOrderNum,
      date: new Date().toISOString(),
      items: ui.cart.map(l => ({ name: l.name, price: l.price, qty: l.qty })),
      total: cartTotal(),
      room: ui.checkout.room,
      payment: ui.checkout.payment
    };
    state.transactions.unshift(tx);
    state.nextOrderNum += 1;
    saveState();
    clearCart();
    closeAllModals();
    const msg = isGift(tx) ? `Omaggio registrato (${fmt(tx.total)} di valore)` : `Ordine ${fmtOrderNum(tx.orderNum)} salvato — ${fmt(tx.total)}`;
    toast(msg, 'success');
  }

  /* =====================================================
     ITEMS MANAGEMENT
     ===================================================== */

  function renderItemsTable() {
    const body = $('#items-table-body');
    if (!state.items.length) {
      body.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-3); font-style:italic;">Nessun articolo. Aggiungine uno per iniziare.</td></tr>`;
      return;
    }
    const sorted = [...state.items].sort((a, b) => {
      const ca = (a.category || '').localeCompare(b.category || '', 'it');
      return ca !== 0 ? ca : a.name.localeCompare(b.name, 'it');
    });
    body.innerHTML = sorted.map(i => `
      <tr>
        <td><span class="it-name">${escapeHtml(i.name)}</span></td>
        <td class="cat-hide">${i.category ? `<span class="it-cat" style="color: var(--${catClass(i.category).replace('cat-', 'cat-')}); background: color-mix(in srgb, var(--${catClass(i.category).replace('cat-', 'cat-')}) 12%, white);">${escapeHtml(i.category)}</span>` : '<span class="muted">—</span>'}</td>
        <td class="num"><span class="it-price">${fmt(i.price)}</span></td>
        <td class="act">
          <div class="row-actions">
            <button data-act="edit" data-id="${i.id}" title="Modifica">
              <svg class="ico"><use href="#i-edit"/></svg>
              Modifica
            </button>
            <button class="danger" data-act="del" data-id="${i.id}" title="Elimina">
              <svg class="ico"><use href="#i-trash"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    $$('[data-act]', body).forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        if (b.dataset.act === 'edit') openItemModal(id);
        else if (b.dataset.act === 'del') confirmDeleteItem(id);
      });
    });

    // Update category datalist for the item modal
    const cats = getCategories();
    $('#category-list').innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
  }

  function openItemModal(id = null) {
    const isEdit = !!id;
    $('#item-modal-title').textContent = isEdit ? 'Modifica articolo' : 'Nuovo articolo';
    $('#item-id').value = id || '';
    // Refresh category datalist
    $('#category-list').innerHTML = getCategories().map(c => `<option value="${escapeHtml(c)}">`).join('');
    if (isEdit) {
      const it = state.items.find(x => x.id === id);
      if (it) {
        $('#item-name').value = it.name;
        $('#item-price').value = it.price;
        $('#item-category').value = it.category || '';
      }
    } else {
      $('#item-form').reset();
    }
    openModal('#item-modal');
    setTimeout(() => $('#item-name').focus(), 100);
  }

  function saveItem() {
    const id = $('#item-id').value;
    const name = $('#item-name').value.trim();
    const price = parseFloat($('#item-price').value);
    const category = $('#item-category').value.trim();
    if (!name) { $('#item-name').focus(); return toast('Il nome è obbligatorio', 'error'); }
    if (isNaN(price) || price < 0) { $('#item-price').focus(); return toast('Il prezzo non è valido', 'error'); }

    if (id) {
      const it = state.items.find(x => x.id === id);
      if (it) { it.name = name; it.price = price; it.category = category; }
    } else {
      state.items.push({ id: uid(), name, price, category });
    }
    saveState();
    closeModal('#item-modal');
    renderItemsTable();
    renderCatTabs();
    renderItemsGrid();
    toast(id ? 'Articolo aggiornato' : 'Articolo creato', 'success');
  }

  function confirmDeleteItem(id) {
    const it = state.items.find(x => x.id === id);
    if (!it) return;
    askConfirm(
      `Elimina "${it.name}"?`,
      `L'articolo verrà rimosso dal listino. Gli ordini passati con questo articolo rimarranno nello storico.`,
      () => {
        state.items = state.items.filter(x => x.id !== id);
        saveState();
        renderItemsTable();
        renderCatTabs();
        renderItemsGrid();
        toast('Articolo eliminato', 'success');
      }
    );
  }

  /* =====================================================
     HISTORY
     ===================================================== */

  function renderHistoryList() {
    const list = $('#history-list');
    const q = ui.historyFilter.trim().toLowerCase();
    const filtered = state.transactions.filter(t => {
      if (!q) return true;
      const hay = [
        t.room || '',
        t.payment,
        fmtDate(t.date),
        fmtOrderNum(t.orderNum),
        ...t.items.map(i => i.name)
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (!filtered.length) {
      list.innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--text-3); font-style:italic;">
        ${state.transactions.length ? 'Nessun ordine corrisponde al filtro.' : 'Nessun ordine ancora registrato.'}
      </div>`;
      return;
    }

    list.innerHTML = filtered.map(t => {
      const itemsLabel = t.items.map(i => `${i.qty}× ${i.name}`).join(', ');
      const gift = isGift(t);
      return `
        <div class="history-row" data-id="${t.id}">
          <div class="h-time">
            <div style="font-weight:700; color:var(--text); font-size:12px; margin-bottom:2px;">${fmtOrderNum(t.orderNum || 0)}</div>
            ${fmtDate(t.date)}
          </div>
          <div class="h-items">${escapeHtml(itemsLabel)}</div>
          <div class="h-meta">
            ${t.room ? `<span class="tag room">Camera ${escapeHtml(t.room)}</span>` : ''}
            <span class="tag ${gift ? 'gift' : 'payment'}">${escapeHtml(t.payment)}</span>
          </div>
          <div class="h-total ${gift ? 'gift-amt' : ''}">${gift ? 'Omaggio' : fmt(t.total)}</div>
        </div>
      `;
    }).join('');

    $$('.history-row', list).forEach(row => {
      row.addEventListener('click', () => openHistoryDetail(row.dataset.id));
    });
  }

  function openHistoryDetail(id) {
    const t = state.transactions.find(x => x.id === id);
    if (!t) return;
    ui.historyDetailId = id;
    const gift = isGift(t);

    const itemsHtml = t.items.map(i => `
      <div class="detail-item">
        <span class="di-name">${escapeHtml(i.name)}</span>
        <span class="di-qty">× ${i.qty}</span>
        <span class="di-price">${fmt(i.price * i.qty)}</span>
      </div>
    `).join('');

    $('#history-detail-body').innerHTML = `
      ${gift ? `<div class="gift-banner"><svg class="ico"><use href="#i-gift"/></svg>Questo ordine è stato offerto in omaggio</div>` : ''}
      <div class="detail-meta">
        <div>
          <div class="label">Ordine</div>
          <div class="value">${fmtOrderNum(t.orderNum || 0)}</div>
        </div>
        <div>
          <div class="label">Data</div>
          <div class="value">${fmtDate(t.date)}</div>
        </div>
        <div>
          <div class="label">Camera</div>
          <div class="value">${t.room ? escapeHtml(t.room) : '—'}</div>
        </div>
        <div>
          <div class="label">Pagamento</div>
          <div class="value">${escapeHtml(t.payment)}</div>
        </div>
      </div>
      <div class="detail-items">${itemsHtml}</div>
      <div class="detail-total ${gift ? 'gift' : ''}">
        <span class="label">${gift ? 'Valore offerto' : 'Totale'}</span>
        <strong>${fmt(t.total)}</strong>
      </div>
    `;
    openModal('#history-modal');
  }

  function deleteCurrentOrder() {
    const id = ui.historyDetailId;
    if (!id) return;
    const t = state.transactions.find(x => x.id === id);
    if (!t) return;
    askConfirm(
      `Elimina ordine ${fmtOrderNum(t.orderNum || 0)}?`,
      `L'ordine sarà rimosso definitivamente dallo storico e dai report. Usa questa funzione per correggere errori di battitura o ordini inseriti per sbaglio.`,
      () => {
        state.transactions = state.transactions.filter(x => x.id !== id);
        saveState();
        closeModal('#history-modal');
        renderHistoryList();
        renderReport();
        toast('Ordine eliminato', 'success');
      }
    );
  }

  /* =====================================================
     REPORT
     ===================================================== */

  function getDateRange(period) {
    const now = new Date();
    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    if (period === 'today') {
      const s = startOfDay(now);
      const e = endOfDay(now);
      const ps = startOfDay(new Date(s.getTime() - 86400000));
      const pe = startOfDay(s);
      return { start: s, end: e, prevStart: ps, prevEnd: pe, kind: 'hourly' };
    }
    if (period === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      const s = startOfDay(y);
      const e = endOfDay(y);
      const ps = startOfDay(new Date(s.getTime() - 86400000));
      const pe = startOfDay(s);
      return { start: s, end: e, prevStart: ps, prevEnd: pe, kind: 'hourly' };
    }
    if (period === '7days') {
      const e = endOfDay(now);
      const s = new Date(e.getTime() - 7 * 86400000);
      const ps = new Date(s.getTime() - 7 * 86400000);
      return { start: s, end: e, prevStart: ps, prevEnd: s, kind: 'daily7' };
    }
    // month
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const ps = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const pe = s;
    return { start: s, end: e, prevStart: ps, prevEnd: pe, kind: 'dailyMonth' };
  }

  function txInRange(tx, range) {
    const d = new Date(tx.date);
    return d >= range.start && d < range.end;
  }

  function renderReport() {
    const range = getDateRange(ui.reportPeriod);
    const inRange = state.transactions.filter(t => txInRange(t, range));
    const prevInRange = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d >= range.prevStart && d < range.prevEnd;
    });

    const revenue = inRange.reduce((s, t) => s + txRevenue(t), 0);
    const orders = inRange.length;
    const avg = orders ? revenue / orders : 0;
    const roomOrders = inRange.filter(t => t.room).length;
    const giftOrders = inRange.filter(isGift);
    const giftValue = giftOrders.reduce((s, t) => s + t.total, 0);

    const prevRevenue = prevInRange.reduce((s, t) => s + txRevenue(t), 0);
    const prevOrders = prevInRange.length;
    const prevAvg = prevOrders ? prevRevenue / prevOrders : 0;

    // Period labels
    const periodLabels = {
      today: 'Oggi',
      yesterday: 'Ieri',
      '7days': 'Ultimi 7 giorni',
      month: 'Questo mese'
    };
    $('#report-period-label').textContent = periodLabels[ui.reportPeriod] + ' — ' +
      range.start.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) +
      (range.kind !== 'hourly' ? ` → ${new Date(range.end.getTime() - 1).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}` : '');

    // KPI cards
    const showTrend = range.kind === 'hourly'; // only compare day-to-day
    const trendHTML = (current, previous, labelSuffix = '') => {
      if (!showTrend || previous === 0) {
        if (previous === 0 && current > 0) return `<div class="kpi-trend neutral">Primo ${labelSuffix || 'periodo'} con dati</div>`;
        return '';
      }
      const diff = current - previous;
      const pct = previous > 0 ? (diff / previous) * 100 : 0;
      const cls = diff > 0 ? '' : (diff < 0 ? 'down' : 'neutral');
      const ico = diff >= 0 ? 'i-trend-up' : 'i-trend-down';
      return `<div class="kpi-trend ${cls}">
        <svg class="ico"><use href="#${ico}"/></svg>
        ${diff >= 0 ? '+' : ''}${pct.toFixed(0)}% vs ${ui.reportPeriod === 'today' ? 'ieri' : 'giorno prec.'}
      </div>`;
    };

    const kpiHTML = `
      <div class="kpi-card featured">
        <div class="kpi-label">Incasso</div>
        <div class="kpi-value">${fmt(revenue)}</div>
        ${trendHTML(revenue, prevRevenue)}
        <svg class="kpi-bg-ico"><use href="#i-euro"/></svg>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Ordini</div>
        <div class="kpi-value">${orders}</div>
        ${trendHTML(orders, prevOrders)}
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Scontrino medio</div>
        <div class="kpi-value">${fmt(avg)}</div>
        ${trendHTML(avg, prevAvg)}
      </div>
      ${giftOrders.length > 0 ? `
        <div class="kpi-card gift-card">
          <div class="kpi-label">Omaggi</div>
          <div class="kpi-value">${fmt(giftValue)}</div>
          <div class="kpi-trend neutral" style="color: var(--gift)">${giftOrders.length} ${giftOrders.length === 1 ? 'ordine offerto' : 'ordini offerti'}</div>
          <svg class="kpi-bg-ico"><use href="#i-gift"/></svg>
        </div>
      ` : `
        <div class="kpi-card">
          <div class="kpi-label">Camere addebitate</div>
          <div class="kpi-value">${roomOrders}</div>
          ${orders > 0 ? `<div class="kpi-trend neutral">${Math.round(roomOrders / orders * 100)}% degli ordini</div>` : ''}
        </div>
      `}
    `;
    $('#kpi-grid').innerHTML = kpiHTML;

    // Chart
    renderChart(inRange, range);

    // Top items
    renderTopItems(inRange);

    // Recent orders
    renderRecentOrders(inRange);

    // Payment breakdown
    renderPaymentBreakdown(inRange);
  }

  function renderChart(transactions, range) {
    const chart = $('#chart-area');
    let bars = [];
    let title = 'Andamento';
    let subtitle = '';

    if (range.kind === 'hourly') {
      // 8h-23h buckets
      const hours = [];
      for (let h = 8; h <= 23; h++) hours.push(h);
      const map = Object.fromEntries(hours.map(h => [h, 0]));
      transactions.forEach(t => {
        const h = new Date(t.date).getHours();
        if (map[h] !== undefined) map[h] += txRevenue(t);
        else if (h < 8) { map[8] = (map[8] || 0) + txRevenue(t); }
        else { map[23] = (map[23] || 0) + txRevenue(t); }
      });
      bars = hours.map(h => ({ label: String(h).padStart(2, '0'), value: map[h], tooltip: fmt(map[h]) }));
      title = 'Incassi per fascia oraria';
      subtitle = 'Distribuzione delle vendite';
    } else if (range.kind === 'daily7') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(range.end.getTime() - (i + 1) * 86400000);
        const key = d.toDateString();
        const val = transactions
          .filter(t => new Date(t.date).toDateString() === key)
          .reduce((s, t) => s + txRevenue(t), 0);
        bars.push({
          label: d.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3).toUpperCase(),
          value: val,
          tooltip: `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} — ${fmt(val)}`
        });
      }
      title = 'Incassi per giorno';
      subtitle = 'Ultimi 7 giorni';
    } else if (range.kind === 'dailyMonth') {
      const daysInMonth = new Date(range.end.getTime() - 1).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(range.start.getFullYear(), range.start.getMonth(), d);
        const key = day.toDateString();
        const val = transactions
          .filter(t => new Date(t.date).toDateString() === key)
          .reduce((s, t) => s + txRevenue(t), 0);
        bars.push({ label: String(d), value: val, tooltip: `${d} — ${fmt(val)}` });
      }
      title = 'Incassi giornalieri';
      subtitle = 'Mese corrente';
    }

    $('#chart-title').textContent = title;
    $('#chart-subtitle').textContent = subtitle;
    $('#chart-date').textContent = range.kind === 'hourly'
      ? range.start.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const max = Math.max(...bars.map(b => b.value), 1);
    if (!transactions.length) {
      chart.innerHTML = `<div class="chart-empty">Nessun dato per il periodo selezionato</div>`;
      return;
    }

    chart.innerHTML = bars.map(b => {
      const h = max > 0 ? Math.max((b.value / max) * 100, b.value > 0 ? 2 : 0) : 0;
      return `
        <div class="bar-col">
          <div class="bar-wrap">
            <div class="bar ${b.value === 0 ? 'empty-bar' : ''}" style="height:${h}%">
              <span class="bar-tooltip">${escapeHtml(b.tooltip)}</span>
            </div>
          </div>
          <div class="bar-label">${escapeHtml(b.label)}</div>
        </div>
      `;
    }).join('');
  }

  function renderTopItems(transactions) {
    const tally = {};
    transactions.forEach(t => {
      t.items.forEach(i => {
        const key = i.name;
        if (!tally[key]) tally[key] = { name: i.name, qty: 0, revenue: 0, lastPrice: i.price, isGift: isGift(t) };
        tally[key].qty += i.qty;
        tally[key].revenue += isGift(t) ? 0 : i.price * i.qty;
        tally[key].lastPrice = i.price;
      });
    });

    const sorted = Object.values(tally).sort((a, b) => b.qty - a.qty).slice(0, 6);
    const list = $('#top-items-list');

    if (!sorted.length) {
      list.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--text-3); font-style:italic; font-size:13px;">Nessun dato</div>`;
      return;
    }

    list.innerHTML = sorted.map((it, idx) => `
      <div class="top-item">
        <div class="rank-badge">${idx + 1}</div>
        <div class="top-item-info">
          <div class="name">${escapeHtml(it.name)}</div>
          <div class="meta">${fmt(it.lastPrice)} cad.</div>
        </div>
        <div class="top-item-amount">
          ${fmt(it.revenue)}
          <span class="qty">${it.qty} ${it.qty === 1 ? 'venduto' : 'venduti'}</span>
        </div>
      </div>
    `).join('');
  }

  function renderRecentOrders(transactions) {
    const list = $('#recent-list');
    const recent = transactions.slice(0, 6);

    if (!recent.length) {
      list.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--text-3); font-style:italic; font-size:13px;">Nessun ordine</div>`;
      return;
    }

    list.innerHTML = recent.map(t => {
      const items = t.items.map(i => `${i.qty}× ${i.name}`).join(', ');
      const gift = isGift(t);
      return `
        <div class="recent-row" data-id="${t.id}">
          <span class="recent-time">${fmtTime(t.date)}</span>
          <span class="recent-items">${escapeHtml(items)}</span>
          ${t.room
            ? `<span class="tag room">Cam. ${escapeHtml(t.room)}</span>`
            : `<span class="tag ${gift ? 'gift' : 'payment'}">${escapeHtml(t.payment)}</span>`
          }
          <span class="recent-amt ${gift ? 'gift-amt' : ''}">${gift ? 'Omaggio' : fmt(t.total)}</span>
        </div>
      `;
    }).join('');

    $$('.recent-row', list).forEach(row => {
      row.addEventListener('click', () => {
        setView('history');
        openHistoryDetail(row.dataset.id);
      });
    });
  }

  function renderPaymentBreakdown(transactions) {
    const list = $('#payment-list');
    if (!transactions.length) {
      list.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--text-3); font-style:italic; font-size:13px;">Nessun pagamento registrato</div>`;
      return;
    }

    // Group by room-charged vs payment method
    const tally = {};
    let totalPayable = 0;
    transactions.forEach(t => {
      if (isGift(t)) {
        const key = 'Omaggio';
        if (!tally[key]) tally[key] = { name: key, amount: 0, count: 0, gift: true };
        tally[key].amount += t.total;
        tally[key].count += 1;
      } else {
        const key = t.room ? 'Camere addebitate' : t.payment;
        if (!tally[key]) tally[key] = { name: key, amount: 0, count: 0, isRoomGroup: !!t.room };
        tally[key].amount += t.total;
        tally[key].count += 1;
        totalPayable += t.total;
      }
    });

    const sorted = Object.values(tally).sort((a, b) => b.amount - a.amount);
    const giftTotal = sorted.filter(r => r.gift).reduce((s, r) => s + r.amount, 0);
    const basisForPct = totalPayable + giftTotal || 1;

    list.innerHTML = sorted.map(row => {
      const pct = (row.amount / basisForPct) * 100;
      return `
        <div class="pay-row">
          <span class="pay-name">${escapeHtml(row.name)}</span>
          <span class="pay-amt">${fmt(row.amount)}</span>
          <div class="pay-bar-wrap"><div class="pay-bar ${row.gift ? 'gift-bar' : ''}" style="width:${Math.max(pct, 2)}%"></div></div>
          <span class="pay-meta">${row.count} ${row.count === 1 ? 'ordine' : 'ordini'} · ${pct.toFixed(0)}%</span>
        </div>
      `;
    }).join('');
  }

  /* =====================================================
     SETTINGS
     ===================================================== */

  function renderSettings() {
    // Rooms
    $('#rooms-count').textContent = state.rooms.length;
    $('#rooms-chips').innerHTML = state.rooms.length
      ? state.rooms.map(r => `
          <span class="chip">
            ${escapeHtml(r)}
            <button class="chip-x" data-room="${escapeHtml(r)}" aria-label="Rimuovi ${escapeHtml(r)}">
              <svg class="ico"><use href="#i-close"/></svg>
            </button>
          </span>
        `).join('')
      : `<span class="muted small">Nessuna camera configurata.</span>`;
    $$('.chip-x[data-room]', $('#rooms-chips')).forEach(b => {
      b.addEventListener('click', () => {
        state.rooms = state.rooms.filter(r => r !== b.dataset.room);
        saveState();
        renderSettings();
      });
    });

    // Payments
    $('#payments-count').textContent = state.payments.length;
    $('#payments-chips').innerHTML = state.payments.map(p => {
      const special = p === GIFT_PAYMENT;
      return `
        <span class="chip ${special ? 'special-chip' : ''}">
          ${special ? '<svg class="ico" style="width:12px;height:12px;"><use href="#i-gift"/></svg>' : ''}
          ${escapeHtml(p)}
          ${special
            ? ''
            : `<button class="chip-x" data-payment="${escapeHtml(p)}" aria-label="Rimuovi"><svg class="ico"><use href="#i-close"/></svg></button>`
          }
        </span>
      `;
    }).join('');
    $$('.chip-x[data-payment]', $('#payments-chips')).forEach(b => {
      b.addEventListener('click', () => {
        const name = b.dataset.payment;
        if (name === GIFT_PAYMENT) return;
        state.payments = state.payments.filter(p => p !== name);
        saveState();
        renderSettings();
      });
    });
  }

  /* =====================================================
     EXPORT / IMPORT
     ===================================================== */

  function exportBackup() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    download(blob, `bar-pos-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast('Backup esportato', 'success');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.items) || !Array.isArray(data.rooms) || !Array.isArray(data.payments)) {
          throw new Error('Formato non valido');
        }
        askConfirm(
          'Importare il backup?',
          'I dati attuali (articoli, camere, metodi, storico) verranno sostituiti da quelli del file.',
          () => {
            state.items = data.items;
            state.rooms = data.rooms;
            state.payments = data.payments;
            if (!state.payments.includes(GIFT_PAYMENT)) state.payments.push(GIFT_PAYMENT);
            state.transactions = data.transactions || [];
            state.nextOrderNum = data.nextOrderNum || (state.transactions.length + 1);
            saveState();
            renderAll();
            toast('Backup importato con successo', 'success');
          }
        );
      } catch (err) {
        toast('File backup non valido: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function exportCSV() {
    const range = getDateRange(ui.reportPeriod);
    const inRange = state.transactions.filter(t => txInRange(t, range));
    exportTransactionsCSV(inRange, `report-${ui.reportPeriod}`);
  }

  function exportHistoryCSV() {
    exportTransactionsCSV(state.transactions, 'storico-completo');
  }

  function exportTransactionsCSV(transactions, filename) {
    if (!transactions.length) return toast('Nessun ordine da esportare', 'error');

    const header = ['N. Ordine', 'Data', 'Camera', 'Metodo Pagamento', 'Omaggio', 'Articolo', 'Quantità', 'Prezzo Unitario', 'Totale Riga', 'Totale Ordine', 'Incasso (escluso omaggi)'];
    const rows = [header];

    transactions.forEach(t => {
      const gift = isGift(t);
      t.items.forEach((it, idx) => {
        rows.push([
          fmtOrderNum(t.orderNum || 0),
          fmtDate(t.date),
          t.room || '',
          t.payment,
          gift ? 'Sì' : 'No',
          it.name,
          it.qty,
          it.price.toFixed(2).replace('.', ','),
          (it.price * it.qty).toFixed(2).replace('.', ','),
          idx === 0 ? t.total.toFixed(2).replace('.', ',') : '',
          idx === 0 ? (gift ? '0,00' : t.total.toFixed(2).replace('.', ',')) : ''
        ]);
      });
    });

    // Summary row
    const revenue = transactions.reduce((s, t) => s + txRevenue(t), 0);
    const giftValue = transactions.filter(isGift).reduce((s, t) => s + t.total, 0);
    rows.push([]);
    rows.push(['TOTALE ORDINI', transactions.length]);
    rows.push(['INCASSO NETTO', '', '', '', '', '', '', '', '', '', revenue.toFixed(2).replace('.', ',')]);
    rows.push(['VALORE OMAGGI', '', '', '', '', '', '', '', '', '', giftValue.toFixed(2).replace('.', ',')]);

    const csv = rows.map(r => r.map(cell => {
      const s = cell == null ? '' : String(cell);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    download(blob, `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast('CSV esportato', 'success');
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /* =====================================================
     MODALS
     ===================================================== */

  function openModal(sel) {
    $(sel).hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal(sel) {
    $(sel).hidden = true;
    if (!$$('.modal:not([hidden])').length) {
      document.body.classList.remove('modal-open');
    }
  }

  function closeAllModals() {
    $$('.modal').forEach(m => m.hidden = true);
    document.body.classList.remove('modal-open');
  }

  function askConfirm(title, message, onConfirm) {
    ui.confirmAction = onConfirm;
    $('#confirm-title').textContent = title;
    $('#confirm-message').textContent = message;
    openModal('#confirm-modal');
  }

  function bindModalCloses() {
    $$('.modal').forEach(modal => {
      $$('[data-close]', modal).forEach(el => {
        el.addEventListener('click', () => {
          modal.hidden = true;
          if (!$$('.modal:not([hidden])').length) document.body.classList.remove('modal-open');
        });
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  /* =====================================================
     TOAST
     ===================================================== */

  let toastTO;
  function toast(msg, kind = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.hidden = false;
    clearTimeout(toastTO);
    toastTO = setTimeout(() => { el.hidden = true; }, 2800);
  }

  /* =====================================================
     RENDER ALL
     ===================================================== */

  function renderAll() {
    renderCatTabs();
    renderItemsGrid();
    renderCart();
    if (ui.view === 'items') renderItemsTable();
    if (ui.view === 'history') renderHistoryList();
    if (ui.view === 'settings') renderSettings();
    if (ui.view === 'report') renderReport();
  }

  /* =====================================================
     INIT — BINDINGS
     ===================================================== */

  function init() {
    // Navigation
    $$('.nav-item').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

    // Topbar date
    $('#page-crumbs').textContent = fmtDateOnly(new Date());
    // Session label updates
    const hr = new Date().getHours();
    $('#session-role').textContent =
      hr < 11 ? 'Turno mattutino' :
      hr < 17 ? 'Turno pomeridiano' :
      'Turno serale';

    // POS
    $('#search-input').addEventListener('input', e => {
      ui.search = e.target.value;
      renderItemsGrid();
    });
    $('#clear-cart-btn').addEventListener('click', () => {
      if (ui.cart.length) askConfirm('Svuotare il carrello?', 'Tutti gli articoli selezionati verranno rimossi.', clearCart);
    });
    $('#checkout-btn').addEventListener('click', openCheckout);
    $('#mobile-cart-bar').addEventListener('click', () => openModal('#mobile-cart-modal'));
    $('#mobile-checkout-btn').addEventListener('click', () => {
      closeModal('#mobile-cart-modal');
      openCheckout();
    });

    // Checkout
    $('#confirm-order-btn').addEventListener('click', confirmOrder);
    $('#room-search').addEventListener('input', e => renderRoomsGrid(e.target.value));

    // Items
    $('#add-item-btn').addEventListener('click', () => openItemModal(null));
    $('#item-save-btn').addEventListener('click', saveItem);
    $('#item-form').addEventListener('submit', e => { e.preventDefault(); saveItem(); });

    // History
    $('#history-search').addEventListener('input', e => {
      ui.historyFilter = e.target.value;
      renderHistoryList();
    });
    $('#delete-order-btn').addEventListener('click', deleteCurrentOrder);
    $('#export-history-btn').addEventListener('click', exportHistoryCSV);

    // Report
    $$('.date-btn', $('#date-selector')).forEach(b => {
      b.addEventListener('click', () => {
        ui.reportPeriod = b.dataset.period;
        $$('.date-btn', $('#date-selector')).forEach(x => x.classList.toggle('active', x === b));
        renderReport();
      });
    });
    $('#export-report-btn').addEventListener('click', exportCSV);
    $('#goto-history-btn').addEventListener('click', () => setView('history'));

    // Settings
    $('#add-room-form').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#new-room').value.trim();
      if (!v) return;
      if (state.rooms.includes(v)) return toast('Camera già presente', 'error');
      state.rooms.push(v);
      state.rooms.sort((a, b) => {
        const na = parseInt(a, 10), nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
      saveState();
      $('#new-room').value = '';
      renderSettings();
    });

    $('#add-payment-form').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#new-payment').value.trim();
      if (!v) return;
      if (state.payments.includes(v)) return toast('Metodo già presente', 'error');
      state.payments.push(v);
      saveState();
      $('#new-payment').value = '';
      renderSettings();
    });

    $('#export-data-btn').addEventListener('click', exportBackup);
    $('#import-data-input').addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) importBackup(f);
      e.target.value = '';
    });

    $('#clear-history-btn').addEventListener('click', () => {
      if (!state.transactions.length) return toast('Storico già vuoto');
      askConfirm(
        'Cancellare tutto lo storico?',
        `Verranno eliminati ${state.transactions.length} ordini in modo definitivo. L'operazione non è reversibile. I report mostreranno dati azzerati.`,
        () => {
          state.transactions = [];
          state.nextOrderNum = 1;
          saveState();
          toast('Storico cancellato', 'success');
          renderAll();
        }
      );
    });

    $('#reset-all-btn').addEventListener('click', () => {
      askConfirm(
        'Reset completo?',
        'Verranno cancellati articoli, camere, metodi di pagamento e storico — e ripristinati i valori di default. Assicurati di avere un backup.',
        () => {
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        }
      );
    });

    // Confirm dialog
    $('#confirm-yes-btn').addEventListener('click', () => {
      const fn = ui.confirmAction;
      ui.confirmAction = null;
      closeModal('#confirm-modal');
      if (typeof fn === 'function') fn();
    });

    // Modals
    bindModalCloses();

    // Initial render
    renderAll();
    setView('pos');

    // Cloud sync init (opzionale — no-op se Supabase non è configurato)
    if (window.POSSync && window.POSSync.enabled) {
      window.POSSync.init(applyRemoteState)
        .then((remoteData) => {
          if (remoteData) {
            // Il cloud ha già dei dati: allinea il device a quelli
            applyRemoteState(remoteData);
            toast('Sincronizzazione cloud attiva ☁️', 'success');
          } else {
            // Cloud vuoto (prima configurazione): carica lo stato locale
            window.POSSync.push(state);
            toast('Dati caricati sul cloud ☁️', 'success');
          }
        })
        .catch((err) => {
          console.error('[Sync] init failed:', err);
          toast('Sincronizzazione cloud non disponibile', 'error');
        });
    }
  }

  /* =====================================================
     REMOTE STATE APPLIER
     Applica uno stato ricevuto dal cloud mutando `state`
     (che è const: possiamo solo mutare le sue proprietà,
     mai riassegnarlo).
     ===================================================== */
  function applyRemoteState(remote) {
    if (!remote || typeof remote !== 'object') return;
    if (Array.isArray(remote.items))        state.items        = remote.items;
    if (Array.isArray(remote.rooms))        state.rooms        = remote.rooms;
    if (Array.isArray(remote.payments)) {
      state.payments = remote.payments.slice();
      if (!state.payments.includes(GIFT_PAYMENT)) state.payments.push(GIFT_PAYMENT);
    }
    if (Array.isArray(remote.transactions)) state.transactions = remote.transactions;
    if (typeof remote.nextOrderNum === 'number') state.nextOrderNum = remote.nextOrderNum;
    // Persisti anche in locale come cache
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    // Ridisegna la UI
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
