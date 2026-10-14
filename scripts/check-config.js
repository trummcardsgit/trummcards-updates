const p=require('../package.json');
const pub=(p.build&&p.build.publish||[])[0];
if(!pub||pub.provider!=='github'||!pub.owner||pub.owner==='DEIN_GITHUB_NAME'||!/^[A-Za-z0-9-]+$/.test(pub.owner)){
  console.error('\nFEHLER: Bitte in package.json unter build > publish > owner deinen GitHub-Benutzernamen eintragen.\n');
  process.exit(1);
}
if(!/^\d+\.\d+\.\d+$/.test(p.version)){
  console.error('FEHLER: version in package.json muss z.B. 1.4.0 sein.');
  process.exit(1);
}
console.log('Update-Ziel: https://github.com/'+pub.owner+'/'+pub.repo+'/releases  | Version '+p.version);
