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
 assert.match(html,/id="requestForm"/);
 assert.match(html,/id="updateForm"/);
 assert.match(html,/id="newPassword"/);
 assert.match(html,/id="confirmPassword"/);
 assert.match(html,/id="successPanel"/);
 assert.match(html,/type="password"/);
});
test('Email recovery uses configured GitHub Pages target',()=>{
 assert.match(js,/auth\\/v1\\/recover\\?redirect_to/);
 assert.match(js,/github\\.io\\/trummcards-updates\\/reset-password\\.html/);
 assert.match(js,/type:'recovery'/);
});
test('Recovery token remains in memory and is scrubbed from browser URL',()=>{
 assert.match(js,/history\\.replaceState/);
 assert.match(js,/let accessToken=null/);
 assert.match(js,/auth\\/v1\\/verify/);
 assert.match(js,/auth\\/v1\\/user/);
 assert.match(js,/password:pw/);
 assert.doesNotMatch(js,/localStorage\\.setItem/);
 assert.doesNotMatch(js,/console\\.log/);
});
test('Home redirects recovery fragments and offers forgot-password link',()=>{
 assert.match(home,/href="\\.\\/reset-password\\.html"/);
 assert.match(app,/fragment\\.get\\('type'\\)===\\'recovery\\'/);
 assert.match(app,/location\\.replace\\('\\.\\/reset-password\\.html'/);
});
test('Recovery script syntax is valid and no private keys present',()=>{
 const f=new URL('reset-password.js',base);
 const r=spawnSync(process.execPath,['--check',f.pathname],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 assert.doesNotMatch(js,/service_role|sb_secret_/);
});
