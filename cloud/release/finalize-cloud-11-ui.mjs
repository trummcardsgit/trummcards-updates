#!/usr/bin/env node
// Release-only UI labels. The 1.1 TEST app and production data are untouched.
import fs from 'node:fs';
function patch(path, replacements) {
 let s=fs.readFileSync(path,'utf8');
 for(const [from,to] of replacements){if(!s.includes(from))throw Error(path+': missing release label');s=s.replaceAll(from,to);}
 fs.writeFileSync(path,s);
}
patch('cloud/desktop-production/src/index.html',[
 ['PRODUKTIONSVORSCHAU','CLOUD 1.1'],
 ['<div class="warning production-preview-banner"><strong>Produktionsvorschau – noch nicht freigegeben!</strong> Diese Windows-App ist mit TrummCards Production verbunden. Artikel, Einkäufe, Verkäufe, Storno und Bildupload sind bis zur fertigen Datensicherung und Releasefreigabe technisch gesperrt. TEST und Version 1.6.1 bleiben unangetastet.</div>','<div class="warning production-preview-banner"><strong>TrummCards Cloud 1.1.0</strong> – Mit deinem bestehenden Produktivkonto verbunden. Deine bisherigen Lager-, Einkaufs- und Verkaufsdaten bleiben erhalten.</div>']
]);
patch('cloud/mobile-production/web/index.html',[
 ['PRODUKTIONSVORSCHAU 0.9.0','TRUMMCARDS CLOUD 1.1.0'],
 ['Die PWA verbindet sich ausschließlich mit der neuen leeren Datenbank <b>TrummCards Production</b>. Artikelanlage, Ein- und Verkäufe sowie Bilduploads bleiben bis zur Freigabe gesperrt.','Bestehende Artikel, Einkäufe, Verkäufe und Fotos werden weiterhin aus <b>TrummCards Production</b> geladen.'],
 ['Aktuell sind Buchungen zum Schutz deiner Daten gesperrt.','Nach der Anmeldung werden deine bestehenden Lagerdaten synchronisiert.'],
 ['Keine Registrierung in dieser Produktionsvorschau.','Keine öffentliche Registrierung.'],
 ['VORSCHAU 0.9.0','CLOUD 1.1.0']
]);
patch('cloud/mobile-production/web/manifest.webmanifest',[
 ['TrummCards Cloud Produktionsvorschau – mit eigenem Supabase-Produktivprojekt','TrummCards Cloud 1.1 – synchronisierte Pokémon-Karten-Lagerverwaltung']
]);
patch('cloud/desktop-production/main.cjs',[
 ['Automatische Cloud-Updates sind vorbereitet. Freischaltung erst mit dem endgültigen Release.','TrummCards Cloud 1.1: Automatische Updates sind aktiviert.']
]);
console.log('Production UI release labels checked');
