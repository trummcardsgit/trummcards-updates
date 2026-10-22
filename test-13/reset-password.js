/* TrummCards Mobile TEST 1.3: password recovery. No passwords or tokens are stored persistently. */
(()=>{
'use strict';
const PROJECT='cpycfxolqpidfjbhhsmr';
const ROOT='https://'+PROJECT+'.supabase.co';
const PUBLIC_KEY="sb_publishable_oS2Ri8VlhEqv1XDBwkUahQ_zVEEtyHG";
const REDIRECT=new URL('./reset-password.html',location.href).href;
const $=id=>document.getElementById(id);
const panels=['requestPanel','updatePanel','sentPanel','successPanel'];
let accessToken=null;
function show(name){for(const x of panels)$(x).hidden=x!==name;}
function inform(message,error=false){const m=$('message');m.hidden=false;m.textContent=message;m.className='toast'+(error?' error':' success');}
function clear(){const m=$('message');m.hidden=true;m.textContent='';}
function errText(err){return String(err?.message||'Verbindung fehlgeschlagen.');}
async function call(endpoint,opts={}){
 let response;
 try{response=await fetch(ROOT+endpoint,{...opts,headers:{apikey:PUBLIC_KEY,Accept:'application/json',...(opts.headers||{})},cache:'no-store'});}
 catch{throw Error('Verbindung zu Supabase fehlgeschlagen. Prüfe deine Internetverbindung.');}
 let data={};try{data=await response.json();}catch{}
 if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||data?.error||'Supabase-Fehler '+response.status);
 return data;
}
async function establishRecovery(params){
 const type=params.get('type');
 if(!['recovery','invite'].includes(type)){inform('Dieser Link ist weder ein Einladungs- noch ein Passwort-Wiederherstellungslink. Bitte fordere bei Bedarf einen neuen Link an.',true);return;}
 try{
  let token=params.get('access_token');
  if(!token&&params.get('token_hash')){
    const result=await call('/auth/v1/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:params.get('token_hash'),type})});
    token=result.access_token;
  }
  if(!token)throw Error('Der Wiederherstellungslink enthält keinen gültigen Zugriffstoken. Bitte fordere einen neuen Link an.');
  const user=await call('/auth/v1/user',{headers:{Authorization:'Bearer '+token}});
  if(!user?.id)throw Error('Das Benutzerkonto konnte nicht verifiziert werden.');
  accessToken=token;show('updatePanel');clear();
  if(type==='invite'){$('updateTitle').textContent='Passwort für deinen neuen TrummCards-Zugang festlegen';$('updateIntro').textContent='Einladung bestätigt. Lege jetzt dein eigenes Passwort fest.';}
  $('newPassword').focus();
 }catch(err){accessToken=null;show('requestPanel');inform(errText(err)+' Falls der Link abgelaufen ist, fordere bitte eine neue E-Mail an.',true);}
}
async function requestReset(e){
 e.preventDefault();const btn=$('requestButton');btn.disabled=true;clear();
 try{
  const email=$('requestEmail').value.trim();
  if(!email)throw Error('Bitte E-Mail-Adresse eingeben.');
  await call('/auth/v1/recover?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
  show('sentPanel');inform('Wiederherstellungs-E-Mail angefordert.','');
 }catch(err){inform(errText(err),true);}finally{btn.disabled=false;}
}
async function updatePassword(e){
 e.preventDefault();const btn=$('updateButton');btn.disabled=true;clear();
 try{
  if(!accessToken)throw Error('Der Link ist nicht mehr gültig. Bitte fordere eine neue E-Mail an.');
  const pw=$('newPassword').value;
  if(pw.length<12)throw Error('Bitte mindestens 12 Zeichen verwenden.');
  if(pw!==$('confirmPassword').value)throw Error('Die beiden Passwörter stimmen nicht überein.');
  await call('/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify({password:pw})});
  $('newPassword').value='';$('confirmPassword').value='';
  try{await call('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+accessToken}});}catch{}
  accessToken=null;
  localStorage.removeItem('trummcards-mobile-test13-session-v1');
  show('successPanel');inform('Dein Passwort wurde geändert. Bitte melde dich neu an.');
 }catch(err){inform(errText(err),true);}finally{btn.disabled=false;}
}
function start(){
 $('requestForm').addEventListener('submit',requestReset);
 $('updateForm').addEventListener('submit',updatePassword);
 $('againButton').addEventListener('click',()=>{clear();show('requestPanel');});
 const h=new URLSearchParams(location.hash.slice(1));
 const q=new URLSearchParams(location.search);
 // A recovery URL may contain a bearer token in its fragment. Remove it
 // from browser history immediately; the token stays in memory only.
 if(location.hash||location.search)history.replaceState(null,'',location.pathname);
 if(h.has('error')||h.has('error_code')||q.has('error')){
  const reason=h.get('error_description')||q.get('error_description');
  inform(reason?decodeURIComponent(reason.replace(/\+/g,' ')):'Dieser Link ist abgelaufen oder ungültig. Bitte fordere eine neue E-Mail an.',true);
 }else if(h.has('access_token')||['recovery','invite'].includes(h.get('type'))||['recovery','invite'].includes(q.get('type'))){
  establishRecovery(h.has('access_token')?h:q);
 }else{show('requestPanel');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
