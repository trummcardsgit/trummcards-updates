// TrummCards Mobile TEST: legacy Supabase link -> GitHub Pages HTML hosting.
// Supabase Edge Functions deliberately return text/html as text/plain on *.supabase.co.
// Only the public mobile shell is hosted on Pages; data remain in TEST with JWT+RLS.
const destination='https://trummcardsgit.github.io/trummcards-updates/';
Deno.serve((req:Request)=>{
 if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 return new Response(null,{status:302,headers:{'Location':destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
});
