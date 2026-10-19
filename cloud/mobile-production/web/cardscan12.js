/* TrummCards Cloud 1.2 TEST — on-device camera OCR for KartenDex.
   Photos are never posted to TrummCards, TCGdex, Supabase or an OCR API.
   Tesseract worker, WASM and language data are downloaded on first use. */
(()=>{'use strict';
const TESSERACT_JS='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
const TESSERACT_WORKER='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js';
const MAX_IMAGE_BYTES=15*1024*1024;
const byId=id=>document.getElementById(id);
function cardNumberFromText(text){
 const rows=String(text||'').split(/\r?\n/).reverse();
 for(const row of rows){
  // TCG number e.g. 74/73, 021/082, TG12/TG30, GG04/GG70.
  const match=row.match(/(?:^|[^\p{L}\d])((?:[A-Z]{1,3})?\s*\d{1,3}[A-Z]?)\s*[\/／]\s*((?:[A-Z]{1,3})?\d{1,3})(?![\p{L}\d])/iu);
  if(match)return match[1].replace(/\s+/g,'').toUpperCase()+'/'+match[2].toUpperCase();
 }
 return '';
}
function cleanName(line){
 let name=String(line||'').normalize('NFKC').trim()
  .replace(/[«»“”‘’]/g,'').replace(/[^\p{L}\p{N}&.\- '\u2642\u2640]/gu,' ')
  .replace(/^\s*(?:POK[EÉ]MON|BASIS|STUFE\s*\d+|PHASE\s*\d+)\s*[:\-]?\s*/iu,'')
  .replace(/\b(?:\d{2,3}\s*(?:KP|HP)|(?:KP|HP)\s*\d{2,3})\b.*$/iu,'')
  .replace(/\s+/g,' ').trim();
 if(/^(?:POK[EÉ]MON|V|VMAX|VSTAR|GX|EX|KP|HP|TRAINER|ENERGIE|ITEM)$/iu.test(name))return '';
 if(!/\p{L}{3,}/u.test(name)||name.length>65||/[\/:]/.test(name))return '';
 if(/(?:entwickelt|evolution|schaden|attacke|angriff|fähigkeiten|energy|trainer|illustration|kartennummer|stage)/iu.test(name))return '';
 return name;
}
function parseOcr(topText='',bottomText='',wholeText=''){
 const lines=(String(topText||'')+'\n'+String(wholeText||'')).split(/\r?\n/);
 const candidates=lines.slice(0,14).map(cleanName).filter(Boolean);
 let name=candidates.find(s=>/[\p{L}]{3,}/u.test(s))||'';
 // Prefer the physically lower/bottom crop for the printed collector number.
 const cardNumber=cardNumberFromText(bottomText)||cardNumberFromText(wholeText)||cardNumberFromText(topText);
 return {name,cardNumber};
}
function isValidFile(file){
 return Boolean(file&&typeof file.type==='string'&&file.type.startsWith('image/')&&file.size>0&&file.size<=MAX_IMAGE_BYTES);
}
let tesseractLoading=null;
function loadTesseract(){
 if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);
 if(tesseractLoading)return tesseractLoading;
 tesseractLoading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=TESSERACT_JS;script.async=true;script.crossOrigin='anonymous';
  script.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error('OCR-Software konnte nicht initialisiert werden.'));
  script.onerror=()=>reject(Error('OCR-Software kann momentan nicht geladen werden. Internetverbindung prüfen.'));
  document.head.append(script);
 }).catch(e=>{tesseractLoading=null;throw e;});
 return tesseractLoading;
}
async function imageCrops(file){
 const url=URL.createObjectURL(file);
 let bitmap=null,img=null;
 try{
  if(typeof createImageBitmap==='function'){
   try{bitmap=await createImageBitmap(file);}catch{}
  }
  if(!bitmap){
   img=new Image();img.decoding='async';img.src=url;
   await (img.decode?img.decode():new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}));
  }
  const width=bitmap?.width||img.naturalWidth,height=bitmap?.height||img.naturalHeight;
  if(!width||!height)throw Error('Das Bild konnte nicht gelesen werden.');
  const ratio=Math.min(1,1800/Math.max(width,height)),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
  function crop(start,end){
   const canvas=document.createElement('canvas'),from=Math.floor(h*start),to=Math.max(from+1,Math.floor(h*end));
   canvas.width=w;canvas.height=to-from;
   const context=canvas.getContext('2d',{willReadFrequently:true});
   if(!context)throw Error('Bildverarbeitung ist auf diesem Gerät nicht verfügbar.');
   context.fillStyle='#fff';context.fillRect(0,0,w,canvas.height);
   context.drawImage(bitmap||img,0,0,width,height,0,-from,w,h);
   return canvas.toDataURL('image/png');
  }
  return {top:crop(0,0.34),bottom:crop(0.60,1)};
 }finally{
  bitmap?.close?.();URL.revokeObjectURL(url);
 }
}
function bind(){
 const panel=byId('dexScanPanel'),status=byId('dexScanStatus');
 const take=byId('dexTakePhoto'),pick=byId('dexPickPhoto');
 const camera=byId('dexCameraFile'),gallery=byId('dexGalleryFile');
 const name=byId('dexScanName'),number=byId('dexScanNumber');
 const search=byId('dexScanSearch'),close=byId('dexScanClose'),preview=byId('dexScanPreview');
 const dexName=byId('dexQuery'),dexSet=byId('dexSearchSet'),dexNumber=byId('dexSearchNumber');
 const form=byId('dexSearchForm');
 if([panel,status,take,pick,camera,gallery,name,number,search,close,preview,dexName,dexSet,dexNumber,form].some(x=>!x))throw Error('KartenDex-Scanner-Element fehlt.');
 let busy=false,previewUrl=null,run=0;
 const setStatus=value=>{status.textContent=value;};
 const busyUI=value=>{busy=value;take.disabled=value;pick.disabled=value;camera.disabled=value;gallery.disabled=value;search.disabled=value;};
 function releasePreview(){
  if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
  preview.hidden=true;preview.removeAttribute('src');
 }
 async function recognize(file){
  if(busy)return;
  panel.hidden=false;
  name.value='';number.value='';
  if(!isValidFile(file)){
   setStatus('Bitte ein Bild (JPG, PNG, HEIC …) mit maximal 15 MB auswählen.');
   return;
  }
  busyUI(true);const current=++run;
  releasePreview();previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.hidden=false;
  let worker=null;
  try{
   setStatus('Lade lokale Texterkennung und Sprachmodelle. Beim ersten Mal kann es etwas dauern …');
   const ocr=await loadTesseract();
   worker=await ocr.createWorker(['deu','eng'],1,{
    workerPath:TESSERACT_WORKER,
    logger:progress=>{
     if(current===run&&progress?.status==='recognizing text')
      setStatus('Lese die Karte … '+Math.round((progress.progress||0)*100)+' %');
    }
   });
   const parts=await imageCrops(file);
   setStatus('Lese Pokémon-Namen …');
   const top=await worker.recognize(parts.top);
   setStatus('Lese Kartennummer …');
   const bottom=await worker.recognize(parts.bottom);
   if(current!==run)return;
   const parsed=parseOcr(top.data?.text,bottom.data?.text);
   name.value=parsed.name;number.value=parsed.cardNumber;
   if(parsed.name||parsed.cardNumber){
    setStatus('Erkannt: '+(parsed.name||'Name unklar')
     +(parsed.cardNumber?' · '+parsed.cardNumber:' · Nummer unklar')
     +'. Bitte prüfen. Die Kartensuche startet mit den erkannten Angaben.');
    searchNow();
   }else{
    setStatus('Name und Nummer konnten nicht zuverlässig gelesen werden. Bitte unten korrigieren oder ein schärferes Foto aufnehmen.');
   }
  }catch(err){
   if(current===run)setStatus('Texterkennung fehlgeschlagen: '+String(err.message||err)+'. Du kannst die Angaben manuell eintragen.');
  }finally{
   try{await worker?.terminate();}catch{}
   if(current===run)busyUI(false);
  }
 }
 function searchNow(){
  const cardName=name.value.trim(),cardNumber=number.value.trim();
  if(!cardName&&!cardNumber){setStatus('Bitte zuerst einen Pokémon-Namen oder eine Kartennummer angeben.');return;}
  dexName.value=cardName;dexSet.value='';dexNumber.value=cardNumber;
  // The ordinary catalog search is responsible for showing candidates.
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 }
 take.addEventListener('click',()=>{if(!busy)camera.click();});
 pick.addEventListener('click',()=>{if(!busy)gallery.click();});
 for(const input of [camera,gallery])input.addEventListener('change',()=>{
  const file=input.files?.[0];input.value='';
  if(file)void recognize(file);
 });
 search.addEventListener('click',()=>{if(!busy)searchNow();});
 close.addEventListener('click',()=>{
  if(busy)return;
  run++;releasePreview();panel.hidden=true;
 });
 return Object.freeze({parseOcr});
}
window.TrummCardScan12=Object.freeze({bind,parseOcr,cardNumberFromText,cleanName,isValidFile});
})();