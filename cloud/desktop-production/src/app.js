(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = window.TrummLogic;
  const pendingKey = 'trummcards-cloud-production-pending-v1';
  const SUPABASE_PROJECT = 'hgdexyvtgfffcasfpjyu';
  const DEFAULT_URL = 'https://' + SUPABASE_PROJECT + '.supabase.co';
  // Public Supabase key, safe for a client; never a secret or service-role key.
  const PUBLIC_KEY = 'sb_publishable_JDdbnEq3muaOhp3LsNhBkQ_eJZ0uYEf';
  const WRITES_ENABLED = false; // No production bookings before backups and GO-LIVE.
  const REQUIRE_GO_LIVE_MESSAGE = 'Produktionsvorschau: Buchungen sind bis zum Abschluss der Backups und zur ausdrücklichen Freigabe gesperrt.';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate = () => {const d = new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
  let sb=null, user=null, refreshing=false, saving=false;
  let state={products:[],inventory:[],lots:[],sales:[],images:[],productImages:[]};
  let activeTab='inventory';
  let lastPurchasePrice='unit';
  let lastSyncAt=0;
  let productPhotoFile=null,productPreviewUrl=null,cameraStream=null,desktopThumbObserver=null,productPreviewGeneration=0;
  let catalogPicker11=null,financeUI11=null;
  const desktopThumbCache=new Map();

  const getForm = (form,name) => form.elements.namedItem(name);
  const getValue = (form,name) => getForm(form,name).value.trim();
  const selectCurrent = (element, items, label, placeholder='Bitte waehlen') => {
    const old=element.value;
    const signature=JSON.stringify(items.map(item=>[item.id,label(item)]));
    if (element.dataset.optionsSignature===signature) return;
    element.dataset.optionsSignature=signature;
    element.replaceChildren();
    const none=document.createElement('option');none.value='';none.textContent=placeholder;element.append(none);
    for(const item of items){const opt=document.createElement('option');opt.value=item.id;opt.textContent=label(item);element.append(opt);}
    if (items.some(x=>x.id===old)) element.value=old;
  };
  const setSync=(s,level='')=>{$('syncBadge').textContent=s;$('syncBadge').className='sync '+level;};
  function flash(text,kind='info') {
    const el=$('feedback'); el.textContent=text;el.className='feedback '+kind;el.hidden=false;
  }
  function hideFlash(){$('feedback').hidden=true;}
  function showStage(stage) {
    $('setupPanel').hidden=true; // Fixed production destination.
    $('loginPanel').hidden=stage!=='login';
    $('appArea').hidden=stage!=='app';
    if(stage==='setup')setSync('Production – feste Verbindung');
    if(stage==='login')setSync('Anmeldung erforderlich');
  }
  function clientFromSettings(){
    if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(PUBLIC_KEY)||SUPABASE_PROJECT!=='hgdexyvtgfffcasfpjyu')throw Error('Ungültige Produktivverbindung.');
    return window.TrummSupabase.createClient(DEFAULT_URL,PUBLIC_KEY,{
      auth:{storageKey:'trummcards-cloud-production-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
      global:{headers:{'x-trummcards-client':'cloud-production-0.9.0'}}
    });
  }
  function lockForms(locked) {
    document.querySelectorAll('#appArea form button[type="submit"], #loginForm button[type="submit"], #setupForm button[type="submit"]').forEach(b=>b.disabled=locked);
  }
  async function withSaving(action) {
    if(saving)return;
    saving=true;lockForms(true);hideFlash();
    try{await action();}catch(err){flash(L.apiError(err),'error');setSync('Verbindung pruefen','problem');console.error('TrummCards Cloud Production:',err);}finally{saving=false;lockForms(false);}
  }
  async function initialize(){
    try{
      sb=clientFromSettings();
      setSync('Verbinde mit Production …');
      const {data,error}=await sb.auth.getSession();
      if(error)throw error;
      if(data.session?.user){user=data.session.user;await enterApp();}
      else{user=null;showStage('login');}
    }catch(err){showStage('login');flash(L.apiError(err),'error');}
  }
  async function enterApp() {
    if(!sb||!user)throw Error('Keine Anmeldesitzung.');
    const {data,error}=await sb.rpc('tc_is_authorized');
    if(error)throw error;
    if(data!==true){await sb.auth.signOut();user=null;showStage('login');throw Error('Dieses Konto ist nicht fuer TrummCards freigeschaltet. Bitte in Authentication > Users das richtige Konto verwenden.');}
    $('accountLabel').textContent='Angemeldet: '+(user.email||'Konto')+' | Projekt: PRODUCTION';
    showStage('app'); await refreshAll(true);
  }
  async function refreshAll(silent=false) {
    if(!sb||!user||refreshing)return;
    refreshing=true;setSync('Synchronisiere ...');
    try {
      const requests=[
        sb.from('tc_products').select('id,sku,name,set_name,language,card_condition,card_number,rarity,card_variant,storage_location,grading_company,grading_grade,grading_certificate,catalog_card_id,note,created_at').order('name',{ascending:true}).limit(1000),
        sb.from('tc_inventory').select('product_id,available_qty,remaining_cost').limit(1000),
        sb.from('tc_purchase_lots').select('id,product_id,bought_on,purchased_qty,available_qty,purchase_total,extra_cost,allocated_cost,source,note,created_at').order('bought_on',{ascending:true}).limit(1000),
        sb.from('tc_sales').select('id,product_id,sold_on,qty,price,shipping_income,shipping_cost,fees,other_cost,cogs_total,platform,note,status,created_at').order('created_at',{ascending:false}).limit(1000),
        sb.from('tc_lot_images').select('id,lot_id,storage_path,mime_type,display_order').limit(1000),
        sb.from('tc_product_images').select('id,product_id,storage_path,mime_type,created_at').limit(1000)
      ];
      const result=await Promise.all(requests);
      for(const r of result) if(r.error)throw r.error;
      state={products:result[0].data||[],inventory:result[1].data||[],lots:result[2].data||[],sales:result[3].data||[],images:result[4].data||[],productImages:result[5].data||[]};
      lastSyncAt=Date.now();
      render();setSync('Synchronisiert '+new Date().toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),'online');
      if(!silent)flash('Lagerbestand, Einkaeufe und Verkaeufe aus Supabase aktualisiert.','success');
    }catch(err){setSync('Synchronisierung fehlgeschlagen','problem');if(!silent)flash(L.apiError(err),'error');else console.error(err);}
    finally{refreshing=false;}
  }
  function totalAvailable(productId){return Number(state.inventory.find(i=>i.product_id===productId)?.available_qty||0);}
  function selectedProduct(productId){return state.products.find(p=>p.id===productId);}
  function productName(productId){return selectedProduct(productId)?.name||'Unbekannter Artikel';}

  function productImagePath(productId){
    const hero=state.productImages.find(i=>i.product_id===productId);
    if(hero)return hero.storage_path;
    const lotIds=new Set(state.lots.filter(l=>l.product_id===productId).map(l=>l.id));
    return state.images.find(i=>lotIds.has(i.lot_id))?.storage_path||null;
  }
  function clearDesktopThumbnails(){
    if(desktopThumbObserver){desktopThumbObserver.disconnect();desktopThumbObserver=null;}
    desktopThumbCache.clear();
  }
  async function productImageUrl(path){
    const cached=desktopThumbCache.get(path);
    if(cached&&cached.expires>Date.now())return cached.url;
    const {data,error}=await sb.storage.from('trummcards-lot-images').createSignedUrl(path,300);
    if(error||!data?.signedUrl)throw (error||Error('Bild konnte nicht geladen werden.'));
    desktopThumbCache.set(path,{url:data.signedUrl,expires:Date.now()+240000});
    return data.signedUrl;
  }
  async function loadDesktopThumbnail(img){
    const path=productImagePath(img.dataset.inventoryThumb);
    if(!path||!img.isConnected)return;
    try{
      const url=await productImageUrl(path);
      if(!img.isConnected||path!==productImagePath(img.dataset.inventoryThumb))return;
      img.src=url;img.hidden=false;
      if(img.nextElementSibling)img.nextElementSibling.hidden=true;
    }catch(e){console.info('Artikelbild:',e.message);}
  }
  function prepareDesktopThumbnails(){
    if(desktopThumbObserver){desktopThumbObserver.disconnect();desktopThumbObserver=null;}
    // Observe the VISIBLE thumbnail button, not its hidden <img>. A hidden image
    // never intersects, so observing it would leave the placeholder forever.
    const cards=[...document.querySelectorAll('#inventoryRows img[data-inventory-thumb]')]
      .map(img=>img.closest('.inventory-thumb')).filter(Boolean);
    const load=card=>{const img=card.querySelector('img[data-inventory-thumb]');if(img)void loadDesktopThumbnail(img);};
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target);}
      },{rootMargin:'300px'});
      desktopThumbObserver=observer;
      cards.forEach((card,index)=>{if(index<24)load(card);else observer.observe(card);});
    }else cards.forEach(load);
  }
  async function openDesktopProductImage(id){
    const path=productImagePath(id);if(!path)return;
    try{
      const url=await productImageUrl(path);
      $('desktopViewerImage').src=url;$('desktopViewerCaption').textContent=productName(id);
      if(!$('desktopImageViewer').open)$('desktopImageViewer').showModal();
    }catch(e){flash(L.apiError(e),'error');}
  }
  function filteredInventoryProducts() {
    const text=$('inventorySearch').value.trim().toLocaleLowerCase('de');
    const lang=$('inventoryLanguageFilter').value;
    const stock=$('inventoryStockFilter').value;
    const sort=$('inventorySort').value;
    const languages=[...new Set(state.products.map(p=>p.language).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
    const filter=$('inventoryLanguageFilter');
    if(filter.dataset.optionsSignature!==JSON.stringify(languages)){
      const previous=filter.value;filter.replaceChildren();
      const all=document.createElement('option');all.value='';all.textContent='Alle Sprachen';filter.append(all);
      for(const name of languages){const el=document.createElement('option');el.value=name;el.textContent=name;filter.append(el);}
      filter.value=languages.includes(previous)?previous:'';
      filter.dataset.optionsSignature=JSON.stringify(languages);
    }
    const filtered=state.products.filter(p=>{
      const quantity=totalAvailable(p.id);
      if(lang&&p.language!==lang)return false;
      if(stock==='available'&&quantity<=0)return false;
      if(stock==='empty'&&quantity>0)return false;
      const content=['name','sku','set_name','card_number','rarity','card_variant','storage_location','card_condition','grading_company','grading_grade','grading_certificate'].map(k=>p[k]||'').join(' ').toLocaleLowerCase('de');
      return !text||text.split(/\s+/).every(term=>content.includes(term));
    });
    filtered.sort((a,b)=>{
      if(sort==='stock')return totalAvailable(b.id)-totalAvailable(a.id)||a.name.localeCompare(b.name,'de');
      if(sort==='location')return (a.storage_location||'').localeCompare(b.storage_location||'','de')||a.name.localeCompare(b.name,'de');
      if(sort==='set')return (a.set_name||'').localeCompare(b.set_name||'','de')||a.name.localeCompare(b.name,'de');
      return a.name.localeCompare(b.name,'de');
    });
    $('inventoryFilterCount').textContent=filtered.length+' von '+state.products.length+' Artikeln';
    return filtered;
  }
  function render() {
    const inv=state.inventory;
    $('metricProducts').textContent=state.products.length.toLocaleString('de-AT');
    $('metricQty').textContent=inv.reduce((n,r)=>n+Number(r.available_qty),0).toLocaleString('de-AT');
    $('metricValue').textContent=L.euro(inv.reduce((n,r)=>n+Number(r.remaining_cost),0));
    $('metricProfit').textContent=L.euro(state.sales.filter(s=>s.status==='booked').reduce((n,s)=>n+L.profit({price:Number(s.price),shippingIncome:Number(s.shipping_income),shippingCost:Number(s.shipping_cost),fees:Number(s.fees),other:Number(s.other_cost),cost:Number(s.cogs_total)}),0));
    $('inventoryRows').innerHTML=filteredInventoryProducts().map(p=>{
      const x=inv.find(i=>i.product_id===p.id)||{available_qty:0,remaining_cost:0};
      const picture=productImagePath(p.id)?'<button type="button" class="inventory-thumb" data-open-product-image="'+p.id+'" aria-label="Artikelbild von '+escapeHtml(p.name)+' vergrößern" title="Bild groß anzeigen"><img data-inventory-thumb="'+p.id+'" alt="Bild von '+escapeHtml(p.name)+'" width="60" height="72" decoding="async" hidden><span class="inventory-photo-placeholder" aria-hidden="true">▧</span></button>':'<div class="inventory-thumb no-photo" title="Noch kein Artikelbild" aria-label="Kein Bild vorhanden">▧</div>';
      return '<tr><td>'+picture+'</td><td>'+escapeHtml(p.name)+'</td><td>'+escapeHtml(p.sku||'-')+'</td><td>'+escapeHtml(p.set_name||'-')+'<br><small>'+escapeHtml(p.card_number||'')+'</small></td><td>'+escapeHtml(p.card_condition||'-')+'</td><td>'+escapeHtml(p.storage_location||'-')+'</td><td>'+Number(x.available_qty)+'</td><td>'+L.euro(x.remaining_cost)+'</td><td><button type="button" data-edit-product="'+p.id+'">Bearbeiten</button></td></tr>';
    }).join('') || '<tr><td colspan="9" class="empty">Keine Artikel passend zur Suche.</td></tr>';
    prepareDesktopThumbnails();
    selectCurrent(getForm($('purchaseForm'),'product'),state.products,p=>p.name+' | '+(p.sku||'ohne SKU'),'Artikel auswaehlen');
    selectCurrent(getForm($('saleForm'),'product'),state.products.filter(p=>totalAvailable(p.id)>0),p=>p.name+' ('+totalAvailable(p.id)+' verfuegbar)','Artikel auswaehlen');
    selectCurrent(getForm($('imageForm'),'lot'),state.lots,l=>productName(l.product_id)+' | '+l.bought_on+' | '+l.id.slice(0,8),'Einkaufslos auswaehlen');
    $('salesRows').innerHTML=state.sales.map(s=>{
      const earned=L.profit({price:Number(s.price),shippingIncome:Number(s.shipping_income),shippingCost:Number(s.shipping_cost),fees:Number(s.fees),other:Number(s.other_cost),cost:Number(s.cogs_total)});
      return `<tr><td>${escapeHtml(s.sold_on)}</td><td>${escapeHtml(productName(s.product_id))}</td><td>${Number(s.qty)}</td><td>${L.euro(s.price)}</td><td>${L.euro(s.cogs_total)}</td><td class="${earned<0?'negative':'positive'}">${L.euro(earned)}</td><td>${s.status==='booked'?'Gebucht':'Storniert'}</td><td>${s.status==='booked'?`<button type="button" data-void-sale="${s.id}">Stornieren</button>`:'-'}</td></tr>`;
    }).join('')||'<tr><td colspan="8" class="empty">Noch keine Verkaeufe in Production.</td></tr>';
    $('lotsRows').innerHTML=state.lots.map(l=>`<tr><td>${escapeHtml(l.bought_on)}</td><td>${escapeHtml(productName(l.product_id))}</td><td>${Number(l.purchased_qty)}</td><td>${Number(l.available_qty)}</td><td>${L.euro(Number(l.purchase_total)+Number(l.extra_cost))}</td><td>${escapeHtml(l.source||'-')}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Noch keine Einkaufschargen.</td></tr>';
    renderPending(); updateSaleHint(); updatePurchaseHint();
    financeUI11?.render();
    if(activeTab==='photos')renderImages().catch(e=>console.error('Picture display:',e));
  }
  function switchTab(name) {
    activeTab=name;
    document.querySelectorAll('.tab').forEach(s=>s.hidden=s.id!=='tab-'+name);
    document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    window.scrollTo({top:0,behavior:'smooth'});
    if(name==='photos')renderImages().catch(err=>flash(L.apiError(err),'error'));
    if(name==='finance')financeUI11?.render();
  }

  function stopProductCamera(){
    if(cameraStream){for(const track of cameraStream.getTracks())track.stop();cameraStream=null;}
    const video=$('productCameraVideo');video.pause();video.srcObject=null;video.hidden=true;
    $('cameraShot').hidden=true;$('cameraStop').hidden=true;$('cameraStart').hidden=false;
  }
  async function startProductCamera(){
    if(!navigator.mediaDevices?.getUserMedia){flash('Keine Browser-Kamerafunktion verfuegbar. Bitte Bilddatei auswaehlen.','error');return;}
    try{
      stopProductCamera();
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      const video=$('productCameraVideo');video.hidden=false;video.srcObject=cameraStream;await video.play();
      $('cameraShot').hidden=false;$('cameraStop').hidden=false;$('cameraStart').hidden=true;
    }catch(e){stopProductCamera();flash('Kamera nicht verfuegbar: '+L.apiError(e)+'. Alternativ eine Bilddatei auswaehlen.','error');}
  }
  async function takeProductPhoto(){
    const video=$('productCameraVideo');
    if(!cameraStream||!video.videoWidth)throw Error('Die Kamera liefert noch kein Bild.');
    const canvas=document.createElement('canvas');
    const ratio=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));
    canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));canvas.height=Math.max(1,Math.round(video.videoHeight*ratio));
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Foto konnte nicht aufgenommen werden.')),'image/jpeg',0.86));
    previewProductPicture(new File([blob],'TrummCards-Kamera.jpg',{type:'image/jpeg'}));
    stopProductCamera();
  }
  function previewProductPicture(file){
    if(productPreviewUrl)URL.revokeObjectURL(productPreviewUrl);
    productPreviewUrl=null;productPhotoFile=file||null;
    productPreviewGeneration++;
    const img=$('productImagePreview'),caption=$('productImageSelection');
    $('productCurrentImageOpen').hidden=true;
    img.hidden=true;img.removeAttribute('src');
    caption.textContent=file?file.name+' ('+Math.ceil(file.size/1024)+' KB) wird beim Speichern hochgeladen.':'Noch kein neues Bild ausgewählt.';
    if(file){productPreviewUrl=URL.createObjectURL(file);img.src=productPreviewUrl;img.hidden=false;}
  }
  async function showCurrentProductEditPhoto(productId){
    const path=productImagePath(productId);
    if(!path)return;
    const generation=++productPreviewGeneration;
    $('productImageSelection').textContent='Gespeichertes Bild wird geladen …';
    try{
      const signedUrl=await productImageUrl(path);
      const form=$('productForm');
      if(generation!==productPreviewGeneration||getValue(form,'edit_id')!==productId||productPhotoFile)return;
      const img=$('productImagePreview');
      img.src=signedUrl;img.hidden=false;
      $('productImageSelection').textContent='Aktuelles Artikelbild – per Klick vergrößern oder neues Bild auswählen.';
      $('productCurrentImageOpen').hidden=false;
    }catch(err){
      if(generation===productPreviewGeneration){
        $('productImageSelection').textContent='Bild vorhanden, Vorschau konnte nicht geladen werden: '+L.apiError(err);
        $('productCurrentImageOpen').hidden=false;
      }
    }
  }
  function startProductEdit(id) {
    const p=selectedProduct(id);if(!p)return;
    resetProductEdit();
    const form=$('productForm');
    for(const k of ['name','sku','set_name','language','card_condition','card_number','rarity','card_variant','storage_location','grading_company','grading_grade','grading_certificate','catalog_card_id','note'])getForm(form,k).value=p[k]||'';
    getForm(form,'edit_id').value=p.id;
    $('productFormTitle').textContent='Artikel bearbeiten';
    $('productSubmit').textContent='Aenderungen und Bild speichern';$('productCancel').hidden=false;
    if(productImagePath(id))void showCurrentProductEditPhoto(id);
    switchTab('inventory');form.elements.namedItem('name').focus();
  }
  function resetProductEdit(){
    stopProductCamera();
    const form=$('productForm');form.reset();getForm(form,'edit_id').value='';getForm(form,'catalog_card_id').value='';
    catalogPicker11?.clear();
    previewProductPicture(null);
    $('productFormTitle').textContent='Artikel anlegen';
    $('productSubmit').textContent='Artikel und Bild speichern';$('productCancel').hidden=true;
  }
  async function uploadProductPicture(productId,file){
    if(file.size>10*1024*1024||file.size<=0)throw Error('Artikelbild muss maximal 10 MB gross sein.');
    const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    if(!ext)throw Error('Nur JPG, PNG oder WebP sind erlaubt.');
    const old=state.productImages.find(x=>x.product_id===productId)?.storage_path;
    const id=crypto.randomUUID(),path=user.id+'/products/'+productId+'/'+id+'.'+ext;
    const upload=await sb.storage.from('trummcards-lot-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(upload.error)throw upload.error;
    const stored=await sb.from('tc_product_images').upsert({owner_id:user.id,product_id:productId,storage_path:path,mime_type:file.type},{onConflict:'product_id'});
    if(stored.error){
      try{await sb.storage.from('trummcards-lot-images').remove([path]);}catch{}
      throw stored.error;
    }
    if(old&&old!==path){
      desktopThumbCache.delete(old);
      try{await sb.storage.from('trummcards-lot-images').remove([old]);}catch{}
    }
  }
  async function saveProduct(e){
    e.preventDefault();if(!WRITES_ENABLED){flash(REQUIRE_GO_LIVE_MESSAGE,'error');return;}const form=e.currentTarget;
    await withSaving(async()=>{
      let id=getValue(form,'edit_id');
      const fields={name:getValue(form,'name'),sku:getValue(form,'sku')||null,set_name:getValue(form,'set_name'),language:getValue(form,'language'),card_condition:getValue(form,'card_condition'),card_number:getValue(form,'card_number'),rarity:getValue(form,'rarity'),card_variant:getValue(form,'card_variant'),storage_location:getValue(form,'storage_location'),grading_company:getValue(form,'grading_company'),grading_grade:getValue(form,'grading_grade'),grading_certificate:getValue(form,'grading_certificate'),catalog_card_id:getValue(form,'catalog_card_id'),note:getValue(form,'note')};
      if(!fields.name)throw Error('Bitte Artikelname eingeben.');
      if(fields.sku&&state.products.some(p=>p.id!==id&&String(p.sku||'').trim().toLowerCase()===fields.sku.trim().toLowerCase()))throw Error('Artikelnummer bereits verwendet, bitte andere waehlen.');
      const editing=Boolean(id);
      const query=editing?sb.from('tc_products').update(fields).eq('id',id):sb.from('tc_products').insert({...fields,owner_id:user.id});
      const {data,error}=await query.select('id').single();
      if(error)throw error;
      id=data?.id||id;
      if(!id)throw Error('Artikel eventuell angelegt. Bitte Lager pruefen und nicht erneut anlegen.');
      getForm(form,'edit_id').value=id;
      if(productPhotoFile){
        try{await uploadProductPicture(id,productPhotoFile);}
        catch(err){await refreshAll(true);throw Error('Artikel wurde gespeichert, aber das Bild nicht: '+L.apiError(err)+'. Bitte den vorhandenen Artikel bearbeiten und erneut versuchen.');}
      }
      const jumpToPurchase=!editing&&getForm(form,'after_save_purchase').checked;
      resetProductEdit();await refreshAll(true);
      if(jumpToPurchase){switchTab('purchase');getForm($('purchaseForm'),'product').value=id;updatePurchaseHint();}
      flash(jumpToPurchase?'Karte gespeichert. Jetzt den Einkauf erfassen.':(editing?'Artikel und Bild aktualisiert.':'Neuer Artikel mit optionalem Bild gespeichert.'),'success');
    });
  }
  function updatePurchaseHint() {
    const f=$('purchaseForm');
    try {
      const n=L.count(getValue(f,'qty'));
      const total=L.parseMoney(getValue(f,'total'));
      const extra=L.parseMoney(getValue(f,'extra'),{optional:true});
      $('purchaseHint').textContent=`${n} Stueck | Einkauf gesamt ${L.euro(total)} + Zusatzkosten ${L.euro(extra)} | Einstand je Stueck inkl. Zusatzkosten ca. ${L.euro((total+extra)/n)}`;
    } catch {$('purchaseHint').textContent='Stueckzahl und Preise eingeben, dann berechnet TrummCards den Einstand automatisch.';}
  }
  function purchasePriceChanged(field) {
    const f=$('purchaseForm');lastPurchasePrice=field==='qty'?lastPurchasePrice:field;
    try {
      const qty=L.count(getValue(f,'qty'));
      if(lastPurchasePrice==='unit'){
        const unit=L.parseMoney(getValue(f,'unit'));
        getForm(f,'total').value=L.amountInput(L.money(qty*unit));
      } else {
        const total=L.parseMoney(getValue(f,'total'));
        // Display a 4-decimal unit price when not exactly divisible; backend keeps the exact total.
        getForm(f,'unit').value=(total/qty).toFixed(4).replace(/0+$/,'').replace(/\.$/,'').replace('.',',');
      }
    }catch{ /* Never overwrite an in-progress input or steal its focus. */ }
    updatePurchaseHint();
  }
  function operationPayload(name,payload) {
    const signature=JSON.stringify({owner:user.id,name,payload});
    let old=null;try{old=JSON.parse(localStorage.getItem(pendingKey));}catch{}
    if(old){
      if(old.signature===signature)return old.id;
      throw Error('Eine fruehere Buchung ist noch ungeklaert. Bitte Bestand und Historie pruefen und danach im gelben Hinweis die Buchung entsperren.');
    }
    const id=crypto.randomUUID();localStorage.setItem(pendingKey,JSON.stringify({signature,id,name,time:new Date().toISOString()}));renderPending();return id;
  }
  function renderPending() {
    let p=null;try{p=JSON.parse(localStorage.getItem(pendingKey));}catch{}
    let banner=$('pendingPanel');
    if(!banner){banner=document.createElement('div');banner.id='pendingPanel';banner.className='warning';$('appArea').insertBefore(banner,$('tabs'));}
    if(!p){banner.hidden=true;return;}
    banner.hidden=false;
    banner.replaceChildren();
    const txt=document.createElement('span');txt.textContent='Eine Buchung wurde begonnen. Wenn der Server nicht geantwortet hat, erneut denselben Vorgang absenden (Doppelbuchungsschutz). Vor einer anderen Buchung zuerst Historie und Bestand pruefen. ';
    const btn=document.createElement('button');btn.type='button';btn.textContent='Nach Kontrolle entsperren';
    btn.addEventListener('click',()=>{if(confirm('Hast du Lager und Buchungshistorie geprueft? Falls eine Buchung noch unklar ist, koennte ein erneuter neuer Buchungsversuch doppelt buchen.')){localStorage.removeItem(pendingKey);renderPending();flash('Buchungssperre nach manueller Kontrolle entfernt.','success');}});
    banner.append(txt,btn);
  }
  async function savePurchase(e) {
    e.preventDefault();if(!WRITES_ENABLED){flash(REQUIRE_GO_LIVE_MESSAGE,'error');return;}await withSaving(async()=>{
      const f=e.currentTarget;
      const product=getValue(f,'product'),date=getValue(f,'date'),qty=L.count(getValue(f,'qty'));
      if(!state.products.some(p=>p.id===product))throw Error('Bitte einen Artikel auswaehlen.');
      const total=L.parseMoney(getValue(f,'total'));
      const extra=L.parseMoney(getValue(f,'extra'),{optional:true});
      const req={p_product_id:product,p_bought_on:date,p_qty:qty,p_purchase_total:total.toFixed(2),p_extra_cost:extra.toFixed(2),p_source:getValue(f,'source'),p_note:getValue(f,'note')};
      const id=operationPayload('purchase',req);
      const {error}=await sb.rpc('tc_book_purchase',{...req,p_request_key:id});if(error)throw error;
      localStorage.removeItem(pendingKey);renderPending();f.reset();getForm(f,'date').value=localDate();getForm(f,'qty').value='1';
      getForm(f,'unit').value=getForm(f,'total').value=getForm(f,'extra').value='0,00';
      lastPurchasePrice='unit';await refreshAll(true);flash('Einkauf in Supabase gebucht. Lagerbestand erhoeht.','success');
    });
  }
  function saleInput() {
    const f=$('saleForm');
    return {
      product:getValue(f,'product'),date:getValue(f,'date'),qty:L.count(getValue(f,'qty')),
      price:L.parseMoney(getValue(f,'price')),
      shippingIncome:L.parseMoney(getValue(f,'shippingIncome'),{optional:true}),
      shippingCost:L.parseMoney(getValue(f,'shippingCost'),{optional:true}),
      fees:L.parseMoney(getValue(f,'fees'),{optional:true}),
      other:L.parseMoney(getValue(f,'other'),{optional:true}),
      platform:getValue(f,'platform'),note:getValue(f,'note')
    };
  }
  function updateSaleHint() {
    try {
      const v=saleInput();
      if(!v.product)throw Error('Artikel fehlt');
      const fifo=L.fifoPreview(state.lots,v.product,v.qty);
      const available=totalAvailable(v.product);
      if(fifo.missing) { $('saleHint').textContent=`Nur ${available} Stueck verfuegbar. Fuer diesen Verkauf fehlen ${fifo.missing} Stueck.`;return;}
      const gain=L.profit({...v,cost:fifo.cost});
      $('saleHint').textContent=`${v.qty} Stueck | voraussichtlicher FIFO-Einstand ${L.euro(fifo.cost)} | voraussichtlicher Gewinn ${L.euro(gain)}. Endgueltig ist die Serverberechnung.`;
    }catch{$('saleHint').textContent='Artikel, Stueckzahl und Preis eingeben: Einstand und Gewinn werden sofort berechnet.';}
  }
  async function saveSale(e) {
    e.preventDefault();if(!WRITES_ENABLED){flash(REQUIRE_GO_LIVE_MESSAGE,'error');return;}await withSaving(async()=>{
      const v=saleInput();
      if(!v.product)throw Error('Bitte Artikel mit Bestand auswaehlen.');
      if(L.fifoPreview(state.lots,v.product,v.qty).missing)throw Error('Nicht genuegend Bestand. Bitte zuerst synchronisieren.');
      const req={
        p_product_id:v.product,p_sold_on:v.date,p_qty:v.qty,p_price:v.price.toFixed(2),
        p_shipping_income:v.shippingIncome.toFixed(2),p_shipping_cost:v.shippingCost.toFixed(2),
        p_fees:v.fees.toFixed(2),p_other_cost:v.other.toFixed(2),p_platform:v.platform,p_note:v.note
      };
      const id=operationPayload('sale',req);
      const {error}=await sb.rpc('tc_book_sale',{...req,p_request_key:id});if(error)throw error;
      localStorage.removeItem(pendingKey);renderPending();const bought=v.qty;
      e.currentTarget.reset();getForm(e.currentTarget,'date').value=localDate();
      await refreshAll(true);switchTab('bookings');flash(`${bought} Stueck verkauft. FIFO-Einstand und Bestand wurden auf dem Server gebucht.`,'success');
    });
  }
  async function voidSale(id) {
    if(!WRITES_ENABLED){flash(REQUIRE_GO_LIVE_MESSAGE,'error');return;}
    const s=state.sales.find(x=>x.id===id&&x.status==='booked');if(!s)return;
    if(!confirm('Verkauf von '+s.qty+' Stueck '+productName(s.product_id)+' stornieren? Der Bestand wird wiederhergestellt.'))return;
    await withSaving(async()=>{
      const {error}=await sb.rpc('tc_void_sale',{p_sale_id:id});if(error)throw error;
      await refreshAll(true);flash('Verkauf storniert und Lagerbestand korrigiert.','success');
    });
  }
  async function saveImage(e) {
    e.preventDefault();if(!WRITES_ENABLED){flash(REQUIRE_GO_LIVE_MESSAGE,'error');return;}await withSaving(async()=>{
      const form=e.currentTarget,lotId=getValue(form,'lot'),file=getForm(form,'file').files[0];
      const lot=state.lots.find(l=>l.id===lotId);
      if(!lot||!file)throw Error('Bitte Einkaufslos und ein Bild auswaehlen.');
      if(file.size>10*1024*1024 || file.size<=0)throw Error('Das Bild darf maximal 10 MB gross sein.');
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
      if(!ext)throw Error('Nur JPG, PNG oder WebP sind erlaubt.');
      const imageId=crypto.randomUUID(),path=`${user.id}/${lotId}/${imageId}.${ext}`;
      const upload=await sb.storage.from('trummcards-lot-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
      if(upload.error)throw upload.error;
      const saved=await sb.from('tc_lot_images').insert({id:imageId,owner_id:user.id,lot_id:lotId,storage_path:path,mime_type:file.type});
      if(saved.error){await sb.storage.from('trummcards-lot-images').remove([path]);throw saved.error;}
      form.reset();await refreshAll(true);flash('Artikelbild privat in Supabase gespeichert.','success');
    });
  }

  async function renderImages(){
    const panel=$('imageCards');panel.replaceChildren();
    const photos=[
      ...state.productImages.map(i=>({storage_path:i.storage_path,product_id:i.product_id,label:'Artikelbild'})),
      ...state.images.map(i=>{
        const lot=state.lots.find(l=>l.id===i.lot_id);
        return {storage_path:i.storage_path,product_id:lot?.product_id,label:lot?'Einkauf vom '+lot.bought_on:'Einkaufsbild'};
      })
    ];
    if(!photos.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Artikelbilder in Production.';panel.append(p);return;}
    for(const photo of photos.slice(0,40)){
      const card=document.createElement('div');card.className='image-card';
      const picture=document.createElement('img');picture.alt=productName(photo.product_id)+' Bild';picture.loading='lazy';
      try{picture.src=await productImageUrl(photo.storage_path);}catch(e){console.info('Bild konnte nicht geladen werden:',e.message);}
      const caption=document.createElement('p');caption.textContent=productName(photo.product_id);
      const meta=document.createElement('small');meta.textContent=photo.label;
      card.append(picture,caption,meta);panel.append(card);
    }
  }
  async function initializeCloudUpdater(){
    const api=window.trummcardsCloudUpdates;
    if(!api){$('cloudUpdateStatus').textContent='Updater nur in der installierten Windows-App verfügbar.';return;}
    const show=state=>{
      $('cloudUpdateStatus').textContent=state?.message||'Updateprüfung noch nicht gestartet.';
      $('cloudUpdateProgress').hidden=typeof state?.percent!=='number';
      if(typeof state?.percent==='number')$('cloudUpdateProgress').value=Math.max(0,Math.min(100,state.percent));
      $('cloudUpdateInstall').disabled=state?.phase!=='ready';
    };
    try{
      const initial=await api.getInfo();
      $('cloudUpdateVersion').textContent=initial.version||'–';
      show(initial.state);
      api.onStatus(show);
      $('cloudUpdateCheck').addEventListener('click',async()=>{
        const result=await api.check();if(!result?.ok&&result?.message)$('cloudUpdateStatus').textContent=result.message;
      });
      $('cloudUpdateInstall').addEventListener('click',async()=>{
        if(!confirm('Cloud-Update jetzt installieren? Bitte laufende Buchungen vorher abschließen.'))return;
        const result=await api.install();
        if(!result?.ok)$('cloudUpdateStatus').textContent=result?.message||'Update konnte nicht gestartet werden.';
      });
    }catch(e){$('cloudUpdateStatus').textContent='Updater nicht erreichbar: '+L.apiError(e);}
  }
  function bind() {
    $('setupForm').addEventListener('submit',e=>{e.preventDefault();flash('Die Produktionsverbindung ist fest im Programm hinterlegt.','info');});
    $('loginForm').addEventListener('submit',e=>{e.preventDefault();withSaving(async()=>{
      const f=e.currentTarget,email=getValue(f,'email'),password=getForm(f,'password').value;
      if(!sb)throw Error('Bitte die Produktivverbindung prüfen.');
      const {data,error}=await sb.auth.signInWithPassword({email,password});getForm(f,'password').value='';
      if(error)throw error;
      user=data.user;await enterApp();flash('Cloud-Anmeldung erfolgreich. Produktiv-Lager wurde geladen.','success');
    });});
    $('changeSettings').addEventListener('click',()=>flash('TrummCards Production kann nicht auf TEST oder fremde Projekte umgestellt werden.','info'));
    $('logoutBtn').addEventListener('click',()=>withSaving(async()=>{
      if(sb) {const {error}=await sb.auth.signOut();if(error)throw error;}
      user=null;state={products:[],inventory:[],lots:[],sales:[],images:[],productImages:[]};clearDesktopThumbnails();stopProductCamera();showStage('login');flash('Erfolgreich abgemeldet.','success');
    }));
    $('refreshBtn').addEventListener('click',()=>refreshAll());
    $('tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)switchTab(b.dataset.tab);});
    void initializeCloudUpdater();
    catalogPicker11=window.TrummCatalogUI11?.bind();
    financeUI11=window.TrummFinanceUI11?.bind(()=>({sales:state.sales,lots:state.lots,products:state.products}));
    $('productForm').addEventListener('submit',saveProduct);
    getForm($('productForm'),'productPicture').addEventListener('change',e=>{stopProductCamera();previewProductPicture(e.target.files?.[0]||null);});
    $('cameraStart').addEventListener('click',()=>{void startProductCamera();});
    $('cameraShot').addEventListener('click',()=>{void takeProductPhoto().catch(err=>flash(L.apiError(err),'error'));});
    $('cameraStop').addEventListener('click',stopProductCamera);
    $('desktopImageClose').addEventListener('click',()=>$('desktopImageViewer').close());
    $('desktopImageViewer').addEventListener('click',e=>{if(e.target===$('desktopImageViewer'))$('desktopImageViewer').close();});
    $('productCurrentImageOpen').addEventListener('click',()=>{
      const id=getValue($('productForm'),'edit_id');
      if(id)void openDesktopProductImage(id);
    });
    $('productImagePreview').addEventListener('click',()=>{
      const id=getValue($('productForm'),'edit_id');
      if(id&&!productPhotoFile)void openDesktopProductImage(id);
    });
    $('productCancel').addEventListener('click',resetProductEdit);
    for(const id of ['inventorySearch','inventoryLanguageFilter','inventoryStockFilter','inventorySort']){
      $(id).addEventListener(id==='inventorySearch'?'input':'change',render);
    }
    $('inventoryRows').addEventListener('click',e=>{const view=e.target.closest('[data-open-product-image]');if(view){void openDesktopProductImage(view.dataset.openProductImage);return;}const b=e.target.closest('[data-edit-product]');if(b)startProductEdit(b.dataset.editProduct);});
    $('purchaseForm').addEventListener('submit',savePurchase);
    for(const name of ['unit','total','qty'])getForm($('purchaseForm'),name).addEventListener('input',()=>purchasePriceChanged(name));
    getForm($('purchaseForm'),'extra').addEventListener('input',updatePurchaseHint);
    $('saleForm').addEventListener('submit',saveSale);
    $('saleForm').addEventListener('input',updateSaleHint);
    $('saleForm').addEventListener('change',updateSaleHint);
    $('salesRows').addEventListener('click',e=>{const b=e.target.closest('[data-void-sale]');if(b)voidSale(b.dataset.voidSale);});
    $('imageForm').addEventListener('submit',saveImage);
    window.addEventListener('focus',()=>{if(user&&Date.now()-lastSyncAt>5000)refreshAll(true);});
    window.addEventListener('beforeunload',stopProductCamera);
    setInterval(()=>{if(user&&!document.hidden)refreshAll(true);},12000);
  }
  async function boot() {
    if(!window.TrummSupabase?.createClient) {flash('Supabase-Bibliothek fehlt. Bitte die Test-App neu erstellen.','error');return;}
    getForm($('purchaseForm'),'date').value=localDate();
    getForm($('saleForm'),'date').value=localDate();
    bind();await initialize();
  }
  window.trummcardsCloudIsSaving=()=>saving;
  boot().catch(e=>{console.error(e);flash(L.apiError(e),'error');});
})();
