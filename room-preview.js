(() => {
  'use strict';
  const artwork = window.NET_ART?.artworks?.find(item => item.id === new URLSearchParams(location.search).get('id'));
  const orderButton = document.getElementById('order-button');
  if (!artwork || !orderButton) return;

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'room-preview-open';
  launch.textContent = '◫ Xem tranh trong phòng';
  orderButton.insertAdjacentElement('afterend', launch);

  const dialog = document.createElement('dialog');
  dialog.className = 'room-preview-dialog';
  dialog.setAttribute('aria-labelledby', 'room-preview-title');
  dialog.innerHTML = `<div class="room-preview-head"><div><h2 id="room-preview-title">Thử tranh trong không gian của bạn</h2><p>Chọn một căn phòng, kéo tranh đến vị trí mong muốn và điều chỉnh kích thước.</p></div><button type="button" class="room-preview-close" aria-label="Đóng xem trước">×</button></div>
    <div class="room-preview-layout"><div class="room-preview-stage"><canvas width="1000" height="650" aria-label="Ảnh phòng và tranh, kéo tranh để di chuyển"></canvas></div>
    <div class="room-preview-controls"><label>Không gian mẫu<select id="room-preview-select"><option value="living">Phòng khách</option><option value="bedroom">Phòng ngủ</option><option value="office">Phòng làm việc</option></select></label>
    <label>Hoặc dùng ảnh phòng của bạn<input type="file" accept="image/png,image/jpeg,image/webp" id="room-preview-upload"></label>
    <label>Kích thước tranh <span id="room-preview-scale-value">100%</span><input type="range" id="room-preview-scale" min="40" max="200" value="100" step="5"></label>
    <button type="button" class="secondary" id="room-preview-reset">Đặt lại vị trí</button><button type="button" id="room-preview-download">Tải ảnh xem trước PNG ↓</button>
    <small>Ảnh phòng chỉ được xử lý trên thiết bị này. Bản ghép mô phỏng tỷ lệ, không phản ánh kích thước thực tế.</small><p class="room-preview-status" role="status" aria-live="polite"></p></div></div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const select = $('#room-preview-select');
  const upload = $('#room-preview-upload');
  const range = $('#room-preview-scale');
  const scaleValue = $('#room-preview-scale-value');
  const status = $('.room-preview-status');
  const rooms = { living: 'assets/room-living.svg', bedroom: 'assets/room-bedroom.svg', office: 'assets/room-office.svg' };
  const state = { room: null, painting: null, x: 0.5, y: 0.39, scale: 1, dragging: false, dx: 0, dy: 0, uploadURL: null };

  function imageFrom(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không thể tải hình ảnh.'));
      img.src = src;
    });
  }
  function cover(img) {
    const ratio = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const width = img.naturalWidth * ratio, height = img.naturalHeight * ratio;
    ctx.drawImage(img, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }
  function paintingRect() {
    const img = state.painting;
    if (!img) return null;
    const maxWidth = canvas.width * .29 * state.scale, maxHeight = canvas.height * .44 * state.scale;
    const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    const width = img.naturalWidth * ratio, height = img.naturalHeight * ratio;
    return { x: state.x * canvas.width - width / 2, y: state.y * canvas.height - height / 2, width, height };
  }
  function draw() {
    if (!state.room || !state.painting) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cover(state.room);
    const r = paintingRect();
    ctx.save(); ctx.shadowColor = '#0006'; ctx.shadowBlur = 21; ctx.shadowOffsetY = 9;
    ctx.fillStyle = '#4c392d'; ctx.fillRect(r.x - 9, r.y - 9, r.width + 18, r.height + 18);
    ctx.restore();
    ctx.fillStyle = '#eee4d4'; ctx.fillRect(r.x - 4, r.y - 4, r.width + 8, r.height + 8);
    ctx.drawImage(state.painting, r.x, r.y, r.width, r.height);
  }
  async function setRoom(source) {
    try { const img = await imageFrom(source); state.room = img; draw(); status.textContent = 'Kéo tranh trên hình để thay đổi vị trí.'; }
    catch (err) { status.textContent = err.message; }
  }
  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
  }
  canvas.addEventListener('pointerdown', event => {
    const r = paintingRect(); if (!r) return;
    const p = point(event);
    if (p.x < r.x || p.x > r.x + r.width || p.y < r.y || p.y > r.y + r.height) return;
    state.dragging = true; state.dx = p.x - state.x * canvas.width; state.dy = p.y - state.y * canvas.height;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    const p = point(event), r = paintingRect();
    state.x = Math.max(r.width / (2 * canvas.width), Math.min(1 - r.width / (2 * canvas.width), (p.x - state.dx) / canvas.width));
    state.y = Math.max(r.height / (2 * canvas.height), Math.min(1 - r.height / (2 * canvas.height), (p.y - state.dy) / canvas.height));
    draw();
  });
  const stopDragging = () => { state.dragging = false; };
  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('lostpointercapture', stopDragging);
  select.addEventListener('change', () => { upload.value = ''; setRoom(rooms[select.value]); });
  upload.addEventListener('change', () => {
    const file = upload.files?.[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) { status.textContent = 'Chỉ hỗ trợ PNG, JPG, WebP tối đa 12 MB.'; upload.value = ''; return; }
    const url = URL.createObjectURL(file);
    imageFrom(url).then(img => {
      if (state.uploadURL) URL.revokeObjectURL(state.uploadURL);
      state.uploadURL = url; state.room = img; draw(); status.textContent = 'Đã chọn ảnh phòng riêng.';
    }).catch(() => { URL.revokeObjectURL(url); status.textContent = 'Không thể đọc ảnh phòng này.'; });
  });
  range.addEventListener('input', () => { state.scale = Number(range.value) / 100; scaleValue.textContent = range.value + '%'; draw(); });
  $('#room-preview-reset').addEventListener('click', () => { state.x = .5; state.y = .39; state.scale = 1; range.value = '100'; scaleValue.textContent = '100%'; draw(); });
  $('#room-preview-download').addEventListener('click', () => {
    if (!state.room || !state.painting) { status.textContent = 'Hình ảnh chưa sẵn sàng.'; return; }
    canvas.toBlob(blob => {
      if (!blob) { status.textContent = 'Không thể xuất ảnh.'; return; }
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'net-art-room-preview-' + artwork.id + '.png'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      status.textContent = 'Đã tạo ảnh PNG.';
    }, 'image/png');
  });
  $('.room-preview-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  launch.addEventListener('click', () => {
    dialog.showModal();
    if (!state.painting) { imageFrom('assets/' + artwork.image).then(img => { state.painting = img; draw(); }).catch(() => { status.textContent = 'Không thể tải ảnh tác phẩm.'; }); }
    if (!state.room) setRoom(rooms.living);
  });
  window.addEventListener('pagehide', () => { if (state.uploadURL) URL.revokeObjectURL(state.uploadURL); });
})();
