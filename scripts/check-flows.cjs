const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
function load(page,search=''){
 const nodes=new Map(),events=new Map();
 function node(selector){if(!nodes.has(selector))nodes.set(selector,{value:'',checked:false,hidden:false,innerHTML:'',textContent:'',dataset:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(name,value){this[name]=value;},classList:{toggle(){},contains(){return false;}},showModal(){this.open=true;},close(){this.open=false;},focus(){},select(){},remove(){}});return nodes.get(selector);}
 const allowed=new Set(['#site-header','#site-footer','.menu','header nav','#saved-count']);
 if(page==='catalog')for(const s of ['#medium','#category','#price','#sort','#saved-only','#search','#art-grid','#empty','#result-count','#catalog-filters','#reset-filters'])allowed.add(s);
 if(page==='artist')allowed.add('#featured-grid');
 if(page==='artwork')for(const s of ['#artwork-content','#order-message','#order-button','#order-dialog','#zoom-image','#zoom','#zoom-dialog','#copy-message','#copy-status'])allowed.add(s);
 const document={body:{dataset:{page}},querySelector:s=>allowed.has(s)?node(s):null,querySelectorAll:()=>[],addEventListener(type,fn){events.set(type,fn);}};
 const context=vm.createContext({window:{},document,localStorage:{getItem:()=>null,setItem(){}},URLSearchParams,Intl,location:{search,pathname:'/'+page+'.html'},history:{replaceState(){}},navigator:{clipboard:{writeText:async()=>{}}}});
 vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
 return {node,events,render:()=>vm.runInContext('render()',context)};
}
let c=load('catalog');assert.equal(c.node('#result-count').textContent,'3 tác phẩm');
c.node('#search').value='binh yen';c.render();assert.match(c.node('#art-grid').innerHTML,/Một miền bình yên/);assert.equal(c.node('#result-count').textContent,'1 tác phẩm');
c=load('catalog','?medium=watercolor&price=under5');assert.match(c.node('#art-grid').innerHTML,/Một ngày thật nhẹ/);assert.equal(c.node('#result-count').textContent,'1 tác phẩm');
c=load('catalog','?category=abstract&medium=oil');assert.equal(c.node('#empty').hidden,false);
c=load('catalog','?sort=asc');assert.ok(c.node('#art-grid').innerHTML.indexOf('Một ngày thật nhẹ')<c.node('#art-grid').innerHTML.indexOf('Nhịp màu tự do'));
c=load('catalog','?saved=1');assert.equal(c.node('#result-count').textContent,'0 tác phẩm');
let a=load('artist');assert.equal(a.node('#featured-grid').innerHTML,'');
a=load('artwork','?id=mien-yen');assert.match(a.node('#order-message').value,/MIEN-YEN/);assert.match(a.node('#artwork-content').innerHTML,/0339667601/);a.node('#order-button').listeners.click();assert.equal(a.node('#order-dialog').open,true);
a=load('artwork','?id=missing');assert.match(a.node('#artwork-content').innerHTML,/Không tìm thấy tác phẩm/);
for(const file of ['index.html','catalog.html','artist.html','artwork.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');assert.ok(html.indexOf('src="data.js"')<html.indexOf('src="app.js"'));
 for(const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)){const target=match[1];if(!/^(https?:|#)/.test(target))assert.ok(fs.existsSync(path.join(root,target)),`${file}: missing ${target}`);}
}
console.log('PASS: catalog search, combined filters, sorting, empty state, favorites view, artist API placeholder, detail/order dialog, invalid artwork and local file references.');
