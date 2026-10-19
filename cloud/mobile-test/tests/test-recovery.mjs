import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const base=new URL('../web/',import.meta.url);
const html=readFileSync(new URL('reset-password.html',base),'utf8');
const js=readFileSync(new URL('reset-password.js',base),'utf8');
const app=readFileSync(new URL('app.js',base),'utf8');
const home=readFileSync(new URL('index.html',base),'utf8');
test('Recovery page contains email and two password inputs',()=>{
 for(const id of ['requestForm','updateForm','newPassword','confirmPassword','successPanel'])
   assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 assert.ok(html.includes('type="password"'));
});
test('Email recovery uses configured GitHub Pages target',()=>{
 assert.ok(js.includes('/auth/v1/recover?redirect_to='));
 assert.ok(js.includes('trummcardsgit.github.io/trummcards-updates/reset-password.html'));
 assert.ok(js.includes("type:'recovery'"));
});
test('Recovery token stays in memory and URL is scrubbed',()=>{
 for(const s of ['history.replaceState','let accessToken=null','/auth/v1/verify','/auth/v1/user','password:pw'])
   assert.ok(js.includes(s),'Missing '+s);
 assert.ok(!js.includes('localStorage.setItem'));
 assert.ok(!js.includes('console.log'));
});
test('Home handles recovery fragments and offers forgot password',()=>{
 assert.ok(home.includes('href="./reset-password.html"'));
 assert.ok(app.includes("fragment.get('type')==='recovery'"));
 assert.ok(app.includes("location.replace('./reset-password.html'"));
});
test('Recovery JS syntax valid, without private API keys',()=>{
 const p=new URL('reset-password.js',base);
 const r=spawnSync(process.execPath,['--check',p.pathname],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 assert.ok(!js.includes('sb_secret_')&&!js.includes('service_role'));
});
