#!/usr/bin/env node
import {decryptLines} from './secure-archive.mjs';
import {createVerifier} from './validate.mjs';

const file=process.argv[2],pass=process.env.TC_BACKUP_PASSPHRASE;
if(!file||!file.endsWith('.tcbackup')||!pass)
 throw Error('Aufruf: TC_BACKUP_PASSPHRASE=... node cloud/backup/verify.mjs <datei.tcbackup>');
const verify=createVerifier();
await decryptLines(file,pass,r=>verify.accept(r));
const report=verify.report();
console.log('Backup-Vollständigkeit und AES-GCM-Integrität geprüft.');
console.log(JSON.stringify({project:report.project,createdAt:report.created_at,counts:report.tables,images:report.images,bytes:report.imageBytes},null,2));
