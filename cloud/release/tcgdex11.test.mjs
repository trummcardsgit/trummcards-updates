import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPokemonCards,getPokemonCard,CATALOG_SOURCE} from '../features/tcgdex11.mjs';
test('Search uses documented no-key TCGdex name filter and bounds pagination',async()=>{
 let u='',headers={};
 const fetchImpl=async(url,opts)=>{u=url;headers=opts.headers;return {ok:true,json:async()=>[{id:'base1-4',localId:'4',name:'Glurak',image:'https://assets.tcgdex.net/de/base/base1/4'}]};};
 const cards=await searchPokemonCards({query:' Glurak ',language:'Deutsch',limit:999,fetchImpl});
 const parsed=new URL(u);
 assert.equal(parsed.origin,'https://api.tcgdex.net');
 assert.equal(parsed.pathname,'/v2/de/cards');
 assert.equal(parsed.searchParams.get('name'),'Glurak');
 assert.equal(parsed.searchParams.get('pagination:itemsPerPage'),'30');
 assert.equal(headers.Accept,'application/json');
 assert.deepEqual(cards,[{id:'base1-4',localId:'4',name:'Glurak',imageCandidate:'https://assets.tcgdex.net/de/base/base1/4'}]);
});
test('Detailed card result provides set number and rarity without made-up price',async()=>{
 const fetchImpl=async url=>{
  assert.ok(url.endsWith('/v2/en/cards/base1-4'));
  return {ok:true,json:async()=>({id:'base1-4',name:'Charizard',localId:'4',rarity:'Rare Holo',set:{id:'base1',name:'Base Set'},image:'http://untrusted.example/image'})};
 };
 const result=await getPokemonCard({id:'base1-4',language:'Englisch',fetchImpl});
 assert.equal(result.name,'Charizard');
 assert.equal(result.setName,'Base Set');
 assert.equal(result.imageCandidate,null);
 assert.equal(result.price,null);
 assert.ok(CATALOG_SOURCE.includes('TCGdex'));
});
test('Reject malformed IDs, unknown languages and untrusted responses',async()=>{
 await assert.rejects(()=>getPokemonCard({id:'../secrets',fetchImpl:()=>{throw Error('request should not happen')}}),/Ungültige/);
 await assert.rejects(()=>searchPokemonCards({query:'Pikachu',language:'not-a-language',fetchImpl:()=>{throw Error('request should not happen')}}),/Katalogsprache/);
 await assert.rejects(()=>searchPokemonCards({query:'Pikachu',fetchImpl:async()=>({ok:true,json:async()=>({oops:true})})}),/unerwartetes Format/);
});
