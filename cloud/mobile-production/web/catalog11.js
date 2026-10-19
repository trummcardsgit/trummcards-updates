(()=>{'use strict';
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
// Supports combined name + set (name or ID) + printed card number.
// On TCGdex the printed number is the localId (without '/set size').
function normalizePrintedNumber(input){
 const value=String(input||'').trim().replace(/^#\s*/,'').split('/')[0].trim();
 if(value.length>30||!(/^[a-zA-Z0-9-]*$/.test(value)))throw Error('Ungültige Kartennummer.');
 return /^0+[0-9]+$/.test(value)?String(Number(value)):value;
}
async function searchPokemonCards({query='',set='',cardNumber='',language='de',page=1,limit=20,fetchImpl=fetch,signal}={}){
 const q=String(query||'').trim(),setFilter=String(set||'').trim(),number=normalizePrintedNumber(cardNumber);
 if(q.length>100||setFilter.length>100)throw Error('Suchtext zu lang (maximal 100 Zeichen).');
 if(q&&q.length<2)throw Error('Bitte mindestens zwei Zeichen für den Kartennamen eingeben.');
 if(setFilter&&setFilter.length<2)throw Error('Bitte mindestens zwei Zeichen für das Set eingeben.');
 if(!q&&!setFilter&&!number)throw Error('Bitte Kartenname, Set oder Kartennummer eingeben.');
 const selectedPage=Number(page);
 if(!Number.isSafeInteger(selectedPage)||selectedPage<1||selectedPage>100)throw Error('Ungültige Kartensuchseite.');
 const lang=languageCode(language),n=Math.min(30,numberOr(limit,20));
 const params=new URLSearchParams({'pagination:page':String(selectedPage),'pagination:itemsPerPage':String(n)});
 if(q)params.set('name',q);
 if(setFilter)params.set('set',setFilter);
 if(number)params.set('localId','eq:'+number);
 let rows=await fetchJson(BASE+'/'+lang+'/cards?'+params.toString(),fetchImpl,signal);
 // Card prints may use '009' while catalog localId uses '9', or vice versa.
 // Retry the exact printed number only for the first empty results page.
 const rawNumber=String(cardNumber||'').trim().replace(/^#\s*/,'').split('/')[0].trim();
 if(number&&rawNumber&&rawNumber!==number&&Array.isArray(rows)&&rows.length===0&&selectedPage===1){
  params.set('localId','eq:'+rawNumber);
  rows=await fetchJson(BASE+'/'+lang+'/cards?'+params.toString(),fetchImpl,signal);
 }
 if(!Array.isArray(rows))throw Error('Katalogantwort hat ein unerwartetes Format.');
 return rows.filter(x=>x&&x.id&&x.name).slice(0,n).map(cardBrief);
}
// Browse public TCGdex sets in the chosen language without sharing inventory.
const safeSetId=id=>{
 const value=String(id||'');
 if(!/^[A-Za-z0-9._-]{1,90}$/.test(value))throw Error('Ungültige Pokémon-Set-ID.');
 return value;
};
const countOf=x=>Number.isSafeInteger(x)&&x>=0?x:null;
async function listPokemonSets({query='',language='de',page=1,limit=40,fetchImpl=fetch,signal}={}){
 const lang=languageCode(language),search=String(query??'').trim();
 if(search.length>100)throw Error('Set-Suchtext zu lang (maximal 100 Zeichen).');
 const numberPage=Number(page);
 if(!Number.isSafeInteger(numberPage)||numberPage<1||numberPage>100)throw Error('Ungültige Katalogseite.');
 const count=Math.max(1,Math.min(60,numberOr(limit,40)));
 const params=new URLSearchParams({'pagination:page':String(numberPage),'pagination:itemsPerPage':String(count)});
 if(search)params.set('name',search);
 else {params.set('sort:field','releaseDate');params.set('sort:order','DESC');}
 const data=await fetchJson(BASE+'/'+lang+'/sets?'+params.toString(),fetchImpl,signal);
 if(!Array.isArray(data))throw Error('Set-Katalogantwort hat ein unerwartetes Format.');
 return data.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&/^[A-Za-z0-9._-]{1,90}$/.test(x.id))
  .slice(0,count).map(x=>({id:x.id,name:x.name,releaseDate:String(x.releaseDate||''),
   count:countOf(x.cardCount?.total),officialCount:countOf(x.cardCount?.official)}));
}
async function getPokemonSet({id,language='de',fetchImpl=fetch,signal}={}){
 const lang=languageCode(language),value=safeSetId(id);
 const data=await fetchJson(BASE+'/'+lang+'/sets/'+encodeURIComponent(value),fetchImpl,signal);
 if(!data||data.id!==value||typeof data.name!=='string'||!Array.isArray(data.cards))
  throw Error('Set-Antwort ist unvollständig. Bitte erneut versuchen.');
 if(data.cards.length>3000)throw Error('Dieses Set enthält mehr Karten als die unterstützte Anzeige.');
 return {id:data.id,name:data.name,releaseDate:String(data.releaseDate||''),
  count:countOf(data.cardCount?.total)??data.cards.length,
  officialCount:countOf(data.cardCount?.official),
  cards:data.cards.filter(x=>x&&typeof x.id==='string'&&x.name&&/^[A-Za-z0-9._-]{2,100}$/.test(x.id))
   .map(cardBrief)};
}
// TCGdex's documented card pricing provides Cardmarket EUR trend estimates.
// Variant matching is not reliable for Reverse, First Edition, SIR or graded cards.
// Avoid a misleading automated valuation for those combinations.
function euroMarketQuote(pricing,{variant='',gradingCompany='',condition=''}={}){
 if(String(gradingCompany||'').trim())return null;
 if(String(condition||'').trim()&&!['near mint','nm'].includes(String(condition).toLowerCase().trim()))return null;
 const normalized=String(variant||'').toLowerCase().trim();
 if(normalized&&!['standard','holo'].includes(normalized))return null;
 const cm=pricing?.cardmarket;
 if(!cm||cm.unit!=='EUR')return null;
 const holo=normalized==='holo';
 const value=cm[holo?'trend-holo':'trend'];
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>9999999999.99)return null;
 const date=new Date(cm.updated);
 if(!Number.isFinite(date.getTime())||date.getTime()>Date.now()+24*3600000)return null;
 return {value:Math.round((value+Number.EPSILON)*100)/100,currency:'EUR',
  source:holo?'TCGdex / Cardmarket Trend Holo':'TCGdex / Cardmarket Trend',
  updatedAt:date.toISOString(),estimated:true,variant:holo?'Holo':'Standard'};
}
async function getPokemonCard({id,language='de',fetchImpl=fetch,signal}={}){
 const lang=languageCode(language);
 const detail=await fetchJson(BASE+'/'+lang+'/cards/'+encodeURIComponent(cardId(id)),fetchImpl,signal);
 if(!detail?.id||!detail?.name)throw Error('Katalogantwort unvollständig.');
 return {
  ...cardBrief(detail),
  rarity:String(detail.rarity||''),
  setName:String(detail.set?.name||''),
  setId:String(detail.set?.id||''),
  setOfficial:Number.isSafeInteger(detail.set?.cardCount?.official)&&detail.set.cardCount.official>0?detail.set.cardCount.official:null,
  illustrator:String(detail.illustrator||''),
  // Raw pricing is only a candidate: matching the owner's specific variant,
  // card condition and grading happens client-side before showing a quote.
  pricing:detail.pricing||null,
  price:null,priceSource:null
 };
}
const CATALOG_SOURCE='TCGdex – tcgdex.dev';

window.TrummCatalog11=Object.freeze({searchPokemonCards,listPokemonSets,getPokemonSet,getPokemonCard,euroMarketQuote,CATALOG_SOURCE});
})();
