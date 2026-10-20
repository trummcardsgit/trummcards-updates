import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root='cloud/mobile-production/web/';
const html=fs.readFileSync(root+'index.html','utf8');
const css=fs.readFileSync(root+'styles.css','utf8');
const app=fs.readFileSync(root+'app.js','utf8');
const preparer=fs.readFileSync('cloud/release/prepare-cloud-125-desktop-test.mjs','utf8');

test('Desktop sidebar restores Buchungen, using the existing sales page',()=>{
 assert.match(html,/<button\s+data-go="sales"\s+class="desktop-bookings-link"\s+type="button"[^>]*>[^<]*<span>[^<]*<\/span>Buchungen<\/button>/);
 assert.equal((html.match(/class="desktop-bookings-link"/g)||[]).length,1);
 assert.match(html,/<section\s+id="page-sales"\s+class="page"\s+hidden>/);
 assert.match(html,/id="salesList"/);
 assert.match(html,/id="lotsList"/);
 assert.match(html,/id="shipmentPanel"/);
});
test('Already implemented booking navigation and actions stay connected',()=>{
 assert.match(app,/function showPage\(name\)/);
 assert.match(app,/'sales'/);
 assert.match(app,/sales:'Buchungen'/);
 assert.match(app,/function renderHistory\(\)/);
 assert.match(app,/data-void/);
 assert.match(app,/data-shipping-sale/);
 assert.match(app,/const go=e\.target\.closest\('\[data-go\]'\)/);
});
test('Sidebar shows Buchungen at desktop width without creating a seventh cramped phone tab',()=>{
 assert.match(css,/\.bottom-nav button\.desktop-bookings-link\s*\{display:none!important\}/);
 assert.match(css,/@media\s*\(min-width:1080px\)/);
 assert.match(css,/#shell>\.bottom-nav button\.desktop-bookings-link\s*\{display:flex!important\}/);
 assert.match(html,/data-go="sales">Verkäufe, Einkäufe & Versand ansehen<\/button>/);
});
test('TEST remains separated and refreshes service worker cache',()=>{
 assert.match(preparer,/1\.2\.5-desktop-test\.2/);
 assert.match(preparer,/trummcards-mobile-desktop125-shell-v2-1210/);
 assert.match(preparer,/TRUMMCARDS_DESKTOP125_ENABLE/);
 assert.match(preparer,/Missing catalog fallback/);
});
