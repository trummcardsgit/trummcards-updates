// Manual go-live switch: deliberately rejects current read-only 0.9.0.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
const win=read('cloud/desktop-production/main.cjs');
const desktop=read('cloud/desktop-production/src/app.js');
const mobile=read('cloud/mobile-production/web/app.js');
const html=read('cloud/mobile-production/web/index.html');
const sw=read('cloud/mobile-production/web/sw.js');
const backup=read('cloud/backup/validate.mjs');
const failures=[];
function check(ok,message){if(!ok)failures.push(message);}
check(pkg.version==='1.0.0','Windows-Cloud-Version muss 1.0.0 sein.');
check(pkg.build.appId==='at.trummcards.cloudproduction','Cloud-App-ID darf nicht geändert werden.');
check(pkg.build.publish?.[0]?.provider==='generic','Cloud muss eigenen generischen Updatekanal verwenden.');
check(pkg.build.publish?.[0]?.url==='https://trummcardsgit.github.io/trummcards-updates/cloud-updates/','Cloud-Updatepfad weicht ab.');
check(win.includes('const UPDATE_FEED_ENABLED=true;'),'Windows-Updateprüfung noch nicht für Release aktiviert.');
check(desktop.includes('const WRITES_ENABLED = true;'),'Windows Cloud noch schreibgeschützt.');
check(mobile.includes('const WRITES_ENABLED=true;'),'Produktiv-PWA noch schreibgeschützt.');
check(desktop.includes("SUPABASE_PROJECT = 'hgdexyvtgfffcasfpjyu'"),'Windows verbindet sich mit falscher DB.');
check(mobile.includes("const PROJECT='hgdexyvtgfffcasfpjyu'"),'PWA verbindet sich mit falscher DB.');
check(!desktop.includes('cpycfxolqpidfjbhhsmr')&&!mobile.includes('cpycfxolqpidfjbhhsmr'),'TEST-Konfiguration entdeckt.');
check(html.includes('v=1.0.0'),'PWA Assets brauchen Cache-busting 1.0.0.');
check(sw.includes('trummcards-mobile-production-shell-v2'),'Produktiv-Service-Worker muss erneuert werden.');
check(backup.includes("PROD_REF='hgdexyvtgfffcasfpjyu'"),'Backup auf falsches Projekt konfiguriert.');
check(process.env.TRUMMCARDS_BACKUP_ACTIVE==='true','Tägliche Sicherung nicht aktiviert.');
check(process.env.TRUMMCARDS_RESTORE_VERIFIED==='true','Echter Restore-Test nicht bestätigt.');
check(process.env.TRUMMCARDS_PRODUCTION_APPROVED==='true','Benutzerfreigabe für Go-Live fehlt.');
if(failures.length){
 process.stderr.write('TRUMMCARDS 1.0 NO-GO:\n'+failures.map(x=>' - '+x).join('\n')+'\n');
 process.exitCode=1;
}else{
 process.stdout.write('TRUMMCARDS 1.0: Source- und Release-Gate erfüllt. Letztes echtes Backup separat prüfen.\n');
}
