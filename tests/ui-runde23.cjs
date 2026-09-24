/* ═══════════════════════════════════════════════════════════════════════
   Runde 23 im Browser · die Artikelliste unter der Hand

   Der A2-Fund der Jagd lässt sich nur hier nachstellen: `zeichne()` nach
   jeder Änderung riss das Feld im Fokus aus dem DOM, und Chrome feuerte
   darauf `change` mit dem BRUCHSTÜCK. Gemessen wurde „750", über ein
   Neuzeichnen hinweg getippt → `{"g":7}` in der Datenbank, als bestätigt
   gerechnet: drei Achtel wurden zu 53,57 Flaschen statt 0,5.

   Kein Teil von `npm test` (Regel 8) — braucht Playwright.
   Aufruf:  node tests/ui-runde23.cjs
   ═══════════════════════════════════════════════════════════════════════ */
const ORTE=["playwright","/opt/node22/lib/node_modules/playwright","/usr/lib/node_modules/playwright"];
let pw=null; for(const o of ORTE){try{pw=require(o);break}catch(e){}}
if(!pw){ console.error("Playwright fehlt."); process.exit(1); }
const http=require("http"),fs=require("fs"),path=require("path");
const W="/home/user/Fassungstool", ROOT=path.join(W,"public");
const PORT=8993, CODE=String(require("crypto").randomInt(1000,10000));
const TYPEN={".html":"text/html;charset=utf-8",".js":"text/javascript",
             ".png":"image/png",".json":"application/json"};
let gut=0, schlecht=0;
const ok=(t,b,zus)=>{ (b?gut++:schlecht++);
  console.log("  "+(b?"✓":"✗")+" "+t+(zus!==undefined?"  ("+zus+")":"")); };

(async()=>{
  const {ladeWorker}=await import(W+"/tests/hilfe/worker.mjs");
  const {d1Echt}=await import(W+"/tests/hilfe/d1-echt.mjs");
  const worker=await ladeWorker();
  /* `docs/live-schema.sql` traegt `ausschank_ml` bereits — die Migration
     gehoert hier also nicht noch einmal eingespielt. Dass sie OHNE die
     Spalte sauber laeuft, prueft tests/migration-002.test.mjs. */
  const DB=d1Echt();
  const env={DB,TOKEN_SECRET:require("crypto").randomBytes(32).toString("hex"),
    ANLAGE_OFFEN:"1", ASSETS:{fetch:()=>new Response("x",{status:404})}};
  /* Eine Bremse, die sich zur Laufzeit stellen lässt — damit getippt
     werden kann, WÄHREND eine Anfrage unterwegs ist. */
  let bremse=0, verbiete=0;
  const srv=http.createServer(async(q,a)=>{
    let u=q.url.split("?")[0]; if(u==="/")u="/leitung.html";
    if(u.startsWith("/api")){
      const k=await new Promise(r=>{if(q.method==="GET")return r(undefined);
        let s="";q.on("data",c=>s+=c);q.on("end",()=>r(s))});
      if(u==="/api/stamm" && q.method==="POST"){
        if(bremse) await new Promise(r=>setTimeout(r,bremse));
        if(verbiete){ a.writeHead(403,{"content-type":"application/json"});
          return a.end('{"fehler":"nur Leitung"}'); }
      }
      const h=new Headers(); for(const[x,v]of Object.entries(q.headers))
        if(typeof v==="string")h.set(x,v);
      h.set("cf-connecting-ip","10.0.0.1");
      const r=await worker.fetch(new Request("http://localhost:"+PORT+q.url,
        {method:q.method,headers:h,body:k}), env);
      const kopf={}; r.headers.forEach((v,x)=>{if(x!=="set-cookie")kopf[x]=v});
      const ke=r.headers.getSetCookie?r.headers.getSetCookie():[];
      if(ke.length)kopf["set-cookie"]=ke.map(z=>z.replace(/;\s*Secure/gi,""));
      a.writeHead(r.status,kopf); return a.end(Buffer.from(await r.arrayBuffer()));
    }
    const f=path.join(ROOT,u); if(!fs.existsSync(f)){a.writeHead(404);return a.end("")}
    a.writeHead(200,{"content-type":TYPEN[path.extname(f)]||"text/plain"});
    a.end(fs.readFileSync(f));
  });
  await new Promise(r=>srv.listen(PORT,r));
  const B="http://localhost:"+PORT;
  await fetch(B+"/api/anlage",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({name:"Casimir",rolle:"leitung",code:CODE})});
  const an=await fetch(B+"/api/anmelden",{method:"POST",
    headers:{"content-type":"application/json"},body:JSON.stringify({code:CODE})});
  const keks=(an.headers.getSetCookie()[0]||"").split(";")[0]; env.ANLAGE_OFFEN="";

  const br=await pw.chromium.launch();
  const ctx=await br.newContext({viewport:{width:1440,height:1000}});
  await ctx.addCookies([{name:"hh_sitz",value:keks.split("=").slice(1).join("="),
    domain:"localhost",path:"/"}]);
  const p=await ctx.newPage();
  const jsFehler=[]; p.on("pageerror",e=>jsFehler.push(e.message));
  await p.goto(B+"/leitung.html",{waitUntil:"load"});
  await p.waitForFunction(()=>typeof GROESSEN!=="undefined",null,{timeout:30000});
  const zurEinst=async()=>{ await p.evaluate(()=>{SEITE="einst";zeichne();});
    await p.waitForTimeout(250); };
  const feld=id=>'input[data-gid="'+id+'"][data-art="g"]';
  const serverStand=async()=>(await (await fetch(B+"/api/stamm",
    {headers:{cookie:keks}})).json()).groessen||{};

  console.log("\n1 · Tippen, während eine Anfrage unterwegs ist");
  await zurEinst();
  bremse=600;
  await p.fill(feld("w001"),"1500");
  await p.locator(feld("w001")).press("Tab");        /* löst den ersten POST aus */
  await p.waitForTimeout(80);                         /* mitten in der Anfrage */
  await p.fill(feld("w011"),"750");
  await p.locator(feld("w011")).press("Tab");
  await p.waitForTimeout(2000);
  bremse=0;
  let st=await serverStand();
  ok("die erste Zahl steht noch", st.w001 && st.w001.g===1500, JSON.stringify(st.w001));
  ok("die zweite auch, und ganz", st.w011 && st.w011.g===750, JSON.stringify(st.w011));
  ok("kein Bruchstück in der Datenbank",
     !Object.values(st).some(v=>v.g && v.g<50), JSON.stringify(st));

  console.log("\n2 · Das Feld im Fokus überlebt das Speichern");
  await zurEinst();
  bremse=400;
  await p.fill(feld("w003"),"750");
  await p.locator(feld("w003")).press("Tab");
  await p.focus(feld("w005"));
  await p.type(feld("w005"),"7");
  await p.waitForTimeout(900);                        /* der POST kommt zurück */
  const nochDa=await p.evaluate(s=>!!document.querySelector(s), feld("w005"));
  const fokus=await p.evaluate(()=>document.activeElement.tagName);
  bremse=0;
  ok("das Feld ist noch da", nochDa);
  ok("und der Fokus ist nicht auf BODY gesprungen", fokus==="INPUT", fokus);

  console.log("\n3 · Ein Wert ausserhalb des Bandes wird abgelehnt");
  await zurEinst();
  const vorher=await serverStand();
  await p.fill(feld("w002"),"7");
  await p.locator(feld("w002")).press("Tab");
  await p.waitForTimeout(400);
  st=await serverStand();
  ok("7 ml kommt nicht in die Datenbank", !(st.w002 && st.w002.g===7),
     JSON.stringify(st.w002));
  ok("und der Rest ist unberührt",
     JSON.stringify(st.w001)===JSON.stringify(vorher.w001));

  console.log("\n4 · Nach einer Absage gilt der alte Stand");
  await zurEinst();
  const w001vor=(await serverStand()).w001;
  verbiete=1;
  await p.fill(feld("w001"),"375");
  await p.locator(feld("w001")).press("Tab");
  await p.waitForTimeout(800);
  verbiete=0;
  const imGeraet=await p.evaluate(()=>JSON.parse(JSON.stringify(GROESSEN)));
  st=await serverStand();
  ok("die Datenbank hält ihren Wert", st.w001 && st.w001.g===w001vor.g,
     JSON.stringify(st.w001));
  ok("und das Gerät rechnet nicht mit dem abgewiesenen Wert",
     imGeraet.w001 && imGeraet.w001.g===w001vor.g, JSON.stringify(imGeraet.w001));

  console.log("\n5 · Was am Ende wirklich gerechnet wird");
  const gr=await p.evaluate(()=>gebindeGroesse("w001",null));
  ok("die Gebindegröße ist die bestätigte", gr && gr.quelle==="bestaetigt",
     JSON.stringify(gr));
  ok("keine JS-Fehler", jsFehler.length===0, jsFehler.join(" · "));

  console.log("\n══ Ergebnis ══\n  "+gut+" von "+(gut+schlecht)+" Punkten in Ordnung");
  await br.close(); srv.close();
  process.exit(schlecht?1:0);
})();
