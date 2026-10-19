import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root='cloud/mobile-production/web/';
const source=readFileSync(root+'cardscan12.js','utf8');
const html=readFileSync(root+'index.html','utf8');
const app=readFileSync(root+'app.js','utf8');
function moduleAt(context={}){
 const env={window:{},...context};
 runInNewContext(source,env,{filename:'cardscan12.js'});
 return {api:env.window.TrummCardScan12,env};
}
test('OCR card scanner extracts German name and exact printed card number',()=>{
 const {api}=moduleAt();
 const data=api.parseOcr('Glurak VMAX 330 KP\nFlammenkrone', '12 SWSH\n74/73\nILLUSTRATION');
 assert.equal(data.name,'Glurak VMAX');
 assert.equal(data.cardNumber,'74/73');
 assert.equal(api.parseOcr('Dunkles Glurak','21/82').name,'Dunkles Glurak');
 assert.equal(api.parseOcr('GLURAK GX 250 HP','021 / 082').cardNumber,'021/082');
 assert.equal(api.parseOcr('Pikachu V','TG12/TG30').cardNumber,'TG12/TG30');
});
test('OCR scanner does not fabricate readings or accept unsafe uploads',()=>{
 const {api}=moduleAt();
 const unknown=api.parseOcr('Pokémon\nVMAX\nTrainer','WotC symbols\nno number');
 assert.equal(unknown.name,'');
 assert.equal(unknown.cardNumber,'');
 assert.equal(api.isValidFile({type:'image/jpeg',size:100000}),true);
 assert.equal(api.isValidFile({type:'image/heic',size:100000}),true);
 assert.equal(api.isValidFile({type:'application/pdf',size:12345}),false);
 assert.equal(api.isValidFile({type:'image/jpeg',size:16*1024*1024}),false);
 assert.equal(api.isValidFile({type:'image/png',size:0}),false);
});
test('KartenDex PWA camera capture and alternate photo flow exist, without photo-upload endpoint',()=>{
 for(const id of ['dexTakePhoto','dexPickPhoto','dexCameraFile','dexGalleryFile','dexScanPanel','dexScanPreview','dexScanStatus','dexScanName','dexScanNumber','dexScanSearch','dexScanClose'])
  assert.ok(html.includes('id="'+id+'"'),'Missing scanner input '+id);
 assert.match(html,/id="dexCameraFile"[^>]+accept="image\/\*"[^>]+capture="environment"/);
 assert.match(html,/id="dexGalleryFile"[^>]+accept="image\/\*"/);
 assert.ok(html.includes('cardscan12.js?v=0.9.0'));
 assert.match(app,/window\.TrummCardScan12\?\.bind\(\)/);
 assert.match(source,/Tesseract\.js@7\.0\.0|tesseract\.js@7\.0\.0/);
 assert.match(source,/createWorker\(\['deu','eng'\]/);
 assert.ok(!source.includes('supabase.co'));
 assert.ok(!source.includes("fetch("));
 assert.ok(!source.includes('api.openai.com'));
});
test('camera scan corrects input fields and submits to existing KartenDex search',async()=>{
 const nodes=new Map(),recognized=[];
 function node(){
  return {value:'',hidden:false,disabled:false,textContent:'',listeners:{},files:[],
   addEventListener(name,fn){this.listeners[name]=fn;},
   removeAttribute(){},click(){this.pressed=true;},
   dispatchEvent(e){this.lastEvent=e;recognized.push(e.type);return true;}
  };
 }
 function get(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}
 const document={
  getElementById:get,
  head:{append(){throw Error('Unexpected remote script load: Tesseract mock should exist');}},
  createElement(tag){
   if(tag!=='canvas')throw Error('Unexpected element creation '+tag);
   return {width:0,height:0,getContext:()=>({fillRect(){},drawImage(){},set fillStyle(v){}}),
    toDataURL(){return 'data:image/png;base64,mock';}
   };
  }
 };
 const urls=[];
 const URLStub={createObjectURL:()=>{urls.push('blob:example');return 'blob:example';},revokeObjectURL(){}};
 let recognizeCalls=0,terminated=false;
 const Tesseract={createWorker:async (langs,oem,options)=>{
  assert.equal(langs[0],'deu');assert.equal(langs[1],'eng');
  assert.equal(oem,1);assert.ok(options.workerPath.endsWith('/worker.min.js'));
  return {recognize:async()=>({data:{text:++recognizeCalls===1?'Glurak VMAX 330 KP':'74/73'}}),
   terminate:async()=>{terminated=true;}};
 }};
 const {api}=moduleAt({
  window:{Tesseract},
  document,URL:URLStub,
  createImageBitmap:async()=>({width:1000,height:1500,close(){}}),
  Event:class{constructor(type){this.type=type;}},
  Image:class{}
 });
 api.bind();
 const camera=get('dexCameraFile');camera.files=[{type:'image/jpeg',size:10000}];
 camera.listeners.change();
 for(let i=0;i<10&&(!terminated||!recognized.length);i++)await new Promise(r=>setImmediate(r));
 assert.equal(recognizeCalls,2);
 assert.equal(terminated,true);
 assert.equal(get('dexScanName').value,'Glurak VMAX');
 assert.equal(get('dexScanNumber').value,'74/73');
 assert.equal(get('dexQuery').value,'Glurak VMAX');
 assert.equal(get('dexSearchNumber').value,'74/73');
 assert.equal(get('dexSearchSet').value,'');
 assert.deepEqual(recognized,['submit']);
 assert.equal(get('dexScanPanel').hidden,false);
 assert.equal(get('dexTakePhoto').disabled,false);
 assert.ok(urls.length>=2);
});
