import test from 'node:test';
import assert from 'node:assert/strict';
import {listPokemonSets,getPokemonSet} from '../features/tcgdex11.mjs';

test('List Pokemon sets in German with bounded server-side pagination and optional name filter',async()=>{
 let url='',opts=null;
 const fetchImpl=async(u,o)=>{url=u;opts=o;return {ok:true,json:async()=>[
  {id:'sv03.5',name:'151',releaseDate:'2023-09-22',cardCount:{total:207,official:165}},
  {id:'bad/path',name:'Untrusted'},
  {id:'base1',name:'Basis-Set',cardCount:{total:102,official:102}}
 ]};};
 const rows=await listPokemonSets({language:'Deutsch',query:'151',page:2,limit:99,fetchImpl});
 assert.equal(new URL(url).pathname,'/v2/de/sets');
 assert.equal(new URL(url).searchParams.get('name'),'151');
 assert.equal(new URL(url).searchParams.get('pagination:page'),'2');
 assert.equal(new URL(url).searchParams.get('pagination:itemsPerPage'),'60');
 assert.equal(opts.method,'GET');
 assert.equal(opts.redirect,'error');
 assert.deepEqual(rows,[
  {id:'sv03.5',name:'151',releaseDate:'2023-09-22',count:207,officialCount:165},
  {id:'base1',name:'Basis-Set',releaseDate:'',count:102,officialCount:102}
 ]);
});
test('No search term browses recent sets; invalid page/set id never reaches network',async()=>{
 let url='';
 const fetchImpl=async(u)=>{url=u;return {ok:true,json:async()=>[]};};
 await listPokemonSets({query:'',language:'en',fetchImpl});
 const p=new URL(url).searchParams;
 assert.equal(p.get('sort:field'),'releaseDate');
 assert.equal(p.get('sort:order'),'DESC');
 assert.equal(p.get('pagination:page'),'1');
 await assert.rejects(()=>listPokemonSets({page:101,fetchImpl}),/Katalogseite/);
 await assert.rejects(()=>listPokemonSets({query:'A'.repeat(101),fetchImpl}),/Suchtext/);
 await assert.rejects(()=>getPokemonSet({id:'../admin',fetchImpl}),/Set-ID/);
 await assert.rejects(()=>getPokemonSet({id:'https://example.com',fetchImpl}),/Set-ID/);
});
test('Open selected set and reuse existing safe card picker for ALL set cards',async()=>{
 const fetchImpl=async(url,opts)=>{
  assert.ok(url.endsWith('/v2/de/sets/sv03.5'));
  assert.equal(opts.cache,'no-store');
  return {ok:true,json:async()=>({
   id:'sv03.5',name:'151',releaseDate:'2023-09-22',cardCount:{total:207,official:165},
   cards:[
    {id:'sv03.5-001',localId:'001',name:'Bisasam',image:'https://assets.tcgdex.net/de/sv/sv03.5/001'},
    {id:'sv03.5-004',localId:'004',name:'Glumanda',image:'https://assets.tcgdex.net/de/sv/sv03.5/004'},
    {id:'../unknown',localId:'bad',name:'Untrusted'}
   ]
  })};
 };
 const set=await getPokemonSet({id:'sv03.5',language:'Deutsch',fetchImpl});
 assert.equal(set.id,'sv03.5');assert.equal(set.count,207);
 assert.equal(set.cards.length,2);
 assert.deepEqual(set.cards[0],{id:'sv03.5-001',localId:'001',name:'Bisasam',imageCandidate:'https://assets.tcgdex.net/de/sv/sv03.5/001'});
});
test('Fail cleanly on missing cards or mismatched set id',async()=>{
 const load=obj=>async()=>({ok:true,json:async()=>obj});
 await assert.rejects(()=>getPokemonSet({id:'base1',fetchImpl:load({id:'base1',name:'Basis',cards:null})}),/Set-Antwort/);
 await assert.rejects(()=>getPokemonSet({id:'base1',fetchImpl:load({id:'base2',name:'Fossil',cards:[]})}),/Set-Antwort/);
 await assert.rejects(()=>listPokemonSets({fetchImpl:load({cards:[]})}),/Set-Katalogantwort/);
 await assert.rejects(()=>getPokemonSet({id:'base1',fetchImpl:async()=>({ok:false,status:503})}),/503/);
});
