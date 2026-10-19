import {createHash} from 'node:crypto';
export const PROD_REF='hgdexyvtgfffcasfpjyu';
export const TABLES=['tc_products','tc_purchase_lots','tc_sales','tc_sale_allocations','tc_stock_movements','tc_lot_images','tc_product_images'];
export const TABLES_V2=[...TABLES,'tc_sale_shipments','tc_platform_fee_profiles'];
export const tablesForSnapshot=snapshot=>snapshot.format==='trummcards-cloud-backup-v2'?TABLES_V2:TABLES;
export const sha256=data=>createHash('sha256').update(data).digest('hex');
const validOwner=x=>typeof x==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x);
export function validateSnapshot(snapshot){
 if(!snapshot||!['trummcards-cloud-backup-v1','trummcards-cloud-backup-v2'].includes(snapshot.format)||!validOwner(snapshot.owner_id))
   throw Error('Ungültiges Datenbank-Backupformat oder Benutzerkonto.');
 const map=snapshot.tables;
 if(!map||typeof map!=='object')throw Error('Backup-Tabellen fehlen.');
 const by={},counts={};
 for(const name of tablesForSnapshot(snapshot)){
  const rows=map[name];if(!Array.isArray(rows))throw Error('Backup-Tabelle fehlt: '+name);
  counts[name]=rows.length;
  by[name]=new Set();
  for(const r of rows){
   const key=name==='tc_sale_shipments'?r?.sale_id:r?.id;
   if(!r||r.owner_id!==snapshot.owner_id||key===undefined)throw Error('Ungültiger Eigentümer in '+name);
   if(by[name].has(String(key)))throw Error('Doppelte ID in '+name);
   by[name].add(String(key));
  }
 }
 const ref=(name,value,target)=>{if(!by[target].has(String(value)))throw Error('Verwaister Verweis: '+name);};
 for(const lot of map.tc_purchase_lots)ref('Einkauf',lot.product_id,'tc_products');
 for(const sale of map.tc_sales)ref('Verkauf',sale.product_id,'tc_products');
 if(snapshot.format==='trummcards-cloud-backup-v2'){
  for(const shipment of map.tc_sale_shipments)ref('Versand',shipment.sale_id,'tc_sales');
 }
 for(const a of map.tc_sale_allocations){
  ref('Verkaufszuordnung',a.sale_id,'tc_sales');
  ref('Verkaufszuordnung',a.lot_id,'tc_purchase_lots');
  ref('Verkaufszuordnung',a.product_id,'tc_products');
 }
 for(const m of map.tc_stock_movements){
  ref('Lagerbewegung',m.product_id,'tc_products');
  ref('Lagerbewegung',m.lot_id,'tc_purchase_lots');
  if(m.sale_id!=null)ref('Lagerbewegung',m.sale_id,'tc_sales');
 }
 const paths=new Map();
 for(const [name,link,target] of [['tc_lot_images','lot_id','tc_purchase_lots'],['tc_product_images','product_id','tc_products']]){
  for(const im of map[name]){
   ref('Artikelbild',im[link],target);
   if(typeof im.storage_path!=='string'||!im.storage_path.startsWith(snapshot.owner_id+'/'))
     throw Error('Bildpfad gehört nicht zum Benutzerkonto.');
   if(!['image/jpeg','image/png','image/webp'].includes(im.mime_type)||paths.has(im.storage_path))
     throw Error('Ungültiger/mehrfacher Bildpfad.');
   paths.set(im.storage_path,im.mime_type);
  }
 }
 return {counts,paths};
}
export function createVerifier(){
 let snapshot=null,paths=null,images=new Set(),finished=false,byteCount=0;
 return {
  accept(item){
   if(finished||!item||typeof item.type!=='string')throw Error('Unerwarteter Archiv-Eintrag.');
   if(item.type==='snapshot'){
    if(snapshot||item.project!==PROD_REF)throw Error('Mehrfacher Snapshot oder falsches Projekt.');
    snapshot=item.data;({paths}=validateSnapshot(snapshot));
   }else if(item.type==='image'){
    if(!snapshot||!paths.has(item.path)||images.has(item.path)||paths.get(item.path)!==item.mime)
     throw Error('Unbekannter oder doppelter Bilddatensatz.');
    if(typeof item.base64!=='string'||item.base64.length>20*1024*1024)throw Error('Bild ist ungültig/zu groß.');
    const buf=Buffer.from(item.base64,'base64');
    if(buf.length!==item.bytes||sha256(buf)!==item.sha256||buf.length===0)
     throw Error('Beschädigtes Bild.');
    images.add(item.path);byteCount+=buf.length;
   }else if(item.type==='end'){
    if(!snapshot||item.imageCount!==images.size||images.size!==paths.size)
     throw Error('Bilder fehlen in der Sicherung.');
    finished=true;
   }else throw Error('Unbekannter Archiv-Eintrag.');
  },
  report(){
   if(!finished||!snapshot)throw Error('Sicherung unvollständig.');
   return {project:PROD_REF,owner_id:snapshot.owner_id,created_at:snapshot.captured_at,
    tables:validateSnapshot(snapshot).counts,images:images.size,imageBytes:byteCount};
  }
 };
}
