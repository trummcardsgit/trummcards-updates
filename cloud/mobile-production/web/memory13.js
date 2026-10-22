/* TrummCards Cloud 1.3 TEST – Pokemon trading-card memory game.
 * Entertainment only: no inventory, personal-list, finance or Supabase write access.
 * Image candidates are retrieved from the existing read-only TCGdex catalog.
 */
(()=>{'use strict';
const POOL=[
 ['base1-1','Alakazam'],['base1-2','Blastoise'],['base1-3','Chansey'],
 ['base1-4','Charizard'],['base1-5','Clefairy'],['base1-6','Gyarados'],
 ['base1-7','Hitmonchan'],['base1-8','Machamp'],['base1-9','Magneton'],
 ['base1-10','Mewtwo'],['base1-11','Nidoking'],['base1-12','Ninetales'],
 ['base1-13','Poliwrath'],['base1-14','Raichu'],['base1-15','Venusaur'],
 ['base1-16','Zapdos']
].map(([id,name])=>({id,name}));
const LEVELS=Object.freeze({leicht:6,mittel:8,schwer:12});
function shuffle(items,random=Math.random){
 const out=[...items];
 for(let i=out.length-1;i>0;i--){
  const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));
  [out[i],out[j]]=[out[j],out[i]];
 }
 return out;
}
function createState(level='leicht',random=Math.random){
 const count=LEVELS[level];
 if(!count)throw Error('Ungültige Schwierigkeitsstufe.');
 const selected=shuffle(POOL,random).slice(0,count);
 const cards=shuffle(selected.flatMap(x=>[0,1].map(copy=>({
  uid:x.id+'-'+copy,key:x.id,name:x.name,shown:false,matched:false
 }))),random);
 return {level,count,cards,opened:[],moves:0,matched:0,locked:false,completed:false};
}
function choose(state,index){
 if(!state||state.locked||state.completed)return 'ignored';
 const card=state.cards[index];
 if(!card||card.shown||card.matched)return 'ignored';
 card.shown=true;state.opened.push(index);
 if(state.opened.length===1)return 'first';
 state.moves++;
 const [a,b]=state.opened.map(i=>state.cards[i]);
 if(a.key===b.key){
  a.matched=true;b.matched=true;
  state.matched++;state.opened=[];
  state.completed=state.matched===state.count;
  return state.completed?'won':'matched';
 }
 state.locked=true;return 'mismatch';
}
function hideMismatch(state){
 if(!state?.locked)return false;
 for(const i of state.opened)state.cards[i].shown=false;
 state.opened=[];state.locked=false;return true;
}
const $=id=>document.getElementById(id);
function bind({getUserId=()=>''}={}){
 const root=$('page-game'),board=$('memoryBoard'),status=$('memoryStatus'),
  level=$('memoryDifficulty'),newBtn=$('memoryNew'),time=$('memoryTime'),
  best=$('memoryBest'),moves=$('memoryMoves'),pairs=$('memoryPairs');
 if(!root||!board||!newBtn)throw Error('Memory-Oberfläche ist nicht vollständig.');
 let state=null,active=false,round=0,started=false,runningFrom=null,elapsed=0,ticker=null,turnBack=null;
 const cardInfo=new Map();
 const safeRoot=root=>typeof root==='string'&&/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(root)?root:'';
 const formatTime=ms=>{const n=Math.floor(Math.max(0,ms)/1000);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
 const elapsedMs=()=>elapsed+(runningFrom===null?0:Date.now()-runningFrom);
 const bestKey=()=>String(getUserId()||'guest').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
 function readBest(){
  try{
   const data=JSON.parse(localStorage.getItem('trummcards-memory13-'+bestKey()+'-'+state.level)||'null');
   return Number.isInteger(data?.ms)&&data.ms>=0&&data.ms<86400000&&Number.isInteger(data?.moves)?data:null;
  }catch{return null;}
 }
 function writeBest(){
  const value={ms:elapsedMs(),moves:state.moves};
  const previous=readBest();
  if(previous&&(previous.ms<value.ms||(previous.ms===value.ms&&previous.moves<=value.moves)))return false;
  try{localStorage.setItem('trummcards-memory13-'+bestKey()+'-'+state.level,JSON.stringify(value));}catch{}
  return true;
 }
 function pause(){
  if(runningFrom!==null){elapsed+=Date.now()-runningFrom;runningFrom=null;}
  if(ticker!==null){clearInterval(ticker);ticker=null;}
  time.textContent=formatTime(elapsedMs());
 }
 function resume(){
  if(!started||state?.completed||!active||document.hidden||runningFrom!==null)return;
  runningFrom=Date.now();
  ticker=setInterval(()=>{time.textContent=formatTime(elapsedMs());},250);
 }
 function stats(){
  moves.textContent=String(state.moves);
  pairs.textContent=state.matched+' / '+state.count;
  time.textContent=formatTime(elapsedMs());
  const record=readBest();
  best.textContent=record?formatTime(record.ms)+' · '+record.moves+' Züge':'Noch keine Bestzeit';
 }
 function paintCard(index){
  const item=state.cards[index],button=board.children[index];
  if(!button)return;
  button.classList.toggle('is-open',item.shown);
  button.classList.toggle('is-matched',item.matched);
  button.setAttribute('aria-label',item.matched?'Gefunden: '+item.name:item.shown?item.name:'Verdeckte Karte '+(index+1));
  button.setAttribute('aria-pressed',item.shown?'true':'false');
  button.disabled=item.matched;
 }
 function fillImage(img,id){
  const info=cardInfo.get(id);if(!info||!safeRoot(info.imageCandidate))return;
  img.onload=()=>{img.hidden=false;};
  img.onerror=()=>{img.hidden=true;img.removeAttribute('src');};
  img.src=info.imageCandidate+'/low.webp';
 }
 function render(){
  board.replaceChildren();board.dataset.level=state.level;
  state.cards.forEach((item,index)=>{
   const button=document.createElement('button');button.type='button';button.className='tc-memory-card';
   const inner=document.createElement('span');inner.className='tc-memory-inner';
   const back=document.createElement('span');back.className='tc-memory-back';
   const gem=document.createElement('span');gem.className='tc-memory-gem';gem.textContent='✦';
   const logo=document.createElement('small');logo.textContent='TRUMMCARDS';
   back.append(gem,logo);
   const front=document.createElement('span');front.className='tc-memory-front';
   const img=document.createElement('img');img.alt='';img.hidden=true;img.loading='lazy';
   img.dataset.memoryId=item.key;fillImage(img,item.key);
   const placeholder=document.createElement('span');placeholder.className='tc-memory-placeholder';placeholder.textContent='✧';
   const name=document.createElement('span');name.className='tc-memory-name';name.textContent=item.name;
   front.append(img,placeholder,name);inner.append(back,front);button.append(inner);
   button.addEventListener('click',()=>play(index));board.append(button);
   paintCard(index);
  });
  stats();
 }
 async function loadImages(myRound){
  if(!window.TrummCatalog11?.getPokemonCard)return;
  const keys=[...new Set(state.cards.map(x=>x.key))].filter(k=>!cardInfo.has(k));
  let cursor=0;
  async function worker(){
   for(;;){
    const key=keys[cursor++];if(!key)return;
    try{
     const result=await window.TrummCatalog11.getPokemonCard({id:key,language:'en'});
     const root=safeRoot(result?.imageCandidate);
     cardInfo.set(key,{imageCandidate:root,name:result?.name||''});
     if(myRound!==round)return;
     for(const img of board.querySelectorAll('img[data-memory-id]'))
      if(img.dataset.memoryId===key)fillImage(img,key);
    }catch{cardInfo.set(key,{imageCandidate:null});}
   }
  }
  await Promise.all(Array.from({length:Math.min(3,keys.length)},()=>worker()));
 }
 function newGame(){
  round++;if(turnBack!==null){clearTimeout(turnBack);turnBack=null;}
  pause();started=false;elapsed=0;
  state=createState(level.value);
  status.textContent='Finde die gleichen Pokémon-Karten. Die Zeit startet mit deiner ersten Karte.';
  render();void loadImages(round);
 }
 function play(index){
  if(state?.completed)return;
  const result=choose(state,index);
  if(result==='ignored')return;
  if(!started){started=true;resume();}
  paintCard(index);
  if(result==='matched'||result==='won'){
   for(const item of state.cards)if(item.matched){
    const i=state.cards.indexOf(item);paintCard(i);
   }
   if(result==='won'){
    pause();
    const record=writeBest();stats();
    status.textContent='Geschafft! '+state.moves+' Züge in '+formatTime(elapsedMs())+
      (record?' · Neue Bestzeit! 🎉':' · Gut gespielt!');
   }else{status.textContent='Treffer! '+state.matched+' von '+state.count+' Paaren gefunden.';stats();}
  }else if(result==='mismatch'){
   status.textContent='Noch kein Paar. Merk dir die Karten!';
   turnBack=setTimeout(()=>{
    if(!state)return;
    const affected=[...state.opened];
    hideMismatch(state);
    affected.forEach(paintCard);turnBack=null;
    status.textContent='Weiter geht’s – finde das nächste Paar.';
   },850);
   stats();
  }else{
   status.textContent='Suche die passende zweite Karte.';
  }
 }
 function onPageChange(isGame){
  active=Boolean(isGame);if(!active)pause();else resume();
 }
 newBtn.addEventListener('click',newGame);
 level.addEventListener('change',newGame);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else resume();});
 newGame();
 return Object.freeze({onPageChange,newGame});
}
window.TrummMemory13=Object.freeze({POOL,LEVELS,shuffle,createState,choose,hideMismatch,bind});
})();