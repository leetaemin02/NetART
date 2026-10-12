const artworks = [
  {id:'mien-yen',name:'Một miền bình yên',medium:'Sơn dầu',type:'oil',size:'60 × 80 cm',price:6800000,image:'landscape.svg',description:'Sắc đất ấm hòa cùng những lớp đồi xa, dành cho một không gian trầm tĩnh.'},
  {id:'nhip-mau',name:'Nhịp màu tự do',medium:'Acrylic',type:'acrylic',size:'70 × 90 cm',price:5200000,image:'abstract.svg',description:'Những hình khối hữu cơ và sắc màu đất nung tạo nên một nhịp điệu phóng khoáng.'},
  {id:'ngay-nhe',name:'Một ngày thật nhẹ',medium:'Màu nước',type:'watercolor',size:'40 × 60 cm',price:2900000,image:'botanical.svg',description:'Một bình hoa giản dị trên nền giấy ấm, gợi một góc nhỏ an yên trong nhà.'}
];
let favorites = new Set();
try { const stored=JSON.parse(localStorage.getItem('net-art-favorites') || '[]'); if(Array.isArray(stored)) favorites=new Set(stored.filter(id=>artworks.some(a=>a.id===id))); } catch {}
let filter='all', savedOnly=false;
const money=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
function render(){
 const query=normalize(document.querySelector('#search').value);
 const items=artworks.filter(a=>(filter==='all'||a.type===filter)&&(!savedOnly||favorites.has(a.id))&&normalize(a.name+' '+a.medium).includes(query));
 document.querySelector('#art-grid').innerHTML=items.map(a=>`<article class="artwork"><button class="art-image" data-detail="${a.id}" aria-label="Xem ${a.name}"><img src="assets/${a.image}" alt="${a.name} — tranh minh họa" loading="lazy"></button><button class="heart" data-favorite="${a.id}" aria-label="Yêu thích ${a.name}" aria-pressed="${favorites.has(a.id)}">${favorites.has(a.id)?'♥':'♡'}</button><h3>${a.name}</h3><p>${a.medium} · ${a.size}</p><div class="art-meta"><strong>${money(a.price)}</strong><button class="detail-link" data-detail="${a.id}">Xem tác phẩm ↗</button></div></article>`).join('');
 document.querySelector('#empty').hidden=items.length!==0;
 document.querySelector('#saved-count').textContent=favorites.size;
 document.querySelector('.saved').setAttribute('aria-pressed',String(savedOnly));
}
function setFilter(value){filter=value;savedOnly=false;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));render();}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('#search').value='';setFilter(b.dataset.category);}));
document.querySelector('#search').addEventListener('input',render);
document.querySelector('.saved').addEventListener('click',()=>{savedOnly=!savedOnly;filter='all';document.querySelector('#search').value='';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')));render();document.querySelector('#collection').scrollIntoView();});
document.querySelector('#art-grid').addEventListener('click',e=>{const favorite=e.target.closest('[data-favorite]');if(favorite){const id=favorite.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);try{localStorage.setItem('net-art-favorites',JSON.stringify([...favorites]));}catch{}render();return;}const button=e.target.closest('[data-detail]');if(button){const a=artworks.find(a=>a.id===button.dataset.detail);document.querySelector('#detail-content').innerHTML=`<img src="assets/${a.image}" alt="${a.name} — tranh minh họa"><p class="eyebrow">TÁC PHẨM MINH HỌA</p><h2>${a.name}</h2><p>${a.medium} · ${a.size}</p><p>${a.description}</p><strong>${money(a.price)}</strong><p><small>Tranh và giá dùng để duyệt thiết kế. Chưa có tồn kho, thanh toán hoặc đặt mua.</small></p>`;document.querySelector('#detail').showModal();}});
document.querySelector('.menu').addEventListener('click',e=>{const expanded=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!expanded));document.querySelector('nav').classList.toggle('open',!expanded);});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('nav').classList.remove('open');document.querySelector('.menu').setAttribute('aria-expanded','false');}));
document.querySelectorAll('dialog .close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelector('#consult-button').addEventListener('click',()=>document.querySelector('#consult-dialog').showModal());
document.querySelector('#consult-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);const index=data.get('budget')==='Dưới 5 triệu đồng'?2:data.get('budget')==='5–10 triệu đồng'?0:1;document.querySelector('#consult-result').textContent=`Với ${data.get('space').toLowerCase()}, bạn có thể bắt đầu từ “${artworks[index].name}”. Hãy đo khoảng tường trước khi chọn kích thước. Đây là gợi ý minh họa, không phải báo giá.`;});
render();
