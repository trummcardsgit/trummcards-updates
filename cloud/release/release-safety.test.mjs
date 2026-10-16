import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const pipeline=readFileSync(fileURLToPath(new URL('../../.github/workflows/cloud-production-release.yml',import.meta.url)),'utf8').replace(/\r\n?/g,'\n');
const backup=readFileSync(fileURLToPath(new URL('../../.github/workflows/cloud-production-encrypted-backup.yml',import.meta.url)),'utf8').replace(/\r\n?/g,'\n');

test('Cloud 1.0 deploy stays behind all three approvals',()=>{
 for(const name of ['TRUMMCARDS_BACKUP_ACTIVE','TRUMMCARDS_RESTORE_VERIFIED','TRUMMCARDS_PRODUCTION_APPROVED']){
  assert.ok(pipeline.includes("vars."+name+" == 'true'"),name);
 }
 assert.ok(pipeline.includes('on:\n  workflow_dispatch:'));
 assert.ok(!pipeline.includes('  push:\n'),'no automatic production deploy');
});
test('Only first release can explicitly override the not-yet-run scheduler',()=>{
 assert.ok(pipeline.includes('allow_initial_release_before_daily_backup:'),'owner must opt-in during manual dispatch');
 assert.ok(pipeline.includes('type: boolean'));
 assert.ok(pipeline.includes('default: false'));
 assert.ok(pipeline.includes("inputs.allow_initial_release_before_daily_backup"),'override must be checked');
 assert.ok(pipeline.includes('scheduledRuns.Count -eq 0'),'a previously fired scheduler forbids the override');
 assert.ok(pipeline.includes('git ls-tree -r --name-only origin/gh-pages -- cloud-updates/latest.yml'),'an existing release forbids the override');
 assert.ok(pipeline.includes("if ($oldManifest.Count -gt 0)"),'a previous updater feed prevents repeated use');
 assert.ok(pipeline.includes('Kein unverfallenes, verschlüsseltes Backup-Artefakt gefunden'),'manual encrypted backup must be present');
});
test('Scheduled backups are still mandatory once the first schedule fired',()=>{
 assert.ok(pipeline.includes("$_.event -eq 'schedule'"),'must check schedule event');
 assert.ok(pipeline.includes("$_.conclusion -eq 'success'"),'must verify successful scheduled run');
 assert.ok(pipeline.includes('scheduledArtifactFound'),'must require scheduled encrypted artifact');
 assert.ok(pipeline.includes('size_in_bytes -gt 500'),'must reject zero-length artifacts');
 assert.ok(pipeline.includes('AddHours(-72)'),'must require a current backup');
});

test('Automatic production backup keeps its independent safety controls',()=>{
 assert.ok(backup.includes("cron: '17 2 * * *'"));
 assert.ok(backup.includes("vars.TRUMMCARDS_BACKUP_ACTIVE == 'true'"));
 assert.ok(backup.includes("retention-days: 30"));
 assert.ok(backup.includes('restore-check.mjs'),'must verify restore');
});
test('Release changes only isolated Cloud paths and not TEST root or legacy Windows',()=>{
 assert.ok(pipeline.includes('git add -- production cloud-updates'));
 assert.ok(pipeline.includes('git push origin HEAD:gh-pages'));
 assert.ok(pipeline.includes('Copy-Item'));
 assert.ok(!pipeline.includes('git add -A'));
});
