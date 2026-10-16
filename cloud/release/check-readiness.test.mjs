import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateReadiness,verifyMigrationFiles,REQUIRED_CHECKS,TEST_PROJECT_REF,MIGRATION_PATHS}
  from './check-readiness.mjs';

const base=()=>({
  environment:'production',
  projectRef:'abcdefghijklmnopqrst',
  projectUrl:'https://abcdefghijklmnopqrst.supabase.co',
  pwaUrl:'https://cards.example.org/',
  testProjectRef:TEST_PROJECT_REF,
  legacyDataImport:false,
  checks:Object.fromEntries(REQUIRED_CHECKS.map(key=>[key,true]))
});
const errorFor=(manifest)=>evaluateReadiness(manifest).issues.join(' | ');

test('fully attested synthetic production descriptor passes pure preflight (not real go-live)',()=>{
  const result=evaluateReadiness(base());
  assert.equal(result.go,true,errorFor(base()));
  assert.equal(result.completed,result.required);
});
test('reject TEST project as production target',()=>{
  const c=base();
  c.projectRef=TEST_PROJECT_REF;c.projectUrl=`https://${TEST_PROJECT_REF}.supabase.co`;
  assert.equal(evaluateReadiness(c).go,false);
  assert.match(errorFor(c),/TEST project/i);
});
test('reject an arbitrary project URL that differs from production project ref',()=>{
  const c=base();c.projectUrl='https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
  assert.match(errorFor(c),/match the NEW production/i);
});
test('reject TEST GitHub Pages origin, even under a separate path',()=>{
  const c=base();c.pwaUrl='https://trummcardsgit.github.io/trummcards-updates/cloud/';
  assert.match(errorFor(c),/dedicated HTTPS origin/i);
});
test('reject existing TEST edge-function domain as product web host',()=>{
  const c=base();c.pwaUrl=`https://${TEST_PROJECT_REF}.supabase.co/functions/v1/`;
  assert.match(errorFor(c),/dedicated HTTPS origin/i);
});
test('reject insecure, query-string or credential-bearing web URLs',()=>{
  for(const candidate of ['http://cards.example.org/','https://cards.example.org/?x=y','https://u:p@cards.example.org/']){
    const c=base();c.pwaUrl=candidate;
    assert.equal(evaluateReadiness(c).go,false,candidate);
  }
});
test('reject import of legacy or test data',()=>{
  const c=base();c.legacyDataImport=true;
  assert.match(errorFor(c),/No legacy\/test migration/);
});
test('reject missing release checks even when all other data are valid',()=>{
  const c=base();c.checks.authEmailRecoveryWorks=false;
  assert.match(errorFor(c),/authEmailRecoveryWorks/);
  assert.equal(evaluateReadiness(c).completed,REQUIRED_CHECKS.length-1);
});
test('reject missing explicit go-live approval and restore test',()=>{
  const c=base();delete c.checks.explicitGoLiveApproval;delete c.checks.databaseAndImageBackupsRestored;
  assert.match(errorFor(c),/explicitGoLiveApproval/);
  assert.match(errorFor(c),/databaseAndImageBackupsRestored/);
});
test('reject accidentally committed credentials',()=>{
  for(const key of ['password','serviceRoleKey','sb_secret_token','apiKey','publishableKey']){
    const c=base();c[key]='NOT_A_REAL_KEY';
    assert.match(errorFor(c),/credentials/);
  }
});
test('required schema migration files are present in the repository',()=>{
  assert.equal(MIGRATION_PATHS.length,3);
  const root=fileURLToPath(new URL('../../',import.meta.url));
  assert.deepEqual(verifyMigrationFiles(root),[]);
});
test('checked-in example always ends NO-GO without connecting to Supabase',()=>{
  const file=fileURLToPath(new URL('./production.example.json',import.meta.url));
  const example=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(evaluateReadiness(example).go,false);
  const cli=fileURLToPath(new URL('./check-readiness.mjs',import.meta.url));
  const command=spawnSync(process.execPath,[cli,file],{encoding:'utf8'});
  assert.equal(command.status,1,command.stderr);
  assert.match(command.stdout,/NO-GO/);
  assert.doesNotMatch(command.stdout,/sb_secret_|password\s*:/);
});
