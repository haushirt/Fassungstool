/* ════════════════════════════════════════════════════════════════════
   Fassungstool · sw.js
   Haus Hirt, Bad Gastein

   Bis v12 registrierte index.html einen Service Worker, den es nicht
   gab. Der Fehler wurde stillschweigend geschluckt — die Offline-
   Fähigkeit war eine Behauptung, keine Eigenschaft. Im Weinkeller, wo
   kein Netz ist, hieß das: Wer den Tab neu lud, sah nichts mehr.

   Zwei Regeln, mehr braucht es nicht:

   1 · Das Gerüst (HTML samt Gestaltung, Schriften, Symbol) wird
       vorgehalten.
       Zuerst wird das Netz gefragt, damit ein Deploy sofort ankommt;
       antwortet es nicht, kommt die Kopie aus dem Speicher.
   2 · Alles unter /api/ wird NIE zwischengespeichert. Ein alter
       Bestand aus dem Cache wäre schlimmer als gar keiner — und die
       App hat für den Ausfall längst ihren eigenen Ausgang.

   Nach jeder Änderung an einer der Dateien unten VERSION erhöhen.
   Sonst behält das iPhone hartnäckig den alten Stand.
   ════════════════════════════════════════════════════════════════════ */

const VERSION = "v68";
const SPEICHER = "hh-fassung-" + VERSION;

/* Was im Keller verfügbar sein muss. Die Schriften stehen mit drin,
   schaden aber nicht, solange es sie noch nicht gibt: fehlgeschlagene
   Einträge werden einzeln übersprungen, nicht der ganze Vorrat. */
const GERUEST = [
  "/index.html",
  "/leitung.html",
  "/icon.png",
  "/fonts/barlow-500.woff2",
  "/fonts/barlow-600.woff2",
  "/fonts/barlow-700.woff2",
  "/fonts/cormorant-600.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(SPEICHER);
    /* Einzeln, nicht als Block: eine fehlende Schriftdatei darf nicht
       die ganze Installation scheitern lassen. */
    await Promise.all(GERUEST.map(p =>
      c.add(new Request(p, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen
      .filter(n => n.startsWith("hh-fassung-") && n !== SPEICHER)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;

  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;

  /* Regel 2: Die Schnittstelle gehört dem Netz, nie dem Speicher. */
  if (u.pathname.startsWith("/api/")) return;

  /* Regel 1: erst das Netz, dann die Kopie. */
  e.respondWith((async () => {
    try {
      const antwort = await fetch(r);
      if (antwort && antwort.status === 200 && antwort.type === "basic") {
        const c = await caches.open(SPEICHER);
        c.put(r, antwort.clone());
      }
      return antwort;
    } catch (err) {
      const treffer = await caches.match(r, { ignoreSearch: true });
      if (treffer) return treffer;
      /* Beim Seitenaufruf ohne Treffer: die Startseite ausliefern,
         damit im Keller kein Dinosaurier erscheint. */
      if (r.mode === "navigate") {
        const start = await caches.match("/index.html");
        if (start) return start;
      }
      throw err;
    }
  })());
});

/* Die App kann eine sofortige Übernahme anstoßen, wenn sie merkt, dass
   ein neuer Stand bereitliegt. */
self.addEventListener("message", e => {
  if (e.data === "uebernehmen") self.skipWaiting();
});
