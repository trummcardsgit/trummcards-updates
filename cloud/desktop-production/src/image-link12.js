/* TrummCards 1.2.1 – validated card image linking and safe vintage recovery. */
(()=>{'use strict';
const ROOT=/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/;
const CARD_ID=/^[A-Za-z0-9._-]{2,100}$/;
const LANGS=['de','en','ja','it'];
const langCode=(v)=>{
 const n=String(v||'').toLowerCase();
 return n==='japanisch'||n==='japanese'?'ja':
        n==='deutsch'||n==='german'?'de':
        n==='englisch'||n==='english'?'en':
        n==='italienisch'||n==='italian'?'it':LANGS.includes(n)?n:'de';
};
const assetRoot=v=>typeof v==='string'&&ROOT.test(v)?v:'';
const imageUrl=(root,quality='low')=>assetRoot(root)?root+'/'+(quality==='high'?'high':'low')+'.webp':'';
const cache=new Map();
function checkImage(url,{ImageImpl=window.Image,timeout=9000}={}){
 if(!url||typeof ImageImpl!=='function')return Promise.resolve(false);
 return new Promise(resolve=>{
  const img=new ImageImpl();let settled=false;
  const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(ok);};
  const timer=setTimeout(()=>done(false),timeout);
  img.onload=()=>done(img.naturalWidth!==0);
  img.onerror=()=>done(false);
  img.src=url;
 });
}
function recoverableId(product){
 const existing=String(product?.catalog_card_id||'').trim();
 if(CARD_ID.test(existing))return existing;
 // Only infer when the complete Japanese set identity and collector number
 // unambiguously identify a card. Never guess across different sets.
 const name=String(product?.set_name||'').trim();
 const number=String(product?.card_number||'').trim();
 if(langCode(product?.language)==='ja'&&
   /^(?:ポケモンカード151|pokemon card 151|pokémon card 151)$/iu.test(name)&&
   /^(?:0*[1-9]\d{0,2})$/.test(number))return 'sv2a-'+Number(number);
 return '';
}
async function resolve({catalog,id,language='de',imageCandidate='',probe=checkImage}={}){
 if(!CARD_ID.test(String(id||''))||!catalog||typeof catalog.getPokemonCard!=='function')return null;
 const preferred=langCode(language),ordered=[preferred,...LANGS.filter(v=>v!==preferred)];
 const key=id+'|'+preferred+'|'+String(imageCandidate||'');
 if(probe===checkImage&&cache.has(key))return cache.get(key);
 const request=(async()=>{
  const examined=new Set();
  async function tryRoot(root,sourceLanguage){
   root=assetRoot(root);
   if(!root||examined.has(root))return null;
   examined.add(root);
   try{
    if(await probe(imageUrl(root,'low')))return {id,root,language:sourceLanguage};
   }catch{}
   return null;
  }
  let best=await tryRoot(imageCandidate,preferred);
  if(best)return best;
  for(const code of ordered){
   try{
    const detail=await catalog.getPokemonCard({id,language:code});
    if(detail?.id!==id)continue;
    best=await tryRoot(detail.imageCandidate,code);
    if(best)return best;
   }catch{} // catalog may have no card in this language
  }
  return null;
 })();
 if(probe!==checkImage)return request;
 if(cache.size>350)cache.clear();
 cache.set(key,request);
 try{return await request;}catch(err){cache.delete(key);throw err;}
}
window.TrummImageLink12=Object.freeze({resolve,recoverableId,imageUrl,checkImage,langCode});
})();