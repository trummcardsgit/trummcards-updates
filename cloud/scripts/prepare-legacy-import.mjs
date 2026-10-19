#!/usr/bin/env node
/**
 * OFFLINE ONLY: validates a TrummCards v1-v2 JSON backup, and optionally creates
 * a locally saved, reviewable normalization plan. It never connects to Supabase.
 * DO NOT commit private backups, generated plans, or extracted customer images.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

function fail(message) { throw new Error(message); }
function moneyCents(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 999999999999.99) fail(`${label}: ungültiger Betrag`);
  const cents = Math.round(value * 100);
  if (Math.abs(cents / 100 - value) > 0.000001) fail(`${label}: bitte einen Betrag mit höchstens 2 Nachkommastellen verwenden`);
  return cents;
}
function positiveInt(n,label){if (!Number.isSafeInteger(n)||n<1||n>1000000) fail(`${label}: ungültige Stückzahl`);return n;}
function str(x,label,max=5000){if(x==null)return ''; if(typeof x!=='string'||x.length>max)fail(`${label}: ungültiger Text`);return x.trim();}
function date(x,label){if(typeof x!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x))fail(`${label}: Datum im Format YYYY-MM-DD erforderlich`);const d=new Date(`${x}T00:00:00.000Z`);if(Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==x)fail(`${label}: ungültiges Datum`);return x;}
function id(x,label){return str(x,label,300)||fail(`${label}: leere ID`);}
function asArray(x,label){if(!Array.isArray(x)) fail(`${label}: Array fehlt`);return x;}
const normalize = x=>str(x,'Suchschlüssel',300).toLocaleLowerCase('de');
const identity = lot=>JSON.stringify([normalize(lot.name),normalize(lot.set||''),normalize(lot.language||''),normalize(lot.condition||''),normalize(lot.sku||'')]);
function uuidFor(text){const bytes=crypto.createHash('sha256').update('TrummCards-legacy-v2:'+text).digest().subarray(0,16);bytes[6]=(bytes[6]&0x0f)|0x50;bytes[8]=(bytes[8]&0x3f)|0x80;const s=bytes.toString('hex');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
const eur = n=>(n/100).toFixed(2);

export function inspectLegacyBackup(backup,{hash='dry-run',withPlan=false}={}) {
  if(!backup||typeof backup!=='object'||Array.isArray(backup))fail('Wurzel muss ein JSON-Objekt sein');
  const lots=asArray(backup.lots,'lots'), sales=asArray(backup.sales,'sales');
  const images=backup.images===undefined?[]:asArray(backup.images,'images');
  if(lots.length>100000||sales.length>100000||images.length>100000)fail('Zu viele Datensätze für eine sichere Prüfung');
  const byLegacyLot=new Map(),byProductKey=new Map(),usedSku=new Map();
  const diagnostics=[];const quantities=new Map();const allocatedByLot=new Map();
  let purchased=0, purchaseCost=0, soldQty=0, revenue=0, reportedCogs=0;
  for(const [i,l] of lots.entries()){
    const loc=`lots[${i}]`;
    if(typeof l!=='object'||!l)fail(`${loc}: ungültige Charge`);
    const oldId=id(l.id,`${loc}.id`);if(byLegacyLot.has(oldId))fail(`Doppelte Einkaufs-ID: ${oldId}`);
    const name=str(l.name,`${loc}.name`,300);if(!name)fail(`${loc}: Name fehlt`);
    const boughtOn=date(l.date,`${loc}.date`),qty=positiveInt(l.qty,`${loc}.qty`);
    const total=moneyCents(l.total,`${loc}.total`),extra=moneyCents(l.extra??0,`${loc}.extra`);
    const normalized={oldId,newId:uuidFor('lot:'+oldId),name,
      set_name:str(l.set||'',`${loc}.set`,300),language:str(l.language||'Deutsch',`${loc}.language`,100),
      card_condition:str(l.condition||'',`${loc}.condition`,200),sku:str(l.sku||'',`${loc}.sku`,120),
      bought_on:boughtOn,purchased_qty:qty,available_qty:qty,purchase_total:eur(total),extra_cost:eur(extra),
      source:str(l.source||'',`${loc}.source`),note:str(l.note||'',`${loc}.note`),
      legacy_unit_cost:l.unitCost??null};
    if(normalized.legacy_unit_cost!=null && (!Number.isFinite(normalized.legacy_unit_cost)||normalized.legacy_unit_cost<0)) fail(`${loc}.unitCost ungültig`);
    if(normalized.legacy_unit_cost!=null && Math.abs(normalized.legacy_unit_cost*qty-(total+extra)/100)>0.03){
      diagnostics.push(`${loc}: gespeicherter Stück-Einstand weicht vom Gesamteinkauf ab (manuell prüfen)`);
    }
    const k=identity(l);normalized.product_id=uuidFor('product:'+k);
    if(!byProductKey.has(k))byProductKey.set(k,{id:normalized.product_id,sku:normalized.sku,name:normalized.name,set_name:normalized.set_name,
      language:normalized.language,card_condition:normalized.card_condition,legacy_key:k});
    if(normalized.sku){const sk=normalize(normalized.sku);if(usedSku.has(sk)&&usedSku.get(sk)!==k)fail(`Artikelnummer bereits verwendet bitte andere wählen: ${normalized.sku} (${loc})`);usedSku.set(sk,k);}
    byLegacyLot.set(oldId,normalized);quantities.set(oldId,0);purchased+=qty;purchaseCost+=total+extra;
  }
  const mappedSales=[];const saleIds=new Set();
  for(const [i,s] of sales.entries()){
    const loc=`sales[${i}]`,oldId=id(s?.id,`${loc}.id`);
    if(saleIds.has(oldId))fail(`Doppelte Verkaufs-ID: ${oldId}`);saleIds.add(oldId);
    const qty=positiveInt(s.qty,`${loc}.qty`),soldOn=date(s.date,`${loc}.date`);
    const props=['price','shippingIncome','shippingCost','fees','other'];const costs={};
    for(const p of props)costs[p]=moneyCents(s[p]??0,`${loc}.${p}`);
    const cogs=moneyCents(s.cost??0,`${loc}.cost`),allocs=asArray(s.allocations,`${loc}.allocations`);
    if(allocs.length===0)fail(`${loc}: Verkauf ohne FIFO-Zuordnungen`);
    let totalQty=0,weighted=0;const productKeys=new Set();let allocations=[];
    for(const [j,a] of allocs.entries()){
      const ll=id(a?.lotId,`${loc}.allocations[${j}].lotId`),lot=byLegacyLot.get(ll);
      if(!lot)fail(`${loc}: Unbekannte Einkaufscharge ${ll}`);
      const n=positiveInt(a.qty,`${loc}.allocations[${j}].qty`);
      quantities.set(ll,quantities.get(ll)+n);totalQty+=n;
      const unitCost=a.unitCost??lot.legacy_unit_cost??Number(lot.purchase_total)/lot.purchased_qty;
      if(typeof unitCost!=='number'||!Number.isFinite(unitCost)||unitCost<0)fail(`${loc}: ungültiger historischer Stück-Einstand`);
      weighted+=unitCost*n;productKeys.add(lot.product_id);
      allocations.push({lot_id:lot.newId,legacy_lot_id:ll,qty:n,unit_cost_snapshot:unitCost,legacy_weight:unitCost*n});
    }
    if(totalQty!==qty)fail(`${loc}: FIFO-Stückzahl ${totalQty} stimmt nicht mit Verkaufsmenge ${qty} überein`);
    if(productKeys.size!==1)fail(`${loc}: Verkauf enthält mehrere Produkte; manuelle Korrektur erforderlich`);
    if(Math.abs(weighted-cogs/100)>0.03)diagnostics.push(`${loc}: gespeicherter COGS unterscheidet sich von alter FIFO-Rechnung (manuell prüfen)`);
    // Allocate exactly the historical sale total including any rounding remainder.
    let allocated=0;
    for(let j=0;j<allocations.length;j++){
      const a=allocations[j]; const share=j===allocations.length-1 ? cogs-allocated : Math.round(cogs*(a.legacy_weight/(weighted||1)));
      if(share<0)fail(`${loc}: negative COGS-Verteilung`);
      a.cost_amount=eur(share);allocated+=share;
      allocatedByLot.set(a.legacy_lot_id,(allocatedByLot.get(a.legacy_lot_id)||0)+share);
      delete a.legacy_weight;
    }
    mappedSales.push({oldId,id:uuidFor('sale:'+oldId),product_id:[...productKeys][0],sold_on:soldOn,qty,
      price:eur(costs.price),shipping_income:eur(costs.shippingIncome),shipping_cost:eur(costs.shippingCost),
      fees:eur(costs.fees),other_cost:eur(costs.other),cogs_total:eur(cogs),platform:str(s.platform||'',`${loc}.platform`,200),
      note:str(s.note||'',`${loc}.note`),status:'booked',allocations});
    soldQty+=qty;revenue+=costs.price+costs.shippingIncome;reportedCogs+=cogs;
  }
  let remainingCost=0,availableCount=0;
  for(const [oldId,lot] of byLegacyLot){
    const used=quantities.get(oldId);if(used>lot.purchased_qty)fail(`Negativer Bestand bei Einkaufscharge ${oldId}: ${used}/${lot.purchased_qty}`);
    lot.available_qty-=used;availableCount+=lot.available_qty;
    const allocated=allocatedByLot.get(oldId)||0;
    if(allocated>Math.round((Number(lot.purchase_total)+Number(lot.extra_cost))*100))
      fail(`Zu hohe historische Einstandskosten bei Charge ${oldId}: manuelle Prüfung erforderlich`);
    lot.allocated_cost=eur(allocated);
    if(lot.available_qty===0 && allocated!==Math.round((Number(lot.purchase_total)+Number(lot.extra_cost))*100))
      diagnostics.push(`Charge ${oldId}: ausverkauft, aber alter COGS stimmt nicht exakt mit Einstand überein – Import muss abgestimmt werden`);
    remainingCost += Math.round((Number(lot.purchase_total)+Number(lot.extra_cost))*100)-allocated;
  }
  const imageIds=new Set(),mappedImages=[];
  for(const [i,im] of images.entries()){
    const lotId=id(im?.lotId,`images[${i}].lotId`);
    if(!byLegacyLot.has(lotId))fail(`images[${i}]: Unbekannte Charge ${lotId}`);
    if(imageIds.has(lotId))fail(`images[${i}]: doppeltes Bild für Charge ${lotId}`);imageIds.add(lotId);
    const payload=str(im.data,`images[${i}].data`,16*1024*1024);
    const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(payload);
    if(!m)fail(`images[${i}]: Foto muss ein gültiger JPEG/PNG/WEBP-Data-URL sein`);
    if(m[2].length*3/4>10*1024*1024)fail(`images[${i}]: Bild größer als 10 MB`);
    const imageId=uuidFor('image:'+lotId);
    const ext=m[1]==='jpeg'?'jpg':m[1];
    mappedImages.push({lot_id:byLegacyLot.get(lotId).newId,legacy_lot_id:lotId,
      image_id:imageId,extension:ext,mime_type:'image/'+m[1],bytes_approx:Math.floor(m[2].length*3/4),
      suggested_filename:`${byLegacyLot.get(lotId).newId}/${imageId}.${ext}`});
  }
  const info={
    status:diagnostics.length?'REVIEW_REQUIRED':'VALIDATED',
    source_version:backup.version??null,backup_sha256:hash,products:byProductKey.size,
    purchase_lots:lots.length,sales:sales.length,pictures:mappedImages.length,
    purchased_pieces:purchased,sold_pieces:soldQty,available_pieces:availableCount,
    purchase_cost_eur:eur(purchaseCost),recorded_sale_cogs_eur:eur(reportedCogs),
    remaining_value_eur:eur(remainingCost),revenue_including_shipping_eur:eur(revenue),
    diagnostics
  };
  if(withPlan)return {summary:info,products:[...byProductKey.values()],purchase_lots:[...byLegacyLot.values()],sales:mappedSales,
    images:mappedImages.map(({suggested_filename,...rest})=>({...rest,suggested_filename:`<OWNER_UUID>/${suggested_filename}`}))};
  return info;
}
function usage(){console.log(`TrummCards – SICHERER OFFLINE Importcheck\n\n`+
  `node cloud/scripts/prepare-legacy-import.mjs /PFAD/TrummCards_Backup.json\n`+
  `node cloud/scripts/prepare-legacy-import.mjs /PFAD/TrummCards_Backup.json --out /PRIVAT/import-plan.json\n\n`+
  `Ohne --out: nur Prüfung und Zusammenfassung, KEINE Dateien werden geändert.\n`+
  `Mit --out: lokal gespeicherter Importplan ohne Bilddateien. Kein Cloud-Upload.\n`+
  `Kein Service-Key nötig. Bitte Backup und Plan NIEMALS auf GitHub committen.`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const args=process.argv.slice(2);if(args.length<1||args.includes('--help')){usage();process.exitCode=args.includes('--help')?0:1;}
    else {
      const backupPath=path.resolve(args[0]);let out=null;
      if(args.length>1){if(args.length!==3||args[1]!=='--out')fail('Nur --out /privater/Pfad.json ist optional erlaubt');out=path.resolve(args[2]);if(out===backupPath)fail('Ausgabepfad darf nicht die Sicherung überschreiben');}
      const st=fs.statSync(backupPath);if(!st.isFile()||st.size>150*1024*1024)fail('Sicherung fehlt oder ist größer als 150 MB');
      const raw=fs.readFileSync(backupPath);const hash=crypto.createHash('sha256').update(raw).digest('hex');
      const backup=JSON.parse(raw.toString('utf8'));
      const result=inspectLegacyBackup(backup,{hash,withPlan:!!out});
      console.log(JSON.stringify(out?result.summary:result,null,2));
      if(out){
        if(fs.existsSync(out))fail('Importplan existiert bereits; wird nicht überschrieben');
        fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2),{encoding:'utf8',flag:'wx',mode:0o600});
        console.log(`Lokaler Importplan gespeichert: ${out}`);
      }
      if(result.status==='REVIEW_REQUIRED'||result.summary?.status==='REVIEW_REQUIRED'){
        console.error('WARNUNG: Inkonsistenzen vor einer späteren Übernahme prüfen.');
        process.exitCode=2;
      }
    }
  }catch(err){console.error('VALIDIERUNG FEHLGESCHLAGEN:',err.message);process.exitCode=1;}
}
