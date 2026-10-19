/* TrummCards Mobile Cloud TEST 1.1 RC v1.1.0-test.2 – static GitHub Pages client; only a public key.
 * Data is readable/writeable only with a Supabase JWT and the database owner RLS guard.
 * Test data ONLY. A connection is required to write; no offline operation replay.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id), f=(form,name)=>form.elements.namedItem(name), val=(form,name)=>String(f(form,name)?.value??'').trim();
const STORE='trummcards-mobile-test11-session-v1',PENDING='trummcards-mobile-test11-pending-v1';
const PROJECT='cpycfxolqpidfjbhhsmr';
const WRITES_ENABLED=true; // Release gate: allow writes only after approved backups and GO LIVE.
const NO_WRITES='TEST-Version: Echtdaten und Buchungen bleiben bis zur Releasefreigabe gesperrt.';
let ROOT='',KEY='',session=null,authCheckPromise=null,refreshPromise=null,loading=false,busy=false,activePage='home',lastPurchaseEntry='unit',pendingImage=null,imageObjects=[];
let state={products:[],inventory:[],lots:[],sales:[],images:[],productImages:[],shipments:[],feeProfiles:[],cashEntries:[]};
let articleImageFile=null,articleImagePreviewUrl=null,thumbnailObserver=null;
let catalogPicker11=null,setPicker11=null,financeUI11=null,shippingUI11=null,marketUI11=null,feesUI11=null,cashUI11=null;
const thumbnailCache=new Map(),thumbnailLoading=new Map();
const API_HEADERS={'Content-Type':'application/json'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const euro=n=>Number(n??0).toLocaleString('de-AT',{style:'currency',currency:'EUR'});
const numInput=n=>money(n).toFixed(2).replace('.',',');
function parseMoney(v,optional=false){let s=String(v??'').trim().replace(/[\s\u00a0€]/g,'');if(!s&&optional)return 0;if(!s)throw Error('Bitte einen gültigen Betrag eingeben.');if(s.includes(',')&&s.includes('.')){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replaceAll('.','').replace(',','.');else s=s.replaceAll(',','');}else if(s.includes(','))s=s.replace(',','.');if(!/^\d+(?:\.\d{1,4})?$/.test(s))throw Error('Betrag ungültig. Beispiel: 19,90');const n=Number(s);if(!Number.isFinite(n)||n<0||n>999999999999.99)throw Error('Betrag außerhalb des erlaubten Bereichs.');return n;}
function parseCount(v){const s=String(v??'').trim();if(!/^[1-9]\d*$/.test(s)||Number(s)>1e6)throw Error('Stückzahl muss eine positive ganze Zahl sein.');return Number(s);}
function dateValid(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Datum fehlt oder ist ungültig.');return s;}
const errorText=e=>{let s=String(e?.message||e||'Unbekannter Fehler');if(e?.code==='23505'||/duplicate key|tc_products_sku_unique/i.test(s))return 'Artikelnummer bereits verwendet bitte andere wählen.';if(/NetworkError|Failed to fetch|Load failed|fetch failed|network request failed/i.test(s))return 'Keine Verbindung zur Cloud. Bitte Internetverbindung prüfen.';return s.length>320?s.slice(0,320)+' …':s;};
function notice(message,type='info'){const el=$('toast');el.hidden=false;el.className='toast '+type;el.textContent=message;window.scrollTo({top:0,behavior:'smooth'});}
function clearNotice(){$('toast').hidden=true;}
function connected(label,kind='idle'){$('connLabel').textContent=label;$('connDot').className='dot '+kind;}
function showLogin(){session=null;$('loginScreen').hidden=false;$('appScreen').hidden=true;$('bottomNav').hidden=true;connected('Anmeldung');}
function showApp(){$('loginScreen').hidden=true;$('appScreen').hidden=false;$('bottomNav').hidden=false;connected('Online','online');}
function persistSession(data){session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600),user:data.user||session?.user};localStorage.setItem(STORE,JSON.stringify(session));}
function clearSession(){session=null;localStorage.removeItem(STORE);}
function restoreSession(){try{const s=JSON.parse(localStorage.getItem(STORE));if(s&&s.access_token&&s.refresh_token&&s.user)session=s;}catch{clearSession();}}
async function raw(url,options={}){let res;try{res=await fetch(url,options);}catch(e){throw Error('Keine Cloud-Verbindung: '+errorText(e));}let body=null;const type=res.headers.get('content-type')||'';if(type.includes('application/json')){try{body=await res.json();}catch{}}else{const t=await res.text();if(t)body=t.slice(0,240);}if(!res.ok){const err=new Error(body?.msg||body?.message||body?.error_description||body?.error||`Cloud-Fehler ${res.status}`);err.status=res.status;err.code=body?.code;throw err;}return body;}
function apiBase(){return ROOT.replace(/\/$/,'');}
async function refreshToken(){if(refreshPromise)return refreshPromise;const rt=session?.refresh_token;if(!rt)throw Error('Bitte erneut anmelden.');refreshPromise=(async()=>{const data=await raw(apiBase()+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{...API_HEADERS,apikey:KEY},body:JSON.stringify({refresh_token:rt})});persistSession(data);return session.access_token;})();try{return await refreshPromise;}catch(e){clearSession();showLogin();throw Error('Deine Anmeldung ist abgelaufen. Bitte erneut anmelden.');}finally{refreshPromise=null;}}
async function getToken(){if(!session?.access_token)throw Error('Bitte zuerst anmelden.');if(Number(session.expires_at||0)*1000<Date.now()+65000)return refreshToken();return session.access_token;}
async function authorizedRequest(path,opts={},retry=true){const token=await getToken();const res=await fetch(apiBase()+path,{...opts,headers:{apikey:KEY,Authorization:'Bearer '+token,...opts.headers}}).catch(e=>{throw Error('Cloud nicht erreichbar: '+errorText(e));});if(res.status===401&&retry){await refreshToken();return authorizedRequest(path,opts,false);}let data=null;try{const text=await res.text();if(text)data=JSON.parse(text);}catch{}if(!res.ok){const err=new Error(data?.message||data?.msg||data?.error_description||data?.error||'Cloud-Fehler '+res.status);err.code=data?.code;err.status=res.status;throw err;}return data;}
async function rpc(name,args={}){return authorizedRequest('/rest/v1/rpc/'+encodeURIComponent(name),{method:'POST',headers:API_HEADERS,body:JSON.stringify(args)});}
async function tableGet(table,query){return authorizedRequest('/rest/v1/'+table+'?'+query,{headers:{Accept:'application/json'}});}
async function apiUser(){return authorizedRequest('/auth/v1/user',{headers:{Accept:'application/json'}});}
async function checkAccount(){const u=await apiUser();if(!u?.id)throw Error('Anmeldung nicht erkannt.');const allow=await rpc('tc_is_authorized');if(allow!==true)throw Error('Dieses Benutzerkonto ist nicht für TrummCards freigeschaltet.');if(session)session.user=u;localStorage.setItem(STORE,JSON.stringify(session));return u;}
async function login(event){event.preventDefault();const form=event.currentTarget;const btn=$('signInBtn');btn.disabled=true;clearNotice();try{const email=val(form,'email'),password=val(form,'password');const data=await raw(apiBase()+'/auth/v1/token?grant_type=password',{method:'POST',headers:{...API_HEADERS,apikey:KEY},body:JSON.stringify({email,password})});persistSession(data);const u=await checkAccount();f(form,'password').value='';$('accountEmail').textContent=u.email||'TrummCards-Konto';showApp();await refreshAll();navigate('home');notice('Angemeldet – Lagerdaten aus Supabase synchronisiert.','success');}catch(e){notice(errorText(e),'error');if(session){await signOut(false);}}finally{btn.disabled=false;}}
async function signOut(goLogin=true){if(session){try{await authorizedRequest('/auth/v1/logout',{method:'POST'});}catch{}}clearSession();state={products:[],inventory:[],lots:[],sales:[],images:[],productImages:[],shipments:[],feeProfiles:[],cashEntries:[]};clearThumbnailCache();imageObjects.forEach(u=>URL.revokeObjectURL(u));imageObjects=[];showLogin();if(goLogin)notice('Du wurdest abgemeldet.','success');}
function showPage(name){const allowed=['home','article','purchase','sale','sales','photos','finance','more'];if(!allowed.includes(name))name='home';activePage=name;for(const id of allowed)$('page-'+id).hidden=id!==name;for(const btn of document.querySelectorAll('[data-go]'))btn.classList.toggle('active',btn.dataset.go===name);const titles={home:'Übersicht',article:'Artikel',purchase:'Einkauf',sale:'Verkauf',sales:'Buchungen',photos:'Artikelbilder',finance:'Finanzen',more:'Einstellungen'};$('screenTitle').textContent=titles[name];window.scrollTo({top:0,behavior:'instant'});if(name==='photos')renderPhotos().catch(e=>notice(errorText(e),'error'));if(name==='finance')financeUI11?.render();}
function navigate(name){if(name==='article'&&activePage!=='article')resetArticle();showPage(name);}
function productById(id){return state.products.find(p=>p.id===id);}
function productName(id){return productById(id)?.name||'Unbekannter Artikel';}
function available(id){return Number(state.inventory.find(x=>x.product_id===id)?.available_qty||0);}
function fifoPreview(productId,quantity){const list=state.lots.filter(l=>l.product_id===productId&&Number(l.available_qty)>0).sort((a,b)=>String(a.bought_on).localeCompare(String(b.bought_on))||String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id)));let remaining=quantity,cost=0;for(const l of list){if(!remaining)break;const n=Math.min(remaining,Number(l.available_qty));const rest=money(Number(l.purchase_total)+Number(l.extra_cost)-Number(l.allocated_cost));const c=n===Number(l.available_qty)?rest:Math.min(money((Number(l.purchase_total)+Number(l.extra_cost))/Number(l.purchased_qty)*n),rest);cost=money(cost+c);remaining-=n;}return {cost,missing:remaining};}
function profit(s){return money(Number(s.price||0)+Number(s.shipping_income||0)-Number(s.shipping_cost||0)-Number(s.fees||0)-Number(s.other_cost||0)-Number(s.cogs_total||0));}
function updateOptions(element,rows,makeLabel,placeholder){const chosen=element.value;const sig=JSON.stringify(rows.map(p=>[p.id,makeLabel(p)]));if(element.dataset.signature===sig)return;element.dataset.signature=sig;element.replaceChildren();const opt=document.createElement('option');opt.value='';opt.textContent=placeholder;element.append(opt);for(const p of rows){const option=document.createElement('option');option.value=p.id;option.textContent=makeLabel(p);element.append(option);}if(rows.some(r=>r.id===chosen))element.value=chosen;}
async function refreshAll(opts={}){if(!session||loading||document.visibilityState==='hidden')return;loading=true;connected('Synchronisiere …');try{const [products,inventory,lots,sales,images,productImages,shipments,feeProfiles,cashEntries]=await Promise.all([
 tableGet('tc_products','select=id,sku,name,set_name,language,card_condition,card_number,rarity,card_variant,storage_location,grading_company,grading_grade,grading_certificate,catalog_card_id,catalog_image_url,market_price_eur,market_price_source,market_price_checked_at,note,created_at&order=name.asc&limit=1000'),
 tableGet('tc_inventory','select=product_id,available_qty,remaining_cost&limit=1000'),
 tableGet('tc_purchase_lots','select=id,product_id,bought_on,purchased_qty,available_qty,purchase_total,extra_cost,allocated_cost,source,note,created_at&order=bought_on.asc&limit=1000'),
 tableGet('tc_sales','select=id,product_id,sold_on,qty,price,shipping_income,shipping_cost,fees,other_cost,cogs_total,platform,note,status,created_at&order=created_at.desc&limit=1000'),
 tableGet('tc_lot_images','select=id,lot_id,storage_path,mime_type,display_order&limit=1000'),
 tableGet('tc_product_images','select=id,product_id,storage_path,mime_type,created_at&limit=1000'),
 tableGet('tc_sale_shipments','select=sale_id,shipping_status,carrier,tracking_number,order_reference,shipped_on,tracking_url,updated_at&limit=1000'),
 tableGet('tc_platform_fee_profiles','select=id,platform,percent_rate,fixed_eur,include_shipping,updated_at&limit=1000'),
 tableGet('tc_cash_entries','select=id,payment_on,direction,category,amount_eur,description,document_reference,sale_id,purchase_lot_id,created_at&order=payment_on.desc&limit=1000')
 ]);state={products,inventory,lots,sales,images,productImages,shipments,feeProfiles,cashEntries};renderData();const at=new Date().toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});$('lastUpdated').textContent=at;connected('Stand '+at,'online');if(opts.toast)notice('Cloud-Daten aktualisiert.','success');}catch(e){connected('Offline?','problem');if(opts.toast)notice(errorText(e),'error');console.error('TrummCards mobile sync:',e);}finally{loading=false;}}
function renderData(){const {products,inventory,sales,lots}=state;
 $('statProducts').textContent=products.length.toLocaleString('de-AT');$('statPieces').textContent=inventory.reduce((a,x)=>a+Number(x.available_qty),0).toLocaleString('de-AT');$('statValue').textContent=euro(inventory.reduce((a,x)=>a+Number(x.remaining_cost),0));$('statProfit').textContent=euro(sales.filter(s=>s.status==='booked').reduce((a,x)=>a+profit(x),0));
 renderProducts();renderHistory();const name=p=>p.name+' · '+(p.sku||'ohne SKU');updateOptions(f($('purchaseForm'),'product'),products,name,'Artikel wählen');updateOptions(f($('saleForm'),'product'),products.filter(p=>available(p.id)>0),p=>p.name+' ('+available(p.id)+' Stk.)','Artikel mit Bestand wählen');updateOptions(f($('photoForm'),'lot'),lots,l=>productName(l.product_id)+' · '+l.bought_on+' · '+l.id.slice(0,6),'Einkauf wählen');updatePurchasePreview();updateSalePreview();renderPending();financeUI11?.render();shippingUI11?.render();feesUI11?.render();cashUI11?.render();
 }

function imagePathForProduct(productId){
 const hero=state.productImages.find(i=>i.product_id===productId);
 if(hero)return hero.storage_path;
 const lotIds=new Set(state.lots.filter(l=>l.product_id===productId).map(l=>l.id));
 const ownPhoto=state.images.find(i=>lotIds.has(i.lot_id))?.storage_path;
 if(ownPhoto)return ownPhoto;
 const catalog=productById(productId)?.catalog_image_url||'';
 return /^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(catalog)?catalog:null;
}
function filteredInventory11(){
 const term=$('search').value.trim().toLocaleLowerCase('de');
 const langFilter=$('inventoryLanguageFilter');
 const langs=[...new Set(state.products.map(p=>p.language).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
 const sig=JSON.stringify(langs);
 if(langFilter.dataset.optionsSignature!==sig){
  const old=langFilter.value;langFilter.replaceChildren();
  const all=document.createElement('option');all.value='';all.textContent='Alle Sprachen';langFilter.append(all);
  for(const value of langs){const option=document.createElement('option');option.value=value;option.textContent=value;langFilter.append(option);}
  langFilter.value=langs.includes(old)?old:'';
  langFilter.dataset.optionsSignature=sig;
 }
 const language=langFilter.value,stock=$('inventoryStockFilter').value,sort=$('inventorySort').value;
 const products=state.products.filter(p=>{
  const qty=available(p.id);
  if(language&&p.language!==language)return false;
  if(stock==='available'&&qty<=0)return false;
  if(stock==='empty'&&qty>0)return false;
  const content=['name','sku','set_name','card_number','rarity','card_variant','storage_location','card_condition','grading_company','grading_grade','grading_certificate'].map(k=>p[k]||'').join(' ').toLocaleLowerCase('de');
  return !term||term.split(/\s+/).every(t=>content.includes(t));
 });
 products.sort((a,b)=>{
  if(sort==='stock')return available(b.id)-available(a.id)||a.name.localeCompare(b.name,'de');
  if(sort==='set')return (a.set_name||'').localeCompare(b.set_name||'','de')||a.name.localeCompare(b.name,'de');
  if(sort==='location')return (a.storage_location||'').localeCompare(b.storage_location||'','de')||a.name.localeCompare(b.name,'de');
  return a.name.localeCompare(b.name,'de');
 });
 $('inventoryFilterCount').textContent=products.length+' von '+state.products.length+' Artikeln';
 return products;
}
function renderProducts(){
 const list=$('productsList');
 const ps=filteredInventory11();
 list.innerHTML=ps.length?ps.map(p=>{
  const inv=state.inventory.find(x=>x.product_id===p.id);
  const avgCost=Number(inv?.available_qty||0)>0?Number(inv.remaining_cost)/Number(inv.available_qty):null;
  const market=p.market_price_eur==null?null:Number(p.market_price_eur);
  const estimate=market==null?'':'<small>Marktwert*: '+euro(market)+(avgCost==null?'':' · Differenz '+euro(market-avgCost)+' vor Gebühren/St.')+'</small>';
  const thumb=imagePathForProduct(p.id)?
   '<button type="button" class="list-image-button" data-photo-open="'+p.id+'" title="Artikelbild vergrößern"><img data-thumb="'+p.id+'" alt="Bild von '+esc(p.name)+'" loading="eager" decoding="async" width="64" height="74" hidden><span class="image-placeholder" aria-hidden="true">▧</span></button>':
   '<div class="list-image-button" aria-label="Noch kein Artikelbild"><span class="image-placeholder">▧</span></div>';
  return '<div class="list-card">'+thumb+'<div class="item-main"><strong>'+esc(p.name)+'</strong><small>'+esc(p.set_name||'Ohne Set')+(p.card_number?' · Nr. '+esc(p.card_number):'')+' · '+esc(p.sku||'ohne SKU')+'</small>'+(p.storage_location?'<small>📦 '+esc(p.storage_location)+'</small>':'')+estimate+'<button type="button" class="tiny-btn" data-edit="'+p.id+'">Bearbeiten</button></div><div class="item-end"><b>'+Number(inv?.available_qty||0)+' Stk.</b><small>'+euro(inv?.remaining_cost||0)+'</small></div></div>';
 }).join(''):'<div class="empty">Keine Artikel gefunden. Erfasse deinen ersten Testartikel.</div>';
 prepareInventoryThumbnails();
}
function clearThumbnailCache(){
 if(thumbnailObserver){thumbnailObserver.disconnect();thumbnailObserver=null;}
 for(const url of thumbnailCache.values())URL.revokeObjectURL(url);
 thumbnailCache.clear();thumbnailLoading.clear();
}
async function privateImageUrl(path,quality='low'){
 if(/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(path))return path+'/'+(quality==='high'?'high':'low')+'.webp';
 if(thumbnailCache.has(path))return thumbnailCache.get(path);
 if(thumbnailLoading.has(path))return thumbnailLoading.get(path);
 const task=(async()=>{
  const token=await getToken();
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(apiBase()+'/storage/v1/object/authenticated/trummcards-lot-images/'+encoded,{headers:{apikey:KEY,Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)throw Error('Bild konnte nicht geladen werden.');
  const objectUrl=URL.createObjectURL(await response.blob());
  thumbnailCache.set(path,objectUrl);return objectUrl;
 })();
 thumbnailLoading.set(path,task);
 try{return await task;}finally{thumbnailLoading.delete(path);}
}
async function fillThumbnail(img){
 const path=imagePathForProduct(img.dataset.thumb);
 if(!path||!img.isConnected)return;
 try{
  const url=await privateImageUrl(path);
  if(!img.isConnected||imagePathForProduct(img.dataset.thumb)!==path)return;
  img.src=url;img.hidden=false;
  if(img.nextElementSibling)img.nextElementSibling.hidden=true;
 }catch(e){console.info('Vorschaubild:',errorText(e));}
}
function prepareInventoryThumbnails(){
 if(thumbnailObserver){thumbnailObserver.disconnect();thumbnailObserver=null;}
 // The image starts with [hidden]. Observing that element causes a deadlock:
 // it cannot intersect the viewport until the image has already loaded.
 // Observe its visible button container instead, and eagerly load the first cards.
 const targets=[...document.querySelectorAll('#productsList img[data-thumb]')]
  .map(img=>img.closest('.list-image-button')).filter(Boolean);
 const load=target=>{
  const img=target.querySelector('img[data-thumb]');
  if(img)void fillThumbnail(img);
 };
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target);}
   }
  },{rootMargin:'300px'});
  thumbnailObserver=observer;
  targets.forEach((target,index)=>{
   if(index<12)load(target); // Always show the first visible cards, including in iOS PWA.
   else observer.observe(target);
  });
 }else targets.forEach(load);
}
async function openProductImage(id){
 const path=imagePathForProduct(id);if(!path)return;
 try{
  const url=await privateImageUrl(path,'high');
  $('viewerImage').src=url;$('viewerCaption').textContent=productName(id);
  if(!$('imageViewer').open)$('imageViewer').showModal();
 }catch(e){notice(errorText(e),'error');}
}
function previewArticlePhoto(file){
 if(articleImagePreviewUrl)URL.revokeObjectURL(articleImagePreviewUrl);
 articleImagePreviewUrl=null;articleImageFile=file||null;
 const img=$('articleImagePreview'),caption=$('articleImageSelection');
 img.hidden=true;img.removeAttribute('src');
 caption.textContent=file?file.name+' ('+Math.ceil(file.size/1024)+' KB) – wird mit dem Artikel gespeichert.':'Noch kein neues Bild ausgewählt.';
 if(file){articleImagePreviewUrl=URL.createObjectURL(file);img.src=articleImagePreviewUrl;img.hidden=false;}
}
async function uploadProductPhoto(productId,file){
 const jpg=await processPhoto(file);
 const photoId=crypto.randomUUID(),path=session.user.id+'/products/'+productId+'/'+photoId+'.jpg';
 const old=state.productImages.find(i=>i.product_id===productId)?.storage_path;
 const token=await getToken();
 const uploaded=await fetch(apiBase()+'/storage/v1/object/trummcards-lot-images/'+path,{
  method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'image/jpeg','x-upsert':'false'},body:jpg
 });
 if(!uploaded.ok){let reason='Bild-Upload fehlgeschlagen ('+uploaded.status+').';try{const x=await uploaded.json();reason=x.message||x.error||reason;}catch{}throw Error(reason);}
 try{
  await authorizedRequest('/rest/v1/tc_product_images?on_conflict=product_id',{
   method:'POST',headers:{...API_HEADERS,Prefer:'resolution=merge-duplicates,return=minimal'},
   body:JSON.stringify({owner_id:session.user.id,product_id:productId,storage_path:path,mime_type:'image/jpeg'})
  });
 }catch(err){
  try{await authorizedRequest('/storage/v1/object/trummcards-lot-images',{method:'DELETE',headers:API_HEADERS,body:JSON.stringify({prefixes:[path]})});}catch{}
  throw err;
 }
 if(old&&old!==path){
  const cached=thumbnailCache.get(old);if(cached){URL.revokeObjectURL(cached);thumbnailCache.delete(old);}
  try{await authorizedRequest('/storage/v1/object/trummcards-lot-images',{method:'DELETE',headers:API_HEADERS,body:JSON.stringify({prefixes:[old]})});}catch{}
 }
}

function renderHistory(){const sales=state.sales.slice(0,70),lots=state.lots.slice(0,80);
 $('salesList').innerHTML=sales.length?sales.map(s=>`<div class="list-card"><div class="item-main"><strong>${esc(productName(s.product_id))}</strong><small>${esc(s.sold_on)} · ${esc(s.platform)} · ${Number(s.qty)} Stk. · ${s.status==='booked'?'Gebucht':'Storniert'}</small><button class="tiny-btn" type="button" data-cash-sale="${s.id}">Zahlung erfassen</button><button class="tiny-btn" type="button" data-shipping-sale="${s.id}">Versand: ${esc(state.shipments.find(row=>row.sale_id===s.id)?.shipping_status||'offen')}</button>${s.status==='booked'?`<button class="tiny-btn" type="button" data-void="${s.id}">Stornieren</button>`:''}</div><div class="item-end"><b>${euro(s.price)}</b><small>Gewinn: ${euro(profit(s))}</small></div></div>`).join(''):'<div class="empty">Noch keine Verkäufe gebucht.</div>';
 $('lotsList').innerHTML=lots.length?lots.map(l=>`<div class="list-card"><div class="item-main"><strong>${esc(productName(l.product_id))}</strong><small>${esc(l.bought_on)} · ${esc(l.source||'Ohne Quelle')}</small><button class="tiny-btn" type="button" data-cash-lot="${l.id}">Zahlung erfassen</button></div><div class="item-end"><b>${Number(l.available_qty)}/${Number(l.purchased_qty)} Stk.</b><small>${euro(Number(l.purchase_total)+Number(l.extra_cost))}</small></div></div>`).join(''):'<div class="empty">Noch keine Einkäufe gebucht.</div>';
}

function resetArticle(){
 $('articleForm').reset();f($('articleForm'),'id').value='';f($('articleForm'),'catalog_card_id').value='';f($('articleForm'),'catalog_image_url').value='';
 catalogPicker11?.clear();setPicker11?.clear();marketUI11?.reset();
 previewArticlePhoto(null);
 $('articleTitle').textContent='Artikel anlegen';
 $('articleSubmit').textContent='Artikel und Bild speichern';
}
function editArticle(id){
 const p=productById(id);if(!p)return;
 navigate('article');
 for(const field of ['id','name','sku','set_name','language','card_condition','card_number','rarity','card_variant','storage_location','grading_company','grading_grade','grading_certificate','catalog_card_id','catalog_image_url','note'])f($('articleForm'),field).value=p[field]||'';
 marketUI11?.load(p);
 $('articleTitle').textContent='Artikel bearbeiten';
 $('articleSubmit').textContent='Änderungen speichern';
 if(imagePathForProduct(id))$('articleImageSelection').textContent='Bild vorhanden. Optional neues Bild wählen, um es zu ersetzen.';
}
async function withBusy(action){
 if(busy)return;busy=true;clearNotice();
 document.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=true);
 try{if(!navigator.onLine)throw Error('Zum Buchen benötigst du eine Internetverbindung.');await action();}
 catch(e){notice(errorText(e),'error');}
 finally{busy=false;document.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=false);}
}
async function saveArticle(e){
 e.preventDefault();if(!WRITES_ENABLED){notice(NO_WRITES,'error');return;}const form=e.currentTarget;
 await withBusy(async()=>{
  let id=val(form,'id');
  const fields={...marketUI11.values(),name:val(form,'name'),sku:val(form,'sku')||null,set_name:val(form,'set_name'),language:val(form,'language'),card_condition:val(form,'card_condition'),card_number:val(form,'card_number'),rarity:val(form,'rarity'),card_variant:val(form,'card_variant'),storage_location:val(form,'storage_location'),grading_company:val(form,'grading_company'),grading_grade:val(form,'grading_grade'),grading_certificate:val(form,'grading_certificate'),catalog_card_id:val(form,'catalog_card_id'),catalog_image_url:val(form,'catalog_image_url'),note:val(form,'note')};
  if(!fields.name)throw Error('Bitte Artikelname eingeben.');
  if(fields.sku&&state.products.some(p=>p.id!==id&&String(p.sku||'').toLocaleLowerCase('de')===fields.sku.toLocaleLowerCase('de')))throw Error('Artikelnummer bereits verwendet bitte andere wählen.');
  const editing=Boolean(id);
  if(editing){
   await authorizedRequest('/rest/v1/tc_products?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{...API_HEADERS,Prefer:'return=minimal'},body:JSON.stringify(fields)});
  }else{
   const inserted=await authorizedRequest('/rest/v1/tc_products',{method:'POST',headers:{...API_HEADERS,Prefer:'return=representation'},body:JSON.stringify({...fields,owner_id:session.user.id})});
   id=inserted?.[0]?.id;
   if(!id)throw Error('Artikel möglicherweise angelegt, aber die Antwort enthält keine ID. Bitte erst Lager prüfen, bevor du erneut speicherst.');
   f(form,'id').value=id;
  }
  if(articleImageFile){
   try{await uploadProductPhoto(id,articleImageFile);}
   catch(err){
    await refreshAll();
    throw Error('Artikeldaten gespeichert, Bild jedoch nicht: '+errorText(err)+' Bitte im vorhandenen Artikel erneut versuchen.');
   }
  }
  const jumpToPurchase=!editing&&f(form,'after_save_purchase').checked;
  await refreshAll();resetArticle();showPage(jumpToPurchase?'purchase':'home');
  if(jumpToPurchase){f($('purchaseForm'),'product').value=id;updatePurchasePreview();}
  notice(jumpToPurchase?'Karte gespeichert. Erfasse jetzt den Einkauf.':(editing?'Artikel und Bild aktualisiert.':'Artikel mit optionalem Bild gespeichert.'),'success');
 });
}

function updatePurchasePreview(){const form=$('purchaseForm');try{const qty=parseCount(val(form,'qty')),total=parseMoney(val(form,'total')),extra=parseMoney(val(form,'extra'),true);$('purchasePreview').className='preview good';$('purchasePreview').textContent=`${qty} Stück · Gesamtpreis ${euro(total)} · Zusatzkosten ${euro(extra)} · Einstand je Stück ca. ${euro((total+extra)/qty)}`;}catch{$('purchasePreview').className='preview';$('purchasePreview').textContent='Stückzahl und Preise eingeben.';}}
function syncPurchase(changed){const form=$('purchaseForm');if(changed!=='qty')lastPurchaseEntry=changed;try{const qty=parseCount(val(form,'qty'));if(lastPurchaseEntry==='unit'){const unit=parseMoney(val(form,'unit'));f(form,'total').value=numInput(qty*unit);}else{const total=parseMoney(val(form,'total'));f(form,'unit').value=(total/qty).toFixed(4).replace(/0+$/,'').replace(/\.$/,'').replace('.',',');}}catch{/* Preserve user input while it is incomplete. */}updatePurchasePreview();}
function getPending(){try{return JSON.parse(localStorage.getItem(PENDING));}catch{return null;}}
function bookId(kind,args){const signature=JSON.stringify({kind,user:session.user.id,args});const old=getPending();if(old){if(old.signature===signature)return old.id;throw Error('Eine frühere Buchung ist ungeklärt. Bitte Bestand und Historie prüfen und danach die Buchungssperre bestätigen.');}const id=crypto.randomUUID();localStorage.setItem(PENDING,JSON.stringify({signature,id,kind,time:new Date().toISOString()}));renderPending();return id;}
function clearPending(){localStorage.removeItem(PENDING);renderPending();}
function renderPending(){const el=$('pendingBanner'),p=getPending();el.hidden=!p;if(!p)return;el.replaceChildren();const text=document.createElement('div');text.textContent='Ungeklärte '+(p.kind==='purchase'?'Einkaufs-':'Verkaufs-')+'Buchung: Bei einer abgebrochenen Verbindung denselben Vorgang erneut abschicken, damit die Buchung nicht doppelt erfolgt. Sonst zuerst Lager und Buchungen prüfen.';const btn=document.createElement('button');btn.type='button';btn.className='tiny-btn';btn.textContent='Nach Kontrolle entsperren';btn.onclick=()=>{if(confirm('Hast du Lagerbestand und Buchungen geprüft? Wenn ein Vorgang ungeklärt ist, kann das Aufheben der Sperre eine Doppelbuchung ermöglichen.')){clearPending();notice('Buchungssperre aufgehoben.','success');}};el.append(text,btn);}
async function savePurchase(e){e.preventDefault();if(!WRITES_ENABLED){notice(NO_WRITES,'error');return;}await withBusy(async()=>{const form=e.currentTarget,id=val(form,'product');if(!productById(id))throw Error('Bitte Artikel auswählen.');const qty=parseCount(val(form,'qty')),total=parseMoney(val(form,'total')),extra=parseMoney(val(form,'extra'),true);const args={p_product_id:id,p_bought_on:dateValid(val(form,'date')),p_qty:qty,p_purchase_total:money(total).toFixed(2),p_extra_cost:money(extra).toFixed(2),p_source:val(form,'source'),p_note:val(form,'note')};const requestKey=bookId('purchase',args);await rpc('tc_book_purchase',{...args,p_request_key:requestKey});clearPending();form.reset();f(form,'date').value=today();lastPurchaseEntry='unit';await refreshAll();showPage('home');notice(`${qty} Stück ins Cloud-Lager gebucht.`, 'success');});}
function saleValues(){const form=$('saleForm');return {product:val(form,'product'),date:dateValid(val(form,'date')),qty:parseCount(val(form,'qty')),price:parseMoney(val(form,'price')),shippingIncome:parseMoney(val(form,'shippingIncome'),true),shippingCost:parseMoney(val(form,'shippingCost'),true),fees:parseMoney(val(form,'fees'),true),other:parseMoney(val(form,'other'),true),platform:val(form,'platform'),note:val(form,'note')};}
async function saveCash11(id,entry){
 if(!WRITES_ENABLED)throw Error(NO_WRITES);
 if(!session?.user?.id)throw Error('Bitte anmelden.');
 const method=id?'PATCH':'POST',target='/rest/v1/tc_cash_entries'+(id?'?id=eq.'+encodeURIComponent(id):'');
 const payload=id?entry:{...entry,owner_id:session.user.id};
 await authorizedRequest(target,{method,headers:{...API_HEADERS,Prefer:'return=minimal'},body:JSON.stringify(payload)});
 await refreshAll();
}
async function deleteCash11(id){
 if(!WRITES_ENABLED)throw Error(NO_WRITES);
 if(!session?.user?.id)throw Error('Bitte anmelden.');
 await authorizedRequest('/rest/v1/tc_cash_entries?id=eq.'+encodeURIComponent(id),{
  method:'DELETE',headers:{...API_HEADERS,Prefer:'return=minimal'}
 });
 await refreshAll();
}
async function saveFeeProfile11(rule){
 if(!WRITES_ENABLED)throw Error(NO_WRITES);
 if(!session?.user?.id)throw Error('Bitte zuerst anmelden.');
 const found=state.feeProfiles.find(p=>p.platform===rule.platform);
 const payload={percent_rate:rule.percent_rate,fixed_eur:rule.fixed_eur,include_shipping:rule.include_shipping};
 if(found){
  await authorizedRequest('/rest/v1/tc_platform_fee_profiles?id=eq.'+encodeURIComponent(found.id),{
   method:'PATCH',headers:{...API_HEADERS,Prefer:'return=minimal'},
   body:JSON.stringify({...payload,updated_at:new Date().toISOString()})
  });
 }else{
  await authorizedRequest('/rest/v1/tc_platform_fee_profiles',{
   method:'POST',headers:{...API_HEADERS,Prefer:'return=minimal'},
   body:JSON.stringify({...payload,platform:rule.platform,owner_id:session.user.id})
  });
 }
 state.feeProfiles=[...state.feeProfiles.filter(p=>p.platform!==rule.platform),{...found,...payload,platform:rule.platform}];
 await refreshAll();
}
async function saveShipment11(saleId,details){
 if(!WRITES_ENABLED)throw Error(NO_WRITES);
 if(!session?.user?.id)throw Error('Bitte zuerst anmelden.');
 if(!state.sales.some(s=>s.id===saleId&&s.status==='booked'))throw Error('Versanddaten nur zu gebuchten Verkäufen.');
 const payload={shipping_status:details.status,carrier:details.carrier,tracking_number:details.tracking_number,
  order_reference:details.order_reference,shipped_on:details.shipped_on,tracking_url:details.tracking_url};
 const exists=state.shipments.some(s=>s.sale_id===saleId);
 if(exists){
  await authorizedRequest('/rest/v1/tc_sale_shipments?sale_id=eq.'+encodeURIComponent(saleId),{
   method:'PATCH',headers:{...API_HEADERS,Prefer:'return=minimal'},
   body:JSON.stringify({...payload,updated_at:new Date().toISOString()})
  });
 }else{
  await authorizedRequest('/rest/v1/tc_sale_shipments',{
   method:'POST',headers:{...API_HEADERS,Prefer:'return=minimal'},
   body:JSON.stringify({...payload,sale_id:saleId,owner_id:session.user.id})
  });
 }
 state.shipments=[...state.shipments.filter(s=>s.sale_id!==saleId),{...payload,sale_id:saleId}];
 await refreshAll();
}
function updateSalePreview(){const el=$('salePreview');try{const v=saleValues();if(!v.product)throw Error('Kein Artikel');const fifo=fifoPreview(v.product,v.qty);if(fifo.missing){el.className='preview bad';el.textContent=`Nicht genügend Bestand: ${available(v.product)} verfügbar, ${fifo.missing} fehlen.`;return;}const earnings=money(v.price+v.shippingIncome-v.shippingCost-v.fees-v.other-fifo.cost);el.className='preview good';el.textContent=`${v.qty} Stück · FIFO-Einstand ${euro(fifo.cost)} · voraussichtlicher Gewinn ${euro(earnings)}. Endgültig zählt die Berechnung des Servers.`;}catch{el.className='preview';el.textContent='Artikel, Stückzahl und Verkaufspreis eingeben.';}}
async function saveSale(e){e.preventDefault();if(!WRITES_ENABLED){notice(NO_WRITES,'error');return;}const form=e.currentTarget;await withBusy(async()=>{const v=saleValues();if(!productById(v.product))throw Error('Bitte Artikel mit Bestand auswählen.');if(fifoPreview(v.product,v.qty).missing)throw Error('Nicht genügend Bestand. Bitte synchronisieren.');const args={p_product_id:v.product,p_sold_on:v.date,p_qty:v.qty,p_price:money(v.price).toFixed(2),p_shipping_income:money(v.shippingIncome).toFixed(2),p_shipping_cost:money(v.shippingCost).toFixed(2),p_fees:money(v.fees).toFixed(2),p_other_cost:money(v.other).toFixed(2),p_platform:v.platform,p_note:v.note};const key=bookId('sale',args);await rpc('tc_book_sale',{...args,p_request_key:key});clearPending();form.reset();f(form,'date').value=today();await refreshAll();showPage('sales');notice(`${v.qty} Stück verkauft. Bestand und FIFO-Gewinn aktualisiert.`,'success');});}
async function cancelSale(id){if(!WRITES_ENABLED){notice(NO_WRITES,'error');return;}const s=state.sales.find(x=>x.id===id&&x.status==='booked');if(!s)return;if(!confirm(`Verkauf von ${s.qty} Stück „${productName(s.product_id)}“ stornieren? Der Lagerbestand wird wiederhergestellt.`))return;await withBusy(async()=>{await rpc('tc_void_sale',{p_sale_id:id});await refreshAll();notice('Verkauf storniert. Bestand wiederhergestellt.','success');});}
async function processPhoto(file){if(!file)throw Error('Bitte ein Foto auswählen.');if(file.size>30*1024*1024)throw Error('Das Foto darf maximal 30 MB vor der Komprimierung groß sein.');let bitmap=null;try{bitmap=await createImageBitmap(file);}catch{bitmap=null;}if(!bitmap){const img=new Image();const url=URL.createObjectURL(file);try{await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('Bildformat nicht lesbar. Bitte JPEG oder PNG verwenden.'));img.src=url;});}finally{URL.revokeObjectURL(url);}bitmap=img;}const max=1600,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);if(bitmap.close)bitmap.close();const blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('Bild konnte nicht verarbeitet werden.')),'image/jpeg',.85));if(blob.size>10*1024*1024)throw Error('Bild bleibt trotz Komprimierung größer als 10 MB.');return blob;}
async function savePhoto(e){e.preventDefault();if(!WRITES_ENABLED){notice(NO_WRITES,'error');return;}await withBusy(async()=>{const form=e.currentTarget,lotId=val(form,'lot'),lot=state.lots.find(l=>l.id===lotId);if(!lot)throw Error('Bitte ein Einkaufslos wählen.');if(!pendingImage)throw Error('Bitte ein Foto aufnehmen oder auswählen.');const photo=await processPhoto(pendingImage);const photoId=crypto.randomUUID();const path=`${session.user.id}/${lotId}/${photoId}.jpg`;const token=await getToken();const upload=await fetch(`${apiBase()}/storage/v1/object/trummcards-lot-images/${path}`,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'image/jpeg','x-upsert':'false'},body:photo});if(!upload.ok){let err={};try{err=await upload.json();}catch{}throw Error(err.message||err.error||'Bild-Upload fehlgeschlagen ('+upload.status+').');}try{await authorizedRequest('/rest/v1/tc_lot_images',{method:'POST',headers:{...API_HEADERS,Prefer:'return=minimal'},body:JSON.stringify({id:photoId,owner_id:session.user.id,lot_id:lotId,storage_path:path,display_order:0,mime_type:'image/jpeg'})});}catch(e){try{await authorizedRequest('/storage/v1/object/trummcards-lot-images',{method:'DELETE',headers:API_HEADERS,body:JSON.stringify({prefixes:[path]})});}catch{}throw e;}pendingImage=null;form.reset();$('photoSelection').textContent='Noch kein Bild ausgewählt.';await refreshAll();await renderPhotos();notice('Artikelbild erfolgreich im privaten Cloud-Speicher gesichert.','success');});}
async function renderPhotos(){imageObjects.forEach(u=>URL.revokeObjectURL(u));imageObjects=[];const parent=$('photosList');parent.replaceChildren();if(!state.images.length){parent.innerHTML='<div class="empty">Noch keine Bilder hochgeladen.</div>';return;}for(const item of state.images.slice(0,16)){if(activePage!=='photos')break;const box=document.createElement('div');box.className='photo-card';const img=document.createElement('img');img.alt='Artikelbild von '+productName(state.lots.find(l=>l.id===item.lot_id)?.product_id);img.loading='lazy';const desc=document.createElement('p');desc.textContent=img.alt;box.append(img,desc);parent.append(box);try{const token=await getToken();const response=await fetch(`${apiBase()}/storage/v1/object/authenticated/trummcards-lot-images/${item.storage_path}`,{headers:{apikey:KEY,Authorization:'Bearer '+token}});if(!response.ok)throw Error('Bild nicht geladen');const blob=await response.blob(),url=URL.createObjectURL(blob);imageObjects.push(url);img.src=url;}catch{desc.textContent+=' (Laden nicht möglich)';}}}
function bind(){
 $('loginForm').addEventListener('submit',login);
 for(const field of ['articleCamera','articleGallery'])f($('articleForm'),field).addEventListener('change',e=>previewArticlePhoto(e.target.files?.[0]||null));
 $('closeImageViewer').addEventListener('click',()=>$('imageViewer').close());
 $('imageViewer').addEventListener('click',e=>{if(e.target===$('imageViewer'))$('imageViewer').close();});
 marketUI11=window.TrummMarketUI11?.bind();window.TrummMarketInstance11=marketUI11;
 catalogPicker11=window.TrummCatalogUI11?.bind();
 setPicker11=window.TrummSetUI11?.bind({selectCard:id=>catalogPicker11.selectCard(id)});
 financeUI11=window.TrummFinanceUI11?.bind(()=>({sales:state.sales,lots:state.lots,products:state.products}));
 shippingUI11=window.TrummShippingUI11?.bind({getSales:()=>state.sales,getShipments:()=>state.shipments,productName,save:saveShipment11});
 feesUI11=window.TrummFeesUI11?.bind({getProfiles:()=>state.feeProfiles,save:saveFeeProfile11,parseEuro:v=>parseMoney(v,true),onFeeApplied:updateSalePreview});
 cashUI11=window.TrummCashUI11?.bind({getEntries:()=>state.cashEntries,getSales:()=>state.sales,getLots:()=>state.lots,productName,save:saveCash11,remove:deleteCash11});
 $('articleForm').addEventListener('submit',saveArticle);
 $('purchaseForm').addEventListener('submit',savePurchase);
 $('saleForm').addEventListener('submit',saveSale);
 $('photoForm').addEventListener('submit',savePhoto);
 for(const id of ['search','inventoryLanguageFilter','inventoryStockFilter','inventorySort'])$(id).addEventListener(id==='search'?'input':'change',renderProducts);
 document.addEventListener('click',async e=>{const go=e.target.closest('[data-go]');if(go){navigate(go.dataset.go);return;}const thumb=e.target.closest('[data-photo-open]');if(thumb){await openProductImage(thumb.dataset.photoOpen);return;}const edit=e.target.closest('[data-edit]');if(edit){editArticle(edit.dataset.edit);return;}const cashSale=e.target.closest('[data-cash-sale]');if(cashSale){showPage('finance');cashUI11?.beginLinkedPayment('sale',cashSale.dataset.cashSale);return;}const cashLot=e.target.closest('[data-cash-lot]');if(cashLot){showPage('finance');cashUI11?.beginLinkedPayment('lot',cashLot.dataset.cashLot);return;}const ship=e.target.closest('[data-shipping-sale]');if(ship){showPage('sales');shippingUI11?.load(ship.dataset.shippingSale,true);$('shipmentPanel').scrollIntoView({behavior:'smooth',block:'nearest'});return;}const del=e.target.closest('[data-void]');if(del){await cancelSale(del.dataset.void);}});
 for(const n of ['qty','unit','total'])f($('purchaseForm'),n).addEventListener('input',()=>syncPurchase(n));
 for(const n of ['product','qty','price','shippingIncome','shippingCost','fees','other'])f($('saleForm'),n).addEventListener(n==='product'?'change':'input',updateSalePreview);
 for(const [id,offset] of [['saleQtyMinus',-1],['saleQtyPlus',1]])$(id).addEventListener('click',()=>{
  const qty=f($('saleForm'),'qty'),current=parseInt(qty.value,10)||1,max=parseInt(qty.max,10)||1000000;
  qty.value=String(Math.min(max,Math.max(1,current+offset)));qty.dispatchEvent(new Event('input',{bubbles:true}));
 });
 for(const n of ['camera','gallery'])f($('photoForm'),n).addEventListener('change',e=>{pendingImage=e.target.files?.[0]||null;$('photoSelection').textContent=pendingImage?`Ausgewählt: ${pendingImage.name} (${Math.round(pendingImage.size/1024)} KB)`:'Noch kein Bild ausgewählt.';});
 $('refreshBtn').onclick=()=>refreshAll({toast:true});$('moreRefresh').onclick=()=>refreshAll({toast:true});$('signOutBtn').onclick=()=>{signOut();};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)refreshAll();});window.addEventListener('online',()=>{if(session)refreshAll({toast:true});});
 setInterval(()=>{if(session&&!busy)refreshAll();},12000);
}
async function start(){
 // Supabase's dashboard recovery link may redirect to the configured Site URL (root).
 // Preserve the fragment only for same-origin handoff to the password-reset form.
 const fragment=new URLSearchParams(location.hash.slice(1));
 const query=new URLSearchParams(location.search);
 if(fragment.get('type')==='recovery'||fragment.has('error_code')||fragment.has('error')||(query.get('type')==='recovery')){
  location.replace('./reset-password.html'+location.search+location.hash);return;
 }
 bind();showLogin();f($('purchaseForm'),'date').value=today();f($('saleForm'),'date').value=today();
 try{const cfg={project_ref:PROJECT,url:'https://'+PROJECT+'.supabase.co',anon_key:"sb_publishable_oS2Ri8VlhEqv1XDBwkUahQ_zVEEtyHG"};if(cfg.project_ref!==PROJECT||cfg.url!=='https://cpycfxolqpidfjbhhsmr.supabase.co'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.anon_key))throw Error('Unerwartete Produktions-Konfiguration.');ROOT=cfg.url;KEY=cfg.anon_key;restoreSession();if(session){const u=await checkAccount();$('accountEmail').textContent=u.email||'TrummCards-Konto';showApp();await refreshAll();navigate('home');}else showLogin();}catch(e){clearSession();showLogin();notice('Verbindung fehlgeschlagen: '+errorText(e),'error');}
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.info('PWA Cache nicht aktiv:',e.message));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
