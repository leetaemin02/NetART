const $ = selector => document.querySelector(selector);
let noticeTimer;
const notice = text => {
  const element = $('#notice');
  clearTimeout(noticeTimer);
  element.textContent = text;
  element.classList.toggle('visible', Boolean(text));
  if (text) noticeTimer = setTimeout(() => { element.classList.remove('visible'); element.textContent = ''; }, 5000);
};
let artworks = [], categories = [], artistProfile = null;
async function request(path, method = 'GET', data) {
  const response = await fetch('/api/admin/' + path, { method, credentials: 'same-origin', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || `HTTP ${response.status}`);
  return result;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const entry = (label, detail, type, id) => `<div class="row"><div><strong>${esc(label)}</strong><small>${esc(detail)}</small></div><div class="actions"><button class="secondary" data-action="edit" data-type="${type}" data-id="${id}">Sửa</button><button class="danger" data-action="delete" data-type="${type}" data-id="${id}">Xóa</button></div></div>`;
async function refresh() {
  [categories, artworks, artistProfile] = await Promise.all([request('categories'), request('artworks'), request('artist')]);
  const dashboard = await request('dashboard');
  $('#summary').innerHTML = [['Tổng tranh',dashboard.total],['Còn bán',dashboard.available],['Đã bán',dashboard.sold],['Bản nháp / Ẩn',dashboard.unpublished]].map(([label,value])=>`<div><b>${value}</b><br>${label}</div>`).join('');
  $('#artworkList').innerHTML = artworks.length ? artworks.map(a => entry(a.title, `${a.artworkCode} · ${a.saleStatus} · ${a.status}`, 'artwork', a._id)).join('') : '<p>Chưa có tranh. Hãy thêm tác phẩm đầu tiên.</p>';
  $('#categoryList').innerHTML = categories.length ? categories.map(c => entry(c.name, `${c.slug} · ${c.status}`, 'category', c._id)).join('') : '<p>Chưa có danh mục.</p>';
  $('#artworkForm select[name="categoryId"]').innerHTML = '<option value="">Chọn danh mục</option>' + categories.map(c => `<option value="${c._id}">${esc(c.name)}</option>`).join('');
  renderArtist();
}
function renderArtist() {
  const profile = artistProfile || {}, form = $('#artistForm');
  for (const field of ['name','artistName','location','shortIntroduction','biography']) form.elements[field].value = profile[field] || '';
  form.elements.specialties.value = (profile.specialties || []).join(', ');
  for (const field of ['phone','email','zaloUrl','facebookUrl','instagramUrl']) form.elements[field].value = profile.contact?.[field] || '';
  form.elements.avatarUrl.value = profile.avatar?.url || '';
  form.elements.coverImageUrl.value = profile.coverImage?.url || '';
  form.elements.galleryImageUrls.value = (profile.galleryImages || []).map(img => img.url).join('\n');
  const published = artworks.filter(a => a.status === 'published');
  const selected = new Set((profile.featuredArtworkIds || []).map(String));
  $('#artistFeaturedList').innerHTML = published.length ? published.map(a => `<label><input type="checkbox" name="featuredArtwork" value="${esc(a._id)}" ${selected.has(a._id) ? 'checked' : ''}><img src="${esc(a.images?.[0]?.url || '')}" alt="" loading="lazy"><span>${esc(a.title)}</span></label>`).join('') : '<p>Chưa có tranh công khai. Hãy xuất bản tranh trước khi chọn.</p>';
  previewArtistPhotos();
}
function previewArtistPhotos() {
  const urls = $('#artistForm').elements.galleryImageUrls.value.split('\n').map(s => s.trim()).filter(Boolean);
  const root = $('#artistPhotoPreview'); root.replaceChildren();
  for (const src of urls) { const img = document.createElement('img'); img.src = src; img.alt = 'Xem trước ảnh giới thiệu'; img.loading = 'lazy'; root.append(img); }
}
function reset(type) {
  const form = $(`#${type}Form`); form.reset(); form.elements._id.value = '';
  $(`#${type}FormTitle`).textContent = type === 'artwork' ? 'Thêm tranh mới' : 'Thêm danh mục';
}
function edit(type, id) {
  const item = (type === 'artwork' ? artworks : categories).find(x => x._id === id);
  if (!item) return;
  const form = $(`#${type}Form`); reset(type);
  for (const [field, value] of Object.entries(item)) {
    if (!form.elements[field] || field === 'imageUrls') continue;
    if (form.elements[field].type === 'checkbox') form.elements[field].checked = !!value;
    else form.elements[field].value = value ?? '';
  }
  if (type === 'artwork') form.elements.imageUrls.value = (item.images || []).map(i => i.url).join('\n');
  $(`#${type}FormTitle`).textContent = 'Chỉnh sửa: ' + (item.title || item.name);
  form.scrollIntoView({ behavior: 'smooth' });
}
async function save(type, form) {
  const fields = Object.fromEntries(new FormData(form));
  const id = fields._id; delete fields._id;
  const collection = type === 'artwork' ? 'artworks' : 'categories';
  if (type === 'artwork') {
    fields.price = fields.price === '' ? null : Number(fields.price);
    fields.yearCreated = fields.yearCreated === '' ? null : Number(fields.yearCreated);
    fields.showPrice = form.elements.showPrice.checked;
    fields.featured = form.elements.featured.checked;
    fields.images = fields.imageUrls.split('\n').map(s=>s.trim()).filter(Boolean).map((url,index)=>({url,isPrimary:index===0,alt:fields.title,displayOrder:index+1}));
    delete fields.imageUrls;
  } else fields.displayOrder = Number(fields.displayOrder);
  if (!fields.slug) delete fields.slug;
  await request(`${collection}${id ? '/' + id : ''}`, id ? 'PATCH' : 'POST', fields);
  notice('Đã lưu thành công.'); reset(type); await refresh();
}
$('#loginForm').addEventListener('submit', async e => { e.preventDefault(); try { await request('auth/login','POST',Object.fromEntries(new FormData(e.target))); $('#loginCard').hidden=true; $('#workspace').hidden=false; $('#logout').hidden=false; notice('Đăng nhập thành công.'); await refresh(); } catch(err) { notice(err.message); } });
$('#logout').addEventListener('click', async () => { try { await request('auth/logout','POST'); location.reload(); } catch(err) { notice(err.message); } });
document.querySelectorAll('.admin-sidebar [data-tab]').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.admin-sidebar [data-tab]').forEach(b=>{b.classList.toggle('selected',b===btn);if(b===btn)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}); for(const tab of ['artworks','categories','artist']) $(`#${tab}Tab`).hidden=btn.dataset.tab!==tab; }));
$('#artistForm').elements.galleryImageUrls.addEventListener('input', previewArtistPhotos);
$('#artistForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const get = name => form.elements[name].value.trim();
  const payload = {
    name: get('name'), artistName: get('artistName'), location: get('location'),
    shortIntroduction: get('shortIntroduction'), biography: get('biography'),
    specialties: get('specialties').split(',').map(s=>s.trim()).filter(Boolean),
    avatar: { url: get('avatarUrl') }, coverImage: { url: get('coverImageUrl') },
    galleryImages: get('galleryImageUrls').split('\n').map(s=>s.trim()).filter(Boolean).map(url=>({url})),
    featuredArtworkIds: Array.from(form.querySelectorAll('[name="featuredArtwork"]:checked'), input=>input.value),
    contact: Object.fromEntries(['phone','email','zaloUrl','facebookUrl','instagramUrl'].map(key=>[key,get(key)]))
  };
  try { artistProfile = await request('artist', 'PATCH', payload); notice('Đã cập nhật trang giới thiệu họa sĩ.'); renderArtist(); }
  catch (error) { notice(error.message); }
});
$('#resetArtwork').onclick = () => reset('artwork'); $('#resetCategory').onclick = () => reset('category');
for (const type of ['artwork','category']) $(`#${type}Form`).addEventListener('submit', async e => { e.preventDefault(); try { await save(type,e.target); } catch(err) { notice(err.message); } });
$('#workspace').addEventListener('click', async e => { const btn = e.target.closest('[data-action]'); if(!btn)return; const {action,type,id}=btn.dataset; if(action==='edit')return edit(type,id); if(!confirm('Bạn chắc chắn muốn xóa?'))return; try { await request(`${type==='artwork'?'artworks':'categories'}/${id}`,'DELETE'); notice('Đã xóa.'); await refresh(); }catch(err){notice(err.message);} });
