// Supabase rewrites text/html responses from ordinary Edge Function URLs to
// text/plain, so the mobile HTML shell is hosted on GitHub Pages instead.
// Preserve the old test URL by redirecting to the static host.
// All business operations remain authenticated against Supabase TEST with RLS.
import {writeFileSync} from 'node:fs';
const destination='https://trummcardsgit.github.io/trummcards-updates/';
const source=`// TrummCards Mobile TEST: legacy Supabase link -> GitHub Pages HTML hosting.
// Supabase Edge Functions deliberately return text/html as text/plain on *.supabase.co.
// Only the public mobile shell is hosted on Pages; data remain in TEST with JWT+RLS.
const destination='https://trummcardsgit.github.io/trummcards-updates/';
Deno.serve((req:Request)=>{
 if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 return new Response(null,{status:302,headers:{'Location':destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
});
`;
if(!source.includes(destination))throw Error('Bad destination');
writeFileSync(new URL('./index.ts',import.meta.url),source,'utf8');
console.log('Generated TrummCards Pages redirect:',destination);
