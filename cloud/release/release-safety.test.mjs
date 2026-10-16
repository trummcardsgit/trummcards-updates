import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const pipeline=readFileSync(fileURLToPath(new URL('../../.github/workflows/cloud-production-release.yml',import.meta.url)),'utf8');
const backup=readFileSync(fileURLToPath(new URL('../../.github/workflows/cloud-production-encrypted-backup.yml',import.meta.url)),'utf8');

test('Cloud 1.0 deploy stays behind all three approvals',()=>{
 for(const name of ['TRUMMCARDS_BACKUP_ACTIVE','TRUMMCARDS_RESTORE_VERIFIED','TRUMMCARDS_PRODUCTION_APPROVED']){
  assert.ok(pipeline.includes("vars."+name+" == 'true'"),name);
 }
 assert.ok(pipeline.includes('on:\n  workflow_dispatch:'));
 assert.ok(!pipeline.includes('  push:\n'),'no automatic production deploy');
});
test('A manual backup alone can NEVER authorize production deployment',()=>{
 assert.ok(pipeline.includes("$_.event -eq 'schedule'"),'must require actual scheduled event');
 assert.ok(pipeline.includes("$_.conclusion -eq 'success'"),'must require successful scheduled event');
 assert.ok(pipeline.includes('scheduledArtifactFound'),'must require retained scheduled backup artifact');
 assert.ok(pipeline.includes('size_in_bytes -gt 500'),'must reject missing or tiny artifact');
 assert.ok(pipeline.includes('AddHours(-72)'),'must require recent evidence');
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
