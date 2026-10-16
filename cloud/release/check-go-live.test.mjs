import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const script=fileURLToPath(new URL('./check-go-live.mjs',import.meta.url));
test('Current production preview is explicitly NO-GO, even with forged approvals',()=>{
 const env={...process.env,TRUMMCARDS_BACKUP_ACTIVE:'true',TRUMMCARDS_RESTORE_VERIFIED:'true',TRUMMCARDS_PRODUCTION_APPROVED:'true'};
 const r=spawnSync(process.execPath,[script],{env,encoding:'utf8'});
 assert.equal(r.status,1);
 assert.match(r.stderr,/NO-GO/);
 assert.match(r.stderr,/1.0.0/);
 assert.match(r.stderr,/schreibgeschützt/);
});
test('Without backup, tested restore and consent, release is blocked',()=>{
 const env={...process.env,TRUMMCARDS_BACKUP_ACTIVE:'false',TRUMMCARDS_RESTORE_VERIFIED:'false',TRUMMCARDS_PRODUCTION_APPROVED:'false'};
 const r=spawnSync(process.execPath,[script],{env,encoding:'utf8'});
 assert.equal(r.status,1);
 for(const reason of ['Tägliche Sicherung','Restore-Test','Benutzerfreigabe'])assert.ok(r.stderr.includes(reason),reason);
});
