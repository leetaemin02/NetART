/* Public gallery enhancements. Uses existing catalog data and account-free storage. */
(() => {
  const data = window.NET_ART;
  if (!data || !Array.isArray(data.artworks)) return;
  const works = data.artworks;
  const $ = selector => document.querySelector(selector);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const key = 'net-art-recently-viewed';
  function getRecent() {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value.filter(id => works.some(work => work.id === id)).slice(0, 6) : [];
    } catch { return []; }
  }
  const currentId = new URLSearchParams(location.search).get('id');
  if (document.body.dataset.page === 'artwork' && works.some(item => item.id === currentId)) {
    try { localStorage.setItem(key, JSON.stringify([currentId, ...getRecent().filter(id => id !== currentId)].slice(0, 6))); } catch { }
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'quick-view-dialog';
  dialog.className = 'quick-view-dialog';
  dialog.setAttribute('aria-label', 'Xem nhanh tác phẩm');
  dialog.innerHTML = '<button class="close" type="button" aria-label="Đóng xem nhanh">×</button><div id="quick-view-content"></div>';
  document.body.append(dialog);
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  function quickView(id) {
    const item = works.find(work => work.id === id);
    if (!item) return;
    dialog.querySelector('#quick-view-content').innerHTML = `<div class="quick-view-layout"><div class="quick-view-art"><img src="assets/${encodeURIComponent(item.image)}" alt="${escapeHTML(item.name)}"></div><div class="quick-view-details"><p class="eyebrow">${escapeHTML(item.categoryName)}</p><h2>${escapeHTML(item.name)}</h2><p>${escapeHTML(item.description)}</p><dl><div><dt>Chất liệu</dt><dd>${escapeHTML(item.medium)}</dd></div><div><dt>Kích thước</dt><dd>${escapeHTML(item.size)}</dd></div></dl><p class="product-price">${money(item.price)}</p><p class="sample-note">Giá và hình ảnh minh họa; xác nhận với họa sĩ.</p><a class="button" href="artwork.html?id=${encodeURIComponent(item.id)}">Xem chi tiết & liên hệ ↗</a></div></div>`;
    dialog.showModal();
  }

  function decorateCards() {
    document.querySelectorAll('.artwork').forEach(card => {
      if (card.querySelector('[data-quick-view]')) return;
      const link = card.querySelector('a[href*="artwork.html?id="]');
      if (!link) return;
      const id = new URL(link.href, location.href).searchParams.get('id');
      if (!works.some(work => work.id === id)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-view-trigger';
      button.dataset.quickView = id;
      button.textContent = 'Xem nhanh ↗';
      button.setAttribute('aria-label', `Xem nhanh ${works.find(work => work.id === id).name}`);
      card.querySelector('.art-image')?.after(button);
    });
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-quick-view]');
    if (button) quickView(button.dataset.quickView);
  });
  const grid = $('#art-grid');
  if (grid) new MutationObserver(decorateCards).observe(grid, { childList: true });
  decorateCards();

  const input = $('#search');
  if (input) {
    const parent = input.closest('label') || input.parentElement;
    parent.classList.add('live-search-anchor');
    const suggestions = document.createElement('div');
    suggestions.className = 'live-search-results';
    suggestions.id = 'live-search-results';
    suggestions.setAttribute('role', 'listbox');
    suggestions.hidden = true;
    parent.append(suggestions);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-controls', suggestions.id);
    input.setAttribute('aria-expanded', 'false');
    const hide = () => { suggestions.hidden = true; input.setAttribute('aria-expanded', 'false'); };
    input.addEventListener('input', () => {
      const query = normalize(input.value.trim());
      if (!query) { hide(); return; }
      const matches = works.filter(item => normalize(`${item.name} ${item.medium} ${item.categoryName}`).includes(query)).slice(0, 5);
      suggestions.innerHTML = matches.length ? matches.map(item => `<a role="option" href="artwork.html?id=${encodeURIComponent(item.id)}"><img src="assets/${encodeURIComponent(item.image)}" alt=""><span>${escapeHTML(item.name)}<small>${escapeHTML(item.medium)} · ${money(item.price)}</small></span><b>↗</b></a>`).join('') : '<p>Không tìm thấy tác phẩm phù hợp.</p>';
      suggestions.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') hide();
      if (event.key === 'ArrowDown' && !suggestions.hidden) { event.preventDefault(); suggestions.querySelector('a')?.focus(); }
    });
    document.addEventListener('click', event => { if (!parent.contains(event.target)) hide(); });
    input.addEventListener('blur', () => setTimeout(() => { if (!parent.contains(document.activeElement)) hide(); }, 100));
  }

  const recent = getRecent().filter(id => id !== currentId).map(id => works.find(work => work.id === id));
  if (recent.length && ['home', 'catalog', 'artwork'].includes(document.body.dataset.page || 'home')) {
    const section = document.createElement('section');
    section.className = 'recently-viewed wrap';
    section.setAttribute('aria-label', 'Tranh đã xem gần đây');
    section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">KHÁM PHÁ TIẾP</p><h2>Tranh bạn vừa xem.</h2></div><button class="recent-clear" type="button">Xóa lịch sử</button></div><div class="recent-grid">${recent.map(item => `<a href="artwork.html?id=${encodeURIComponent(item.id)}"><img src="assets/${encodeURIComponent(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.medium)}</small></a>`).join('')}</div>`;
    const footer = document.querySelector('#site-footer') || document.querySelector('footer');
    if (footer) footer.before(section);
    section.querySelector('.recent-clear').addEventListener('click', () => { try { localStorage.removeItem(key); } catch { } section.remove(); });
  }

  const watchImages = () => {
    document.querySelectorAll('.artwork img,.recent-grid img,.product-image img,.artist-slideshow img').forEach(image => {
      if (image.dataset.skeletonReady) return;
      image.dataset.skeletonReady = 'true';
      const holder = image.closest('.art-image,.recent-grid a,.product-image,.artist-slideshow');
      if (!holder) return;
      const done = () => holder.classList.remove('image-loading');
      if (image.complete) return;
      holder.classList.add('image-loading');
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
    });
  };
  if (grid) new MutationObserver(watchImages).observe(grid, { childList: true });
  const featured = $('#featured-grid');
  if (featured) new MutationObserver(watchImages).observe(featured, { childList: true });
  watchImages();
})();
