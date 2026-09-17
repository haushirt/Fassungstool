# Runde 3 · qa-guardian — vier Bilder, nicht vierundneunzig

`tests/persona-tagesfassung.cjs` und `tests/ui-leitung.cjs` erzeugen
zusammen 96 Aufnahmen und 16 MB. Die liegen hier bewusst **nicht**: Der
hospitality-pro hat in derselben Runde 9,2 MB in die Geschichte gelegt und
sie nicht mehr herausbekommen (Regel 1 — kein Umschreiben). Die Bilder sind
jederzeit neu zu erzeugen:

    RUNDE=3-qa node tests/persona-tagesfassung.cjs
    RUNDE=3-qa node tests/ui-leitung.cjs

Hier liegen nur die vier, die einen Befund zeigen:

* `22-weg-12.png` — Schritt 3 „Holen". Unten steht „Weiter", und es führt
  weiter, ohne dass eine Zeile abgehakt ist. Kein Wort darüber, dass jeder
  Wein einzeln anzutippen ist.
* `23-abschluss.png` — die Folge davon: Die Persona liest hier zum ersten
  Mal „Noch nicht alles geholt – 3 Weine" und muss zurück.
* `iphone-leerarchiv-heute.png`, `macbook-leerarchiv-heute.png` — die Lage,
  die vorher niemand angesehen hatte: Der Server antwortet mit null
  Vorgängen, im Browser liegen drei. Gezeigt werden null. Genau der Zustand
  des MacBooks der Leitung am ersten Morgen nach dem Livegang.
