// Public no-key TCGdex catalog adapter for Cloud 1.1.
// Uses documented v2 REST filters; results are suggestions, not authoritative valuations.
// Images are remote candidates only: do not persist/rehost without rights review.
const BASE='https://api.tcgdex.net/v2';
const LANGUAGES=new Set(['de','en','fr','it','es','ja']);
const LANGUAGE_NAMES={'Deutsch':'de','Englisch':'en','Japanisch':'ja','Italienisch':'it'};
const numberOr=(value,fallback)=>Number.isInteger(value)&&value>0?value:fallback;
function languageCode(language){
 const lang=LANGUAGE_NAMES[language]||String(language||'de').toLowerCase();
 if(!LANGUAGES.has(lang))throw Error('Nicht unterstützte Katalogsprache.');
 return lang;
}
function cardId(id){
 const text=String(id||'');
 if(!/^[a-zA-Z0-9._-]{2,100}$/.test(text))throw Error('Ungültige Katalogkarten-ID.');
 return text;
}
async function fetchJson(url,fetchImpl,signal){
 if(!url.startsWith(BASE+'/'))throw Error('Unzulässige Katalogadresse.');
 const response=await fetchImpl(url,{method:'GET',headers:{Accept:'application/json'},signal,redirect:'error',cache:'no-store'});
 if(!response.ok)throw Error('Katalog momentan nicht erreichbar (HTTP '+response.status+').');
 const data=await response.json();
 return data;
}
const cardBrief=x=>({
 id:String(x.id||''),localId:String(x.localId||''),name:String(x.name||''),
 imageCandidate:(typeof x.image==='string'&&x.image.startsWith('https://assets.tcgdex.net/'))?x.image:null
});
export async function searchPokemonCards({query,language='de',limit=20,fetchImpl=fetch,signal}={}){
 const q=String(query||'').trim();
 if(q.length<2||q.length>100)throw Error('Bitte 2 bis 100 Zeichen als Kartenname angeben.');
 const lang=languageCode(language),n=Math.min(30,numberOr(limit,20));
 const params=new URLSearchParams({name:q,'pagination:page':'1','pagination:itemsPerPage':String(n)});
 const rows=await fetchJson(BASE+'/'+lang+'/cards?'+params.toString(),fetchImpl,signal);
 if(!Array.isArray(rows))throw Error('Katalogantwort hat ein unerwartetes Format.');
 return rows.filter(x=>x&&x.id&&x.name).slice(0,n).map(cardBrief);
}
export async function getPokemonCard({id,language='de',fetchImpl=fetch,signal}={}){
 const lang=languageCode(language);
 const detail=await fetchJson(BASE+'/'+lang+'/cards/'+encodeURIComponent(cardId(id)),fetchImpl,signal);
 if(!detail?.id||!detail?.name)throw Error('Katalogantwort unvollständig.');
 return {
  ...cardBrief(detail),
  rarity:String(detail.rarity||''),
  setName:String(detail.set?.name||''),
  setId:String(detail.set?.id||''),
  illustrator:String(detail.illustrator||''),
  // Market prices are deliberately not invented or read from unauthorized sites.
  price:null,priceSource:null
 };
}
export const CATALOG_SOURCE='TCGdex – tcgdex.dev';
