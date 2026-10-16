#!/usr/bin/env node
/**
 * TrummCards production GO / NO-GO checklist.
 *
 * OFFLINE ONLY: reads a local manifest; NEVER calls Supabase, edits files,
 * creates a project, deploys applications, or prints credentials.
 * All manually completed checks must be backed by real external evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const TEST_PROJECT_REF='cpycfxolqpidfjbhhsmr';
export const REQUIRED_CHECKS=Object.freeze([
  'newProjectCreated',
  'threeSchemaMigrationsApplied',
  'ownerCreatedAndAuthorized',
  'anonymousAndForeignUsersDenied',
  'privateImageStorageChecked',
  'databaseAndImageBackupsRestored',
  'authEmailRecoveryWorks',
  'desktopAndPwaIntegrationTested',
  'updateRollbackAndSigningReviewed',
  'zeroInventoryAndSalesConfirmed',
  'explicitGoLiveApproval'
]);
export const MIGRATION_PATHS=Object.freeze([
  'cloud/supabase/migrations/20261014000100_phase1_schema.sql',
  'cloud/supabase/migrations/20261015000200_cloud_test_session.sql',
  'cloud/supabase/migrations/20261015000300_product_images.sql'
]);

function parseHttpsUrl(value,label,issues){
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)
      issues.push(label+': require clean HTTPS URL without credentials, search or fragment.');
    return u;
  }catch{
    issues.push(label+': invalid HTTPS URL.');
    return null;
  }
}
function hasForbiddenSecrets(value){
  if(!value||typeof value!=='object')return false;
  return Object.entries(value).some(([key,v])=>
    /password|secret|token|service.?role|private.?key|api.?key|publishable.?key|smtp.?credential/i.test(key) ||
    hasForbiddenSecrets(v)
  );
}

/**
 * Pure manifest validator. This does NOT attest that RLS, data, backups,
 * migration versions or product URLs actually exist; verify them separately.
 * @returns {{go:boolean,issues:string[],completed:number,required:number}}
 */
export function evaluateReadiness(config){
  const issues=[];
  if(!config||typeof config!=='object'||Array.isArray(config))
    return {go:false,issues:['Manifest is not a JSON object.'],completed:0,required:REQUIRED_CHECKS.length};
  if(hasForbiddenSecrets(config))issues.push('Manifest must not contain passwords, tokens, publishable keys or other credentials.');
  if(config.environment!=='production')
    issues.push('environment must be production.');
  if(config.legacyDataImport!==false)
    issues.push('No legacy/test migration is authorized; legacyDataImport must be false.');
  if(config.testProjectRef!==TEST_PROJECT_REF)
    issues.push('TEST project reference must match the immutable known TEST project.');
  const ref=config.projectRef;
  const validRef=typeof ref==='string'&&/^[a-z0-9]{20}$/.test(ref);
  if(!validRef)
    issues.push('projectRef must be the new 20-character Supabase production project reference.');
  else if(ref===TEST_PROJECT_REF)
    issues.push('Production must NEVER use the TEST project reference.');
  const u=parseHttpsUrl(config.projectUrl,'projectUrl',issues);
  if(u){
    if(!validRef||u.origin!==`https://${ref}.supabase.co`||u.pathname!=='/')
      issues.push('projectUrl must exactly match the NEW production projectRef.');
    if(u.hostname===`${TEST_PROJECT_REF}.supabase.co`)
      issues.push('projectUrl targets TEST.');
  }
  const app=parseHttpsUrl(config.pwaUrl,'pwaUrl',issues);
  if(app){
    if(app.origin==='https://trummcardsgit.github.io' ||
       app.hostname===`${TEST_PROJECT_REF}.supabase.co` ||
       app.hostname.endsWith('.supabase.co'))
      issues.push('Production PWA must use a dedicated HTTPS origin, separate from TEST.');
  }
  const checks=config.checks;
  if(!checks||typeof checks!=='object'||Array.isArray(checks))
    issues.push('Missing release checks.');
  const completed=REQUIRED_CHECKS.filter(key=>checks?.[key]===true).length;
  for(const name of REQUIRED_CHECKS){
    if(checks?.[name]!==true)issues.push('Unverified release gate: '+name+'.');
  }
  return {go:issues.length===0,issues,completed,required:REQUIRED_CHECKS.length};
}

/**
 * Additional read-only repository structure check.
 */
export function verifyMigrationFiles(rootDir){
  return MIGRATION_PATHS.filter(file=>{
    try{return !fs.statSync(path.join(rootDir,file)).isFile();}
    catch{return true;}
  });
}

function main(){
 const file=process.argv[2];
 if(!file){process.stderr.write('Usage: node cloud/release/check-readiness.mjs <local-manifest.json>\n');process.exitCode=2;return;}
 let data;
 try{data=JSON.parse(fs.readFileSync(file,'utf8'));}
 catch(e){process.stderr.write('NO-GO: Cannot read a valid JSON manifest.\n');process.exitCode=2;return;}
 const result=evaluateReadiness(data);
 const repoRoot=fileURLToPath(new URL('../../',import.meta.url));
 const missing=verifyMigrationFiles(repoRoot);
 for(const file of missing)result.issues.push('Required migration file is missing: '+file);
 result.go=result.issues.length===0;
 process.stdout.write('TrummCards production: '+(result.go?'GO (manifest only)':'NO-GO')+'\n');
 process.stdout.write('Release gates attested: '+result.completed+'/'+result.required+'\n');
 for(const issue of result.issues)process.stdout.write(' - '+issue+'\n');
 if(result.go)process.stdout.write('NOTE: Physical production backup, RLS, empty DB and device tests still require independent evidence.\n');
 process.exitCode=result.go?0:1;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main();
