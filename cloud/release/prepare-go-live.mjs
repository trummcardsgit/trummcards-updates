#!/usr/bin/env node
// Gated, in-run staging only: never publish or write business data from this script.
// The checked-in main-branch client remains read-only until an explicitly approved release.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const dryRun=process.argv.length===3&&process.argv[2]==='--dry-run';
if(!dryRun&&process.argv.length!==2)throw Error('Nur --dry-run ist als Argument erlaubt.');
const flags=['TRUMMCARDS_BACKUP_ACTIVE','TRUMMCARDS_RESTORE_VERIFIED','TRUMMCARDS_PRODUCTION_APPROVED'];
if(!dryRun&&flags.some(name=>process.env[name]!=='true')){
  throw Error('GO-LIVE gesperrt: Backup, Restore und ausdrückliche Benutzerfreigabe erforderlich.');
}
const replacements={
  "cloud/desktop-production/package.json": [
    [
      "\"version\": \"0.9.0\"",
      "\"version\": \"1.0.0\""
    ],
    [
      "TrummCards Cloud production release candidate – read-only until go-live approval",
      "TrummCards Cloud 1.0 – separate production installation and updates"
    ]
  ],
  "cloud/desktop-production/main.cjs": [
    [
      "const UPDATE_FEED_ENABLED=false;",
      "const UPDATE_FEED_ENABLED=true;"
    ],
    [
      "title:'TrummCards Cloud – PRODUKTIONSVORSCHAU'",
      "title:'TrummCards Cloud – 1.0'"
    ],
    [
      "Automatische Cloud-Updates sind vorbereitet. Freischaltung erst mit dem endgültigen Release.",
      "Cloud-Updates sind aktiviert. Neue Versionen werden regelmäßig geprüft."
    ]
  ],
  "cloud/desktop-production/src/app.js": [
    [
      "const WRITES_ENABLED = false;",
      "const WRITES_ENABLED = true;"
    ]
  ],
  "cloud/desktop-production/src/index.html": [
    [
      "PRODUKTIONSVORSCHAU",
      "CLOUD 1.0"
    ],
    [
      "Produktionsvorschau – noch nicht freigegeben!",
      "TrummCards Cloud 1.0 – Produktivbetrieb"
    ],
    [
      "Diese Windows-App ist mit TrummCards Production verbunden. Artikel, Einkäufe, Verkäufe, Storno und Bildupload sind bis zur fertigen Datensicherung und Releasefreigabe technisch gesperrt. TEST und Version 1.6.1 bleiben unangetastet.",
      "Diese Windows-App ist mit TrummCards Production verbunden und synchronisiert deine Daten mit der Cloud-PWA. TEST und die bisherige Windows-Version 1.6.1 bleiben getrennt."
    ],
    [
      "Während der Release-Vorbereitung ist der Updatekanal absichtlich deaktiviert. Vor der Freigabe werden Installer, Versionsdatei und Wiederherstellungsverfahren geprüft.",
      "TrummCards Cloud sucht regelmäßig nach Updates und lädt neue Versionen herunter. Du entscheidest, wann die Installation durchgeführt wird."
    ]
  ],
  "cloud/mobile-production/web/app.js": [
    [
      "RC v0.9.0",
      "v1.0.0"
    ],
    [
      "const WRITES_ENABLED=false;",
      "const WRITES_ENABLED=true;"
    ],
    [
      "const NO_WRITES='Produktionsvorschau: Echtdaten und Buchungen bleiben bis zur Releasefreigabe gesperrt.';",
      "const NO_WRITES='Schreiben ist in dieser App-Version nicht freigegeben.';"
    ]
  ],
  "cloud/mobile-production/web/index.html": [
    [
      "v=0.9.0",
      "v=1.0.0"
    ],
    [
      "PRODUKTIONSVORSCHAU 0.9.0",
      "TRUMMCARDS CLOUD 1.0.0"
    ],
    [
      "VORSCHAU 0.9.0",
      "CLOUD 1.0.0"
    ],
    [
      "Aktuell sind Buchungen zum Schutz deiner Daten gesperrt.",
      "Deine Kartenbestände werden mit deinem TrummCards-Produktivkonto synchronisiert."
    ],
    [
      "Nur das für TrummCards freigeschaltete Konto erhält Zugriff. Keine Registrierung in dieser Produktionsvorschau.",
      "Nur das für TrummCards freigeschaltete Konto erhält Zugriff."
    ],
    [
      "Die PWA verbindet sich ausschließlich mit der neuen leeren Datenbank <b>TrummCards Production</b>. Artikelanlage, Ein- und Verkäufe sowie Bilduploads bleiben bis zur Freigabe gesperrt.",
      "Die PWA verbindet sich ausschließlich mit <b>TrummCards Production</b>. Deine Daten werden zwischen Windows und Handy synchronisiert."
    ],
    [
      "RELEASE VORSCHAU",
      "VERSION 1.0.0"
    ]
  ],
  "cloud/mobile-production/web/sw.js": [
    [
      "trummcards-mobile-production-shell-v1",
      "trummcards-mobile-production-shell-v2"
    ],
    [
      "v=0.9.0",
      "v=1.0.0"
    ]
  ],
  "cloud/mobile-production/web/reset-password.html": [
    [
      "v=0.9.0",
      "v=1.0.0"
    ]
  ]
};
let staged=0;
for(const [file,patterns] of Object.entries(replacements)){
  const target=path.join(root,file);
  let content=fs.readFileSync(target,'utf8');
  for(const [oldValue,newValue] of patterns){
    if(!content.includes(oldValue))throw Error(file+': erwarteter alter Wert nicht gefunden: '+oldValue.slice(0,70));
    content=content.replaceAll(oldValue,newValue);
  }
  if(file.endsWith('/app.js')&&content.includes('cpycfxolqpidfjbhhsmr')){
    throw Error(file+': TEST-Ref ist in Production verboten.');
  }
  if(!dryRun)fs.writeFileSync(target,content,'utf8');
  staged++;
}
console.log(dryRun
  ? 'Cloud 1.0: alle '+staged+' Release-Umschaltungen für späteren, freigegebenen Build geprüft – keine Datei verändert.'
  : 'Cloud 1.0: '+staged+' Produktionsdateien ausschließlich im freigegebenen CI-Build umgestellt.');
