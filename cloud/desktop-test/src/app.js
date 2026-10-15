(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = window.TrummLogic;
  const settingsKey = 'trummcards-cloud-test-config-v1';
  const pendingKey = 'trummcards-cloud-test-pending-v1';
  const SUPABASE_PROJECT = 'cpycfxolqpidfjbhhsmr';
  const DEFAULT_URL = 'https://' + SUPABASE_PROJECT + '.supabase.co';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate = () => {const d = new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
  let sb=null, user=null, refreshing=false, saving=false;
  let state={products:[],inventory:[],lots:[],sales:[],images:[]};
  let activeTab='inventory';
  let lastPurchasePrice='unit';
  let lastSyncAt=0;

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
    $('setupPanel').hidden=stage!=='setup';
    $('loginPanel').hidden=stage!=='login';
    $('appArea').hidden=stage!=='app';
    if(stage==='setup')setSync('Verbindung einrichten');
    if(stage==='login')setSync('Anmeldung erforderlich');
  }
  function readSettings() {try {return JSON.parse(localStorage.getItem(settingsKey));}catch{return null;}}
  function saveSettings(url,key) {localStorage.setItem(settingsKey,JSON.stringify({url,key}));}
  function ensureSettings(url,key) {
    const u = new URL(url);
    if (u.protocol!=='https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname) || u.pathname!=='/' || u.search || u.hash) {
      throw Error('Bitte eine gueltige HTTPS-Adresse wie https://projekt-id.supabase.co verwenden.');
    }
    if (u.hostname!==new URL(DEFAULT_URL).hostname) {
      throw Error('Diese Test-App ist aus Sicherheitsgruenden ausschliesslich fuer dein Supabase-Projekt TEST vorbereitet.');
    }
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
      throw Error('Bitte nur den Schluessel sb_publishable_... verwenden. Niemals Secret- oder Service-Role-Keys verwenden.');
    }
    return {url:u.origin,key};
  }
  function clientFromSettings() {
    const saved=readSettings();
    if(!saved)return null;
    const config=ensureSettings(saved.url,saved.key);
    return window.TrummSupabase.createClient(config.url,config.key,{
      auth:{storageKey:'trummcards-cloud-test-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
      global:{headers:{'x-trummcards-client':'cloud-test-0.1.0'}}
    });
  }
  function lockForms(locked) {
    document.querySelectorAll('#appArea form button[type="submit"], #loginForm button[type="submit"], #setupForm button[type="submit"]').forEach(b=>b.disabled=locked);
  }
  async function withSaving(action) {
    if(saving)return;
    saving=true;lockForms(true);hideFlash();
    try{await action();}catch(err){flash(L.apiError(err),'error');setSync('Verbindung pruefen','problem');console.error('TrummCards Cloud TEST:',err);}finally{saving=false;lockForms(false);}
  }
  async function initialize() {
    const saved=readSettings();
    if(!saved){$('setupForm').elements.namedItem('url').value=DEFAULT_URL;showStage('setup');return;}
    try {
      sb=clientFromSettings();
      setSync('Verbinde ...');
      const {data,error}=await sb.auth.getSession();
      if(error)throw error;
      if(data.session?.user){user=data.session.user;await enterApp();}
      else{user=null;showStage('login');}
    }catch(err){showStage('setup');$('setupForm').elements.namedItem('url').value=saved.url||DEFAULT_URL;flash(L.apiError(err),'error');}
  }
  async function enterApp() {
    if(!sb||!user)throw Error('Keine Anmeldesitzung.');
    const {data,error}=await sb.rpc('tc_is_authorized');
    if(error)throw error;
    if(data!==true){await sb.auth.signOut();user=null;showStage('login');throw Error('Dieses Konto ist nicht fuer TrummCards freigeschaltet. Bitte in Authentication > Users das richtige Konto verwenden.');}
    $('accountLabel').textContent='Angemeldet: '+(user.email||'Testkonto')+' | Projekt: TEST';
    showStage('app'); await refreshAll(true);
  }
  async function refreshAll(silent=false) {
    if(!sb||!user||refreshing)return;
    refreshing=true;setSync('Synchronisiere ...');
    try {
      const requests=[
        sb.from('tc_products').select('id,sku,name,set_name,language,card_condition,note,created_at').order('name',{ascending:true}).limit(1000),
        sb.from('tc_inventory').select('product_id,available_qty,remaining_cost').limit(1000),
        sb.from('tc_purchase_lots').select('id,product_id,bought_on,purchased_qty,available_qty,purchase_total,extra_cost,allocated_cost,source,note,created_at').order('bought_on',{ascending:true}).limit(1000),
        sb.from('tc_sales').select('id,product_id,sold_on,qty,price,shipping_income,shipping_cost,fees,other_cost,cogs_total,platform,note,status,created_at').order('created_at',{ascending:false}).limit(1000),
        sb.from('tc_lot_images').select('id,lot_id,storage_path,mime_type,display_order').limit(1000)
      ];
      const result=await Promise.all(requests);
      for(const r of result) if(r.error)throw r.error;
      state={products:result[0].data||[],inventory:result[1].data||[],lots:result[2].data||[],sales:result[3].data||[],images:result[4].data||[]};
      lastSyncAt=Date.now();
      render();setSync('Synchronisiert '+new Date().toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),'online');
      if(!silent)flash('Lagerbestand, Einkaeufe und Verkaeufe aus Supabase aktualisiert.','success');
    }catch(err){setSync('Synchronisierung fehlgeschlagen','problem');if(!silent)flash(L.apiError(err),'error');else console.error(err);}
    finally{refreshing=false;}
  }
  function totalAvailable(productId){return Number(state.inventory.find(i=>i.product_id===productId)?.available_qty||0);}
  function selectedProduct(productId){return state.products.find(p=>p.id===productId);}
  function productName(productId){return selectedProduct(productId)?.name||'Unbekannter Artikel';}
  function render() {
    const inv=state.inventory;
    $('metricProducts').textContent=state.products.length.toLocaleString('de-AT');
    $('metricQty').textContent=inv.reduce((n,r)=>n+Number(r.available_qty),0).toLocaleString('de-AT');
    $('metricValue').textContent=L.euro(inv.reduce((n,r)=>n+Number(r.remaining_cost),0));
    $('metricProfit').textContent=L.euro(state.sales.filter(s=>s.status==='booked').reduce((n,s)=>n+L.profit({price:Number(s.price),shippingIncome:Number(s.shipping_income),shippingCost:Number(s.shipping_cost),fees:Number(s.fees),other:Number(s.other_cost),cost:Number(s.cogs_total)}),0));
    $('inventoryRows').innerHTML=state.products.map(p=>{
      const x=inv.find(i=>i.product_id===p.id)||{available_qty:0,remaining_cost:0};
      return `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku||'-')}</td><td>${escapeHtml(p.set_name||'-')}</td><td>${escapeHtml(p.card_condition||'-')}</td><td>${Number(x.available_qty)}</td><td>${L.euro(x.remaining_cost)}</td><td><button type="button" data-edit-product="${p.id}">Bearbeiten</button></td></tr>`;
    }).join('') || '<tr><td colspan="7" class="empty">Noch keine Testartikel erfasst.</td></tr>';
    selectCurrent(getForm($('purchaseForm'),'product'),state.products,p=>p.name+' | '+(p.sku||'ohne SKU'),'Artikel auswaehlen');
    selectCurrent(getForm($('saleForm'),'product'),state.products.filter(p=>totalAvailable(p.id)>0),p=>p.name+' ('+totalAvailable(p.id)+' verfuegbar)','Artikel auswaehlen');
    selectCurrent(getForm($('imageForm'),'lot'),state.lots,l=>productName(l.product_id)+' | '+l.bought_on+' | '+l.id.slice(0,8),'Einkaufslos auswaehlen');
    $('salesRows').innerHTML=state.sales.map(s=>{
      const earned=L.profit({price:Number(s.price),shippingIncome:Number(s.shipping_income),shippingCost:Number(s.shipping_cost),fees:Number(s.fees),other:Number(s.other_cost),cost:Number(s.cogs_total)});
      return `<tr><td>${escapeHtml(s.sold_on)}</td><td>${escapeHtml(productName(s.product_id))}</td><td>${Number(s.qty)}</td><td>${L.euro(s.price)}</td><td>${L.euro(s.cogs_total)}</td><td class="${earned<0?'negative':'positive'}">${L.euro(earned)}</td><td>${s.status==='booked'?'Gebucht':'Storniert'}</td><td>${s.status==='booked'?`<button type="button" data-void-sale="${s.id}">Stornieren</button>`:'-'}</td></tr>`;
    }).join('')||'<tr><td colspan="8" class="empty">Noch keine Verkaeufe im Testprojekt.</td></tr>';
    $('lotsRows').innerHTML=state.lots.map(l=>`<tr><td>${escapeHtml(l.bought_on)}</td><td>${escapeHtml(productName(l.product_id))}</td><td>${Number(l.purchased_qty)}</td><td>${Number(l.available_qty)}</td><td>${L.euro(Number(l.purchase_total)+Number(l.extra_cost))}</td><td>${escapeHtml(l.source||'-')}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Noch keine Einkaufschargen.</td></tr>';
    renderPending(); updateSaleHint(); updatePurchaseHint();
    if(activeTab==='photos')renderImages().catch(e=>console.error('Picture display:',e));
  }
  function switchTab(name) {
    activeTab=name;
    document.querySelectorAll('.tab').forEach(s=>s.hidden=s.id!=='tab-'+name);
    document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    window.scrollTo({top:0,behavior:'smooth'});
    if(name==='photos')renderImages().catch(err=>flash(L.apiError(err),'error'));
  }
  function startProductEdit(id) {
    const p=selectedProduct(id);if(!p)return;
    const f=$('productForm');
    for(const k of ['name','sku','set_name','language','card_condition','note']) getForm(f,k).value=p[k]||'';
    getForm(f,'edit_id').value=p.id;
    $('productFormTitle').textContent='Artikel bearbeiten (keinen neuen anlegen)';
    $('productSubmit').textContent='Aenderungen speichern';$('productCancel').hidden=false;
    switchTab('inventory');f.elements.namedItem('name').focus();
  }
  function resetProductEdit() {
    const f=$('productForm');f.reset();getForm(f,'edit_id').value='';
    $('productFormTitle').textContent='Artikel anlegen';$('productSubmit').textContent='Artikel speichern';$('productCancel').hidden=true;
  }
  async function saveProduct(e) {
    e.preventDefault();await withSaving(async()=>{
      const f=e.currentTarget,editId=getValue(f,'edit_id');
      const fields={name:getValue(f,'name'),sku:getValue(f,'sku')||null,set_name:getValue(f,'set_name'),language:getValue(f,'language'),card_condition:getValue(f,'card_condition'),note:getValue(f,'note')};
      if(!fields.name)throw Error('Bitte Artikelname eingeben.');
      if(fields.sku&&state.products.some(p=>p.id!==editId&&String(p.sku||'').trim().toLowerCase()===fields.sku.trim().toLowerCase()))throw Error('Artikelnummer bereits verwendet, bitte andere waehlen.');
      const request=editId?sb.from('tc_products').update(fields).eq('id',editId):sb.from('tc_products').insert({...fields,owner_id:user.id});
      const {error}=await request.select('id').single();if(error)throw error;
      resetProductEdit();await refreshAll(true);flash(editId?'Bestehender Artikel geaendert.':'Neuer Cloud-Testartikel gespeichert.','success');
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
    e.preventDefault();await withSaving(async()=>{
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
    e.preventDefault();await withSaving(async()=>{
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
    const s=state.sales.find(x=>x.id===id&&x.status==='booked');if(!s)return;
    if(!confirm('Testverkauf von '+s.qty+' Stueck '+productName(s.product_id)+' stornieren? Der Bestand wird wiederhergestellt.'))return;
    await withSaving(async()=>{
      const {error}=await sb.rpc('tc_void_sale',{p_sale_id:id});if(error)throw error;
      await refreshAll(true);flash('Testverkauf storniert und Lagerbestand korrigiert.','success');
    });
  }
  async function saveImage(e) {
    e.preventDefault();await withSaving(async()=>{
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
  async function renderImages() {
    const panel=$('imageCards');panel.replaceChildren();
    if(!state.images.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Artikelbilder im Testprojekt.';panel.append(p);return;}
    for(const img of state.images.slice(0,40)) {
      const lot=state.lots.find(l=>l.id===img.lot_id);
      const card=document.createElement('div');card.className='image-card';
      const picture=document.createElement('img');picture.alt=productName(lot?.product_id)+' Bild';picture.loading='lazy';
      const {data,error}=await sb.storage.from('trummcards-lot-images').createSignedUrl(img.storage_path,300);
      if(!error&&data?.signedUrl)picture.src=data.signedUrl;
      const caption=document.createElement('p');caption.textContent=productName(lot?.product_id);
      const small=document.createElement('small');small.textContent=lot?'Los vom '+lot.bought_on:'';
      card.append(picture,caption,small);panel.append(card);
    }
  }
  function bind() {
    $('setupForm').addEventListener('submit',e=>{e.preventDefault();withSaving(async()=>{
      const f=e.currentTarget;
      const data=ensureSettings(getValue(f,'url'),getValue(f,'key'));
      saveSettings(data.url,data.key);sb=null;user=null;await initialize();
    });});
    $('loginForm').addEventListener('submit',e=>{e.preventDefault();withSaving(async()=>{
      const f=e.currentTarget,email=getValue(f,'email'),password=getForm(f,'password').value;
      if(!sb)throw Error('Bitte zuerst Cloud-Verbindung einrichten.');
      const {data,error}=await sb.auth.signInWithPassword({email,password});getForm(f,'password').value='';
      if(error)throw error;
      user=data.user;await enterApp();flash('Cloud-Anmeldung erfolgreich. TEST-Lager wurde geladen.','success');
    });});
    $('changeSettings').addEventListener('click',async()=>{
      if(sb){try{await sb.auth.signOut();}catch{}}
      sb=null;user=null;localStorage.removeItem(settingsKey);showStage('setup');$('setupForm').elements.namedItem('url').value=DEFAULT_URL;
    });
    $('logoutBtn').addEventListener('click',()=>withSaving(async()=>{
      if(sb) {const {error}=await sb.auth.signOut();if(error)throw error;}
      user=null;state={products:[],inventory:[],lots:[],sales:[],images:[]};showStage('login');flash('Erfolgreich abgemeldet.','success');
    }));
    $('refreshBtn').addEventListener('click',()=>refreshAll());
    $('tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)switchTab(b.dataset.tab);});
    $('productForm').addEventListener('submit',saveProduct);
    $('productCancel').addEventListener('click',resetProductEdit);
    $('inventoryRows').addEventListener('click',e=>{const b=e.target.closest('[data-edit-product]');if(b)startProductEdit(b.dataset.editProduct);});
    $('purchaseForm').addEventListener('submit',savePurchase);
    for(const name of ['unit','total','qty'])getForm($('purchaseForm'),name).addEventListener('input',()=>purchasePriceChanged(name));
    getForm($('purchaseForm'),'extra').addEventListener('input',updatePurchaseHint);
    $('saleForm').addEventListener('submit',saveSale);
    $('saleForm').addEventListener('input',updateSaleHint);
    $('saleForm').addEventListener('change',updateSaleHint);
    $('salesRows').addEventListener('click',e=>{const b=e.target.closest('[data-void-sale]');if(b)voidSale(b.dataset.voidSale);});
    $('imageForm').addEventListener('submit',saveImage);
    window.addEventListener('focus',()=>{if(user&&Date.now()-lastSyncAt>5000)refreshAll(true);});
    setInterval(()=>{if(user&&!document.hidden)refreshAll(true);},12000);
  }
  async function boot() {
    if(!window.TrummSupabase?.createClient) {flash('Supabase-Bibliothek fehlt. Bitte die Test-App neu erstellen.','error');return;}
    getForm($('purchaseForm'),'date').value=localDate();
    getForm($('saleForm'),'date').value=localDate();
    bind();await initialize();
  }
  boot().catch(e=>{console.error(e);flash(L.apiError(e),'error');});
})();
