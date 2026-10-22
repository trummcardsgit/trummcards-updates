/* TrummCards Mobile Cloud PRODUCTION RC v1.2.5 – static GitHub Pages client; only a public key.
 * Data is readable/writeable only with a Supabase JWT and the database owner RLS guard.
 * Test data ONLY. A connection is required to write; no offline operation replay.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id), f=(form,name)=>form.elements.namedItem(name), val=(form,name)=>String(f(form,name)?.value??'').trim();
const STORE='trummcards-mobile-production-session-v1',PENDING='trummcards-mobile-production-pending-v1';
const PROJECT='hgdexyvtgfffcasfpjyu';
const WRITES_ENABLED=false; // Release gate: allow writes only after approved backups and GO LIVE.
const NO_WRITES='Produktionsvorschau: Echtdaten und Buchungen bleiben bis zur Releasefreigabe gesperrt.';
let ROOT='',KEY='',session=null,authCheckPromise=null,refreshPromise=null,loading=false,busy=false,activePage='home',lastPurchaseEntry='unit',pendingImage=null,imageObjects=[];
let state={products:[],inventory:[],lots:[],sales:[],images:[],productImages:[],shipments:[],feeProfiles:[],cashEntries:[]};
let articleImageFile=null,articleImagePreviewUrl=null,thumbnailObserver=null;
let catalogPicker11=null,setPicker11=null,financeUI11=null,shippingUI11=null,marketUI11=null,feesUI11=null,cashUI11=null,cardDexUI12=null,vintedUI12=null;
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
function showLogin(){cloud13Role=null;cloud13Selected=null;session=null;$('loginScreen').hidden=false;$('appScreen').hidden=true;$('bottomNav').hidden=true;connected('Anmeldung');}
function showApp(){$('loginScreen').hidden=true;$('appScreen').hidden=false;$('bottomNav').hidden=false;connected('Online','online');cloud13ApplyRole();}
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
async function checkAccount(){const u=await apiUser();if(!u?.id)throw Error('Anmeldung nicht erkannt.');cloud13Role=await rpc('tc_pwa_access_role');if(!['admin','dex'].includes(cloud13Role))throw Error('Dieses Benutzerkonto ist nicht für TrummCards freigeschaltet.');if(session)session.user=u;localStorage.setItem(STORE,JSON.stringify(session));return u;}
async function login(event){event.preventDefault();const form=event.currentTarget;const btn=$('signInBtn');btn.disabled=true;clearNotice();try{const email=val(form,'email'),password=val(form,'password');const data=await raw(apiBase()+'/auth/v1/token?grant_type=password',{method:'POST',headers:{...API_HEADERS,apikey:KEY},body:JSON.stringify({email,password})});persistSession(data);const u=await checkAccount();f(form,'password').value='';$('accountEmail').textContent=u.email||'TrummCards-Konto';showApp();await refreshAll();navigate(cloud13Role==='dex'?'carddex':'home');notice('Angemeldet – Cloud-Daten synchronisiert.','success');}catch(e){notice(errorText(e),'error');if(session){await signOut(false);}}finally{btn.disabled=false;}}
async function signOut(goLogin=true){cloud13Role=null;cloud13Items=[];cloud13Viewers=[];cloud13Selected=null;if(session){try{await authorizedRequest('/auth/v1/logout',{method:'POST'});}catch{}}clearSession();state={products:[],inventory:[],lots:[],sales:[],images:[],productImages:[],shipments:[],feeProfiles:[],cashEntries:[]};clearThumbnailCache();imageObjects.forEach(u=>URL.revokeObjectURL(u));imageObjects=[];showLogin();if(goLogin)notice('Du wurdest abgemeldet.','success');}
function showPage(name){
 if(cloud13Role==='dex'&&!['carddex','more','collection','wishlist'].includes(name))name='carddex';
 if(cloud13Role!=='admin'&&name==='users')name='carddex';
 const allowed=['home','article','purchase','sale','sales','photos','finance','carddex','more','collection','wishlist','users'];
 if(!allowed.includes(name))name=cloud13Role==='dex'?'carddex':'home';
 activePage=name;
 for(const id of allowed){const el=$('page-'+id);if(el)el.hidden=id!==name;}
 for(const btn of document.querySelectorAll('[data-go]'))btn.classList.toggle('active',btn.dataset.go===name);
 const titles={home:'Übersicht',article:'Artikel',purchase:'Einkauf',sale:'Verkauf',sales:'Buchungen',photos:'Artikelbilder',finance:'Finanzen',carddex:'KartenDex',more:'Einstellungen',collection:'Meine Sammlung',wishlist:'Meine Wunschliste',users:'Benutzerberechtigungen'};
 $('screenTitle').textContent=titles[name];
 window.scrollTo({top:0,behavior:'instant'});
 if(name==='photos')renderPhotos().catch(e=>notice(errorText(e),'error'));
 if(name==='finance')financeUI11?.render();
}
function navigate(name){if(name==='article'&&activePage!=='article')resetArticle();showPage(name);}
function productById(id){return state.products.find(p=>p.id===id);}
function productName(id){return productById(id)?.name||'Unbekannter Artikel';}
function available(id){return Number(state.inventory.find(x=>x.product_id===id)?.available_qty||0);}
function fifoPreview(productId,quantity){const list=state.lots.filter(l=>l.product_id===productId&&Number(l.available_qty)>0).sort((a,b)=>String(a.bought_on).localeCompare(String(b.bought_on))||String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id)));let remaining=quantity,cost=0;for(const l of list){if(!remaining)break;const n=Math.min(remaining,Number(l.available_qty));const rest=money(Number(l.purchase_total)+Number(l.extra_cost)-Number(l.allocated_cost));const c=n===Number(l.available_qty)?rest:Math.min(money((Number(l.purchase_total)+Number(l.extra_cost))/Number(l.purchased_qty)*n),rest);cost=money(cost+c);remaining-=n;}return {cost,missing:remaining};}
function profit(s){return money(Number(s.price||0)+Number(s.shipping_income||0)-Number(s.shipping_cost||0)-Number(s.fees||0)-Number(s.other_cost||0)-Number(s.cogs_total||0));}
function updateOptions(element,rows,makeLabel,placeholder){const chosen=element.value;const sig=JSON.stringify(rows.map(p=>[p.id,makeLabel(p)]));if(element.dataset.signature===sig)return;element.dataset.signature=sig;element.replaceChildren();const opt=document.createElement('option');opt.value='';opt.textContent=placeholder;element.append(opt);for(const p of rows){const option=document.createElement('option');option.value=p.id;option.textContent=makeLabel(p);element.append(option);}if(rows.some(r=>r.id===chosen))element.value=chosen;}
async function refreshAll(opts={}){if(!session||loading||document.visibilityState==='hidden')return;loading=true;connected('Synchronisiere …');try{if(cloud13Role==='dex'){await cloud13Refresh();connected('Online','online');return;}const [products,inventory,lots,sales,images,productImages,shipments,feeProfiles,cashEntries]=await Promise.all([
 tableGet('tc_products','select=id,sku,name,set_name,language,card_condition,card_number,rarity,card_variant,storage_location,grading_company,grading_grade,grading_certificate,catalog_card_id,catalog_image_url,archived_at,market_price_eur,market_price_source,market_price_checked_at,note,created_at&order=name.asc&limit=1000'),
 tableGet('tc_inventory','select=product_id,available_qty,remaining_cost&limit=1000'),
 tableGet('tc_purchase_lots','select=id,product_id,bought_on,purchased_qty,available_qty,purchase_total,extra_cost,allocated_cost,source,note,created_at&order=bought_on.asc&limit=1000'),
 tableGet('tc_sales','select=id,product_id,sold_on,qty,price,shipping_income,shipping_cost,fees,other_cost,cogs_total,platform,note,status,created_at&order=created_at.desc&limit=1000'),
 tableGet('tc_lot_images','select=id,lot_id,storage_path,mime_type,display_order&limit=1000'),
 tableGet('tc_product_images','select=id,product_id,storage_path,mime_type,created_at&limit=1000'),
 tableGet('tc_sale_shipments','select=sale_id,shipping_status,carrier,tracking_number,order_reference,shipped_on,tracking_url,updated_at&limit=1000'),
 tableGet('tc_platform_fee_profiles','select=id,platform,percent_rate,fixed_eur,include_shipping,updated_at&limit=1000'),
 tableGet('tc_cash_entries','select=id,payment_on,direction,category,amount_eur,description,document_reference,sale_id,purchase_lot_id,created_at&order=payment_on.desc&limit=1000')
 ]);state={products,inventory,lots,sales,images,productImages,shipments,feeProfiles,cashEntries};renderData();const at=new Date().toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});$('lastUpdated').textContent=at;connected('Stand '+at,'online');if(cloud13Role==='admin')await cloud13Refresh();if(opts.toast)notice('Cloud-Daten aktualisiert.','success');}catch(e){connected('Offline?','problem');if(opts.toast)notice(errorText(e),'error');console.error('TrummCards mobile sync:',e);}finally{loading=false;}}
function renderData(){const {products,inventory,sales,lots}=state;
 $('statProducts').textContent=products.filter(p=>!p.archived_at).length.toLocaleString('de-AT');$('statPieces').textContent=inventory.filter(x=>!productById(x.product_id)?.archived_at).reduce((a,x)=>a+Number(x.available_qty),0).toLocaleString('de-AT');$('statValue').textContent=euro(inventory.filter(x=>!productById(x.product_id)?.archived_at).reduce((a,x)=>a+Number(x.remaining_cost),0));$('statProfit').textContent=euro(sales.filter(s=>s.status==='booked').reduce((a,x)=>a+profit(x),0));
 renderProducts();renderHistory();const name=p=>p.name+' · '+(p.sku||'ohne SKU');updateOptions(f($('purchaseForm'),'product'),products.filter(p=>!p.archived_at),name,'Artikel wählen');updateOptions(f($('saleForm'),'product'),products.filter(p=>!p.archived_at&&available(p.id)>0),p=>p.name+' ('+available(p.id)+' Stk.)','Artikel mit Bestand wählen');updateOptions(f($('photoForm'),'lot'),lots,l=>productName(l.product_id)+' · '+l.bought_on+' · '+l.id.slice(0,6),'Einkauf wählen');updatePurchasePreview();updateSalePreview();renderPending();financeUI11?.render();shippingUI11?.render();feesUI11?.render();cashUI11?.render();
 }


const recoveredCatalogImages=new Map(),recoveringCatalogImages=new Map();
function recoverableProductImage(p){return Boolean(window.TrummImageLink12?.recoverableId(p));}
async function findInventoryCatalogImage(productId){
 if(recoveredCatalogImages.has(productId))return recoveredCatalogImages.get(productId);
 if(recoveringCatalogImages.has(productId))return recoveringCatalogImages.get(productId);
 const product=productById(productId),cardId=window.TrummImageLink12?.recoverableId(product);
 if(!product||!cardId)return null;
 const task=(async()=>{
  try{
   const result=await window.TrummImageLink12.resolve({catalog:window.TrummCatalog11,id:cardId,language:product.language});
   const root=result?.root||null;
   if(productById(productId)===product)recoveredCatalogImages.set(productId,root);
   return root;
  }catch(err){console.info('KartenDex-Lagerbild:',errorText(err));return null;}
 })();
 recoveringCatalogImages.set(productId,task);
 try{return await task;}finally{recoveringCatalogImages.delete(productId);}
}
function imagePathForProduct(productId){
 const hero=state.productImages.find(i=>i.product_id===productId);
 if(hero)return hero.storage_path;
 const lotIds=new Set(state.lots.filter(l=>l.product_id===productId).map(l=>l.id));
 const ownPhoto=state.images.find(i=>lotIds.has(i.lot_id))?.storage_path;
 if(ownPhoto)return ownPhoto;
 const catalog=recoveredCatalogImages.get(productId)||productById(productId)?.catalog_image_url||window.TrummCatalog11?.inferCatalogImageRoot(productById(productId),state.products)||'';
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
 const products=state.products.filter(p=>{if(p.archived_at)return false;
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
 $('inventoryFilterCount').textContent=products.length+' von '+state.products.filter(p=>!p.archived_at).length+' Artikeln';
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
  const thumb=(imagePathForProduct(p.id)||recoverableProductImage(p))?
   '<button type="button" class="list-image-button" data-photo-open="'+p.id+'" title="Artikelbild vergrößern"><img data-thumb="'+p.id+'" alt="Bild von '+esc(p.name)+'" loading="eager" decoding="async" width="64" height="74" hidden><span class="image-placeholder" aria-hidden="true">▧</span></button>':
   '<div class="list-image-button" aria-label="Noch kein Artikelbild"><span class="image-placeholder">▧</span></div>';
  return '<div class="list-card">'+thumb+'<div class="item-main"><strong>'+esc(p.name)+'</strong><small>'+esc(p.set_name||'Ohne Set')+(p.card_number?' · Nr. '+esc(p.card_number):'')+' · '+esc(p.sku||'ohne SKU')+'</small>'+(p.storage_location?'<small>📦 '+esc(p.storage_location)+'</small>':'')+estimate+'<button type="button" class="tiny-btn" data-edit="'+p.id+'">Bearbeiten</button> <button type="button" class="tiny-btn" data-vinted="'+p.id+'">Vinted</button> <button type="button" class="tiny-btn" data-stock-adjust="'+p.id+'">Bestand ändern</button> <button type="button" class="tiny-btn danger" data-stock-archive="'+p.id+'">Entfernen</button></div><div class="item-end"><b>'+Number(inv?.available_qty||0)+' Stk.</b><small>'+euro(inv?.remaining_cost||0)+'</small></div></div>';
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
function inventoryCatalogCandidates(productId,quality='low'){
 const root=recoveredCatalogImages.get(productId)||productById(productId)?.catalog_image_url||window.TrummCatalog11?.inferCatalogImageRoot(productById(productId),state.products)||'';
 if(!/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(root))return [];
 const candidates=[root+'/'+quality+'.webp'];
 for(const lang of ['en','de','ja','fr','it']){
  const alternate=root.replace(/^(https:\/\/assets\.tcgdex\.net\/)\w+(\/.*)$/,(_,host,suffix)=>host+lang+suffix);
  if(alternate!==root)candidates.push(alternate+'/'+quality+'.webp');
 }
 if(quality==='high')candidates.push(root+'/low.webp');
 return [...new Set(candidates)];
}
function loadPictureWithFallback(img,urls){
 const candidates=[...new Set(urls.filter(Boolean))];
 let cursor=0;
 return new Promise(resolve=>{
  function next(){
   if(!img.isConnected){resolve(false);return;}
   const candidate=candidates[cursor++];
   if(!candidate){
    img.onload=null;img.onerror=null;img.hidden=true;
    if(img.nextElementSibling)img.nextElementSibling.hidden=false;
    resolve(false);return;
   }
   img.onload=()=>{img.hidden=false;if(img.nextElementSibling)img.nextElementSibling.hidden=true;resolve(true);};
   img.onerror=next;img.src=candidate;
  }
  next();
 });
}
async function fillThumbnail(img){
 const id=img.dataset.thumb;
 let path=imagePathForProduct(id);
 if(!path)path=await findInventoryCatalogImage(id);
 if(!path||!img.isConnected)return;
 let first=null;
 try{first=await privateImageUrl(path);}catch(e){console.info('Vorschaubild:',errorText(e));}
 if(!img.isConnected)return;
 let ok=await loadPictureWithFallback(img,[first,...inventoryCatalogCandidates(id)]);
 if(!ok&&recoverableProductImage(productById(id))){
  const verified=await findInventoryCatalogImage(id);
  if(verified&&img.isConnected)ok=await loadPictureWithFallback(img,inventoryCatalogCandidates(id));
 }
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
 let path=imagePathForProduct(id);
 if(!path)path=await findInventoryCatalogImage(id);
 if(!path){notice('Für diesen Artikel ist kein Kartenbild verfügbar.','error');return;}
 let first=null;
 try{first=await privateImageUrl(path,'high');}catch(e){console.info('Artikelbild:',errorText(e));}
 $('viewerCaption').textContent=productName(id);
 if(!$('imageViewer').open)$('imageViewer').showModal();
 let ok=await loadPictureWithFallback($('viewerImage'),[first,...inventoryCatalogCandidates(id,'high')]);
 if(!ok&&recoverableProductImage(productById(id))){
  const verified=await findInventoryCatalogImage(id);
  if(verified)ok=await loadPictureWithFallback($('viewerImage'),inventoryCatalogCandidates(id,'high'));
 }
 if(!ok)notice('Für diesen Artikel konnte kein Kartenbild geladen werden.','error');
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
async function manageInventoryStock(id,archive=false){if(!WRITES_ENABLED){notice(NO_WRITES,'error');return;}const p=productById(id);if(!p||p.archived_at)return;const before=available(id);let target=0;if(!archive){const entered=prompt('Neuer Lagerbestand für „'+p.name+'“ (aktuell '+before+'): ',String(before));if(entered===null)return;if(!/^(0|[1-9]\d*)$/.test(entered.trim())||Number(entered)>1000000){notice('Ungültige Stückzahl.','error');return;}target=Number(entered);if(target===before)return;}const reason=prompt('Grund für '+(archive?'Entfernung':'Bestandsänderung')+' von „'+p.name+'“:','Inventurkorrektur');if(reason===null)return;if(reason.trim().length<3||reason.trim().length>260){notice('Grund muss zwischen 3 und 260 Zeichen haben.','error');return;}if(!confirm(archive?'Artikel entfernen und '+before+' Stück ausbuchen? Buchungshistorie bleibt erhalten.':'Bestand von '+before+' auf '+target+' ändern?'))return;await withBusy(async()=>{const args=archive?{p_product_id:id,p_expected_qty:before,p_reason:reason.trim()}:{p_product_id:id,p_expected_qty:before,p_target_qty:target,p_reason:reason.trim(),p_unit_cost:null};await rpc(archive?'tc_archive_product':'tc_adjust_inventory',args);await refreshAll();notice(archive?'Artikel archiviert und aus Lager entfernt.':'Bestand korrigiert und protokolliert.','success');});}
// Cloud 1.3: PWA account-specific lists, catalogue imports and admin-only inventory draft.
let cloud13Role=null,cloud13Items=[],cloud13Viewers=[],cloud13Selected=null;
const cloud13Lang={de:'Deutsch',en:'Englisch',ja:'Japanisch',it:'Italienisch'};
const cloud13Image=u=>/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(u||'')?u+'/low.webp':'';
async function cloud13Refresh(){
 if(!['admin','dex'].includes(cloud13Role))return;
 cloud13Items=await tableGet('tc_personal_cards','select=*&order=created_at.desc&limit=1000');
 if(cloud13Role==='admin')cloud13Viewers=await rpc('tc_list_dex_viewers');
 else cloud13Viewers=[];
 for(const [type,id] of [['collection','cloud13CollectionRows'],['wishlist','cloud13WishlistRows']]){
  const el=$(id);el.replaceChildren();
  const entries=cloud13Items.filter(i=>i.list_type===type);
  for(const item of entries){
   const card=document.createElement('div');card.className='panel cloud13-card';
   const img=cloud13Image(item.catalog_image_url);
   if(img){const photo=document.createElement('img');photo.src=img;photo.alt='';photo.loading='lazy';photo.className='cloud13-card-photo';card.append(photo);}
   const details=document.createElement('div');
   const title=document.createElement('strong');title.textContent=item.name;
   const meta=document.createElement('p');meta.textContent=[item.set_name,item.card_number,item.language,Number(item.quantity)+' Stk.',item.amount_eur==null?'':euro(item.amount_eur),item.note].filter(Boolean).join(' · ');
   const remove=document.createElement('button');remove.type='button';remove.dataset.personalDelete=item.id;remove.textContent='Entfernen';
   details.append(title,meta);
   if(type==='wishlist'){
    const acquire=document.createElement('button');
    acquire.type='button';acquire.dataset.cloud13Acquire=item.id;
    acquire.textContent='Gekauft – zur Sammlung übernehmen';
    acquire.className='cloud13-acquire';
    details.append(acquire);
   }
   details.append(remove);card.append(details);el.append(card);
  }
  if(!entries.length)el.textContent='Noch keine Karten vorhanden.';
 }
 const users=$('cloud13UserRows');users.replaceChildren();
 for(const viewer of cloud13Viewers){const label=document.createElement('p');label.textContent=viewer.email;users.append(label);}
}
async function cloud13LoadItem(type,form){
 const raw=Object.fromEntries(new FormData(form));
 const item={list_type:type,name:String(raw.name||'').trim(),set_name:String(raw.set_name||'').trim(),card_number:String(raw.card_number||'').trim(),
  language:String(raw.language||'Deutsch'),quantity:Number(raw.quantity),note:String(raw.note||'').trim(),
  priority:raw.priority?Number(raw.priority):null,amount_eur:raw.amount_eur===''||raw.amount_eur===undefined?null:Number(raw.amount_eur),
  catalog_card_id:String(raw.catalog_card_id||''),catalog_image_url:String(raw.catalog_image_url||'')};
 if(!item.name||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>10000)throw Error('Ungültige Kartenangaben.');
 await authorizedRequest('/rest/v1/tc_personal_cards',{method:'POST',headers:{...API_HEADERS,Prefer:'return=minimal'},body:JSON.stringify(item)});
 await cloud13Refresh();
 form.reset();
 return item;
}
async function cloud13UseCard({id,language='de',target}={}){
 if(!['admin','dex'].includes(cloud13Role))return notice('Bitte zuerst anmelden.','error');
 if(target==='stock'&&cloud13Role!=='admin')return notice('Nur Administratoren dürfen Artikel ins Verkaufslager übernehmen.','error');
 if(!['stock','collection','wishlist'].includes(target))return;
 try{
  const card=await window.TrummCatalog11.getPokemonCard({id,language});
  const values={name:card.name,set_name:card.setName,card_number:card.localId,
   language:cloud13Lang[language]||'Deutsch',catalog_card_id:card.id,
   catalog_image_url:cloud13Image(card.imageCandidate)?card.imageCandidate:'',rarity:card.rarity||''};
  if(target==='stock'){
   resetArticle();
   const form=$('articleForm');
   for(const [key,value] of Object.entries(values)){const input=f(form,key);if(input)input.value=value||'';}
   showPage('article');
   notice('Kartendaten übernommen. Artikel prüfen, speichern und anschließend bei Bedarf den Einkauf buchen.','success');
  }else{
   const form=$(target==='collection'?'cloud13CollectionForm':'cloud13WishlistForm');
   form.reset();
   for(const [key,value] of Object.entries(values)){const input=f(form,key);if(input)input.value=value||'';}
   showPage(target);
   notice('Karte aus dem KartenDex übernommen. Menge ergänzen und in deiner persönlichen Liste speichern.','success');
  }
 }catch(error){notice(errorText(error),'error');}
}
function cloud13ApplyRole(){
 const isDex=cloud13Role==='dex';
 const hide=['home','article','purchase','sale','sales','photos','finance','users'];
 for(const page of hide)document.querySelectorAll('[data-go="'+page+'"]').forEach(b=>b.hidden=isDex);
 $('cloud13UserAccess').hidden=isDex;
 $('dexToArticle').hidden=isDex;
 // Collection and wishlist are personal and available to every activated PWA user.
 for(const page of ['carddex','collection','wishlist','more'])document.querySelectorAll('[data-go="'+page+'"]').forEach(b=>b.hidden=false);
 $('cloud13AdminReports').hidden=isDex;
 $('welcomeText').textContent=isDex?'DEIN KARTENDEX':'TRUMMCARDS CLOUD';
}
function cloud13Init(){
 const nav=$('bottomNav');
 for(const [page,label] of [['collection','♡ Sammlung'],['wishlist','☆ Wunschliste']]){
  const b=document.createElement('button');b.type='button';b.dataset.go=page;b.textContent=label;nav.append(b);
 }
 const pages=document.createElement('div');pages.id='cloud13Pages';
 pages.innerHTML=`
 <section id="page-collection" class="page" hidden><div class="panel"><h2>Meine Sammlung</h2><p>Nur für dich sichtbar. Diese Karten verändern das Verkaufslager nicht.</p>
 <form id="cloud13CollectionForm" class="cloud13-form"><input name="name" maxlength="300" required placeholder="Kartenname">
 <input name="set_name" maxlength="200" placeholder="Set"><input name="card_number" maxlength="60" placeholder="Kartennummer">
 <select name="language"><option>Deutsch</option><option>Englisch</option><option>Japanisch</option><option>Italienisch</option></select>
 <input name="quantity" type="number" min="1" max="10000" value="1" required>
 <input name="amount_eur" type="number" min="0" step="0.01" placeholder="Geschätzter Einzelwert EUR">
 <input name="note" maxlength="2000" placeholder="Notiz">
 <input name="catalog_card_id" type="hidden"><input name="catalog_image_url" type="hidden">
 <button type="submit">Zur Sammlung hinzufügen</button></form></div>
 <div id="cloud13CollectionRows" class="stack"></div></section>
 <section id="page-wishlist" class="page" hidden><div class="panel"><h2>Meine Wunschliste</h2>
 <form id="cloud13WishlistForm" class="cloud13-form"><input name="name" maxlength="300" required placeholder="Kartenname">
 <input name="set_name" maxlength="200" placeholder="Set"><input name="card_number" maxlength="60" placeholder="Kartennummer">
 <select name="language"><option>Deutsch</option><option>Englisch</option><option>Japanisch</option><option>Italienisch</option></select>
 <input name="quantity" type="number" min="1" max="10000" value="1" required>
 <select name="priority"><option value="1">Hoch</option><option value="2">Mittel</option><option value="3">Niedrig</option></select>
 <input name="note" maxlength="2000" placeholder="Notiz">
 <input name="catalog_card_id" type="hidden"><input name="catalog_image_url" type="hidden">
 <button type="submit">Zur Wunschliste hinzufügen</button></form></div>
 <div id="cloud13WishlistRows" class="stack"></div></section>
 <section id="page-users" class="page" hidden><div class="panel"><h2>Benutzer verwalten</h2>
 <p>Benutzer zuerst in Supabase Authentication einladen, dann hier KartenDex-Zugriff vergeben.</p>
 <form id="cloud13UserForm" class="cloud13-form"><input type="email" name="email" required placeholder="E-Mail-Adresse">
 <select name="enabled"><option value="true">Freigeben</option><option value="false">Entziehen</option></select>
 <button type="submit">Berechtigung speichern</button></form><div id="cloud13UserRows"></div></div></section>`;
 $('page-more').after(pages);
 const access=document.createElement('button');access.id='cloud13UserAccess';access.type='button';access.dataset.go='users';access.textContent='Benutzerberechtigungen';access.className='secondary full';$('page-more').append(access);
 const reports=$('page-more').querySelector('.panel:nth-child(2)');
 if(reports)reports.id='cloud13AdminReports';
 else{const panel=document.createElement('div');panel.id='cloud13AdminReports';$('page-more').append(panel);}
 pages.addEventListener('click',async e=>{
  const acquired=e.target.closest('[data-cloud13-acquire]');
  if(acquired){
   const original=cloud13Items.find(item=>item.id===acquired.dataset.cloud13Acquire&&item.list_type==='wishlist');
   if(!original)return notice('Wunschlisteneintrag nicht gefunden. Bitte aktualisieren.','error');
   const answer=prompt('Wie viele Karten hast du gekauft? (1 bis '+original.quantity+')',String(original.quantity));
   if(answer===null)return;
   const trimmed=answer.trim();
   if(!/^[1-9]\\d*$/.test(trimmed)||Number(trimmed)>Number(original.quantity)){
    notice('Bitte eine gültige Stückzahl zwischen 1 und '+original.quantity+' eingeben.','error');return;
   }
   acquired.disabled=true;
   try{
    await rpc('tc_acquire_wishlist_card',{p_wishlist_id:original.id,p_quantity:Number(trimmed)});
    await cloud13Refresh();
    showPage('collection');
    notice('Karte in deine persönliche Sammlung übernommen. Das Verkaufslager bleibt unverändert.','success');
   }catch(error){notice(errorText(error),'error');}
   finally{acquired.disabled=false;}
   return;
  }
  const remove=e.target.closest('[data-personal-delete]');
  if(remove&&confirm('Diese Karte aus deiner persönlichen Liste entfernen?')){
   try{await authorizedRequest('/rest/v1/tc_personal_cards?id=eq.'+encodeURIComponent(remove.dataset.personalDelete),{method:'DELETE',headers:{Prefer:'return=minimal'}});await cloud13Refresh();}catch(error){notice(errorText(error),'error');}
  }
 });
 for(const [type,id] of [['collection','cloud13CollectionForm'],['wishlist','cloud13WishlistForm']])$(id).addEventListener('submit',async event=>{
  event.preventDefault();if(!['dex','admin'].includes(cloud13Role))return;
  try{await cloud13LoadItem(type,event.currentTarget);notice('In persönlicher '+(type==='collection'?'Sammlung':'Wunschliste')+' gespeichert.','success');}
  catch(error){notice(errorText(error),'error');}
 });
 $('cloud13UserForm').addEventListener('submit',async event=>{
  event.preventDefault();if(cloud13Role!=='admin')return;
  const data=new FormData(event.currentTarget);
  try{await rpc('tc_set_dex_viewer',{p_email:String(data.get('email')),p_enable:data.get('enabled')==='true'});await cloud13Refresh();notice('Berechtigung aktualisiert.','success');}
  catch(error){notice(errorText(error),'error');}
 });
}

function bind(){
 cloud13Init();
 $('loginForm').addEventListener('submit',login);
 for(const field of ['articleCamera','articleGallery'])f($('articleForm'),field).addEventListener('change',e=>previewArticlePhoto(e.target.files?.[0]||null));
 $('closeImageViewer').addEventListener('click',()=>$('imageViewer').close());
 $('imageViewer').addEventListener('click',e=>{if(e.target===$('imageViewer'))$('imageViewer').close();});
 marketUI11=window.TrummMarketUI11?.bind();window.TrummMarketInstance11=marketUI11;
 catalogPicker11=window.TrummCatalogUI11?.bind();
 setPicker11=window.TrummSetUI11?.bind({selectCard:id=>catalogPicker11.selectCard(id)});
 cardDexUI12=window.TrummCardDex12?.bind({onUseCard:cloud13UseCard});

 vintedUI12=window.TrummVinted12?.bind({
  getProducts:()=>state.products.filter(p=>!p.archived_at),
  getOwnImage:async p=>{
   const hero=state.productImages.find(x=>x.product_id===p.id);
   const lots=new Set(state.lots.filter(x=>x.product_id===p.id).map(x=>x.id));
   const own=hero?.storage_path||state.images.find(x=>lots.has(x.lot_id))?.storage_path;
   return own?privateImageUrl(own):null;
  }
 });
 financeUI11=window.TrummFinanceUI11?.bind(()=>({sales:state.sales,lots:state.lots,products:state.products}));
 shippingUI11=window.TrummShippingUI11?.bind({getSales:()=>state.sales,getShipments:()=>state.shipments,productName,save:saveShipment11});
 feesUI11=window.TrummFeesUI11?.bind({getProfiles:()=>state.feeProfiles,save:saveFeeProfile11,parseEuro:v=>parseMoney(v,true),onFeeApplied:updateSalePreview});
 cashUI11=window.TrummCashUI11?.bind({getEntries:()=>state.cashEntries,getSales:()=>state.sales,getLots:()=>state.lots,productName,save:saveCash11,remove:deleteCash11});
 $('articleForm').addEventListener('submit',saveArticle);
 $('purchaseForm').addEventListener('submit',savePurchase);
 $('saleForm').addEventListener('submit',saveSale);
 $('photoForm').addEventListener('submit',savePhoto);
 for(const id of ['search','inventoryLanguageFilter','inventoryStockFilter','inventorySort'])$(id).addEventListener(id==='search'?'input':'change',renderProducts);
 document.addEventListener('click',async e=>{const go=e.target.closest('[data-go]');if(go){navigate(go.dataset.go);return;}const adj=e.target.closest('[data-stock-adjust]');if(adj){await manageInventoryStock(adj.dataset.stockAdjust);return;}const arc=e.target.closest('[data-stock-archive]');if(arc){await manageInventoryStock(arc.dataset.stockArchive,true);return;}const thumb=e.target.closest('[data-photo-open]');if(thumb){await openProductImage(thumb.dataset.photoOpen);return;}const vinted=e.target.closest('[data-vinted]');if(vinted){void vintedUI12?.open(vinted.dataset.vinted);return;}const edit=e.target.closest('[data-edit]');if(edit){editArticle(edit.dataset.edit);return;}const cashSale=e.target.closest('[data-cash-sale]');if(cashSale){showPage('finance');cashUI11?.beginLinkedPayment('sale',cashSale.dataset.cashSale);return;}const cashLot=e.target.closest('[data-cash-lot]');if(cashLot){showPage('finance');cashUI11?.beginLinkedPayment('lot',cashLot.dataset.cashLot);return;}const ship=e.target.closest('[data-shipping-sale]');if(ship){showPage('sales');shippingUI11?.load(ship.dataset.shippingSale,true);$('shipmentPanel').scrollIntoView({behavior:'smooth',block:'nearest'});return;}const del=e.target.closest('[data-void]');if(del){await cancelSale(del.dataset.void);}});
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
 try{const cfg={project_ref:PROJECT,url:'https://'+PROJECT+'.supabase.co',anon_key:"sb_publishable_JDdbnEq3muaOhp3LsNhBkQ_eJZ0uYEf"};if(cfg.project_ref!==PROJECT||cfg.url!=='https://hgdexyvtgfffcasfpjyu.supabase.co'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.anon_key))throw Error('Unerwartete Produktions-Konfiguration.');ROOT=cfg.url;KEY=cfg.anon_key;restoreSession();if(session){const u=await checkAccount();$('accountEmail').textContent=u.email||'TrummCards-Konto';showApp();await refreshAll();navigate(cloud13Role==='dex'?'carddex':'home');}else showLogin();}catch(e){clearSession();showLogin();notice('Verbindung fehlgeschlagen: '+errorText(e),'error');}
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.info('PWA Cache nicht aktiv:',e.message));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
