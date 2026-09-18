# beweis-alt · der Stand von heute früh, mit dem neuen Messgerät

Lauf von `tests/ui-mass.cjs` (Fassung vom 18.09.2026) gegen den Code von
`50c1123` — `public/` und `src/` zurückgestashed, nur die Messung neu.
Er ist ROT. Das ist der Nachweis, den der Auftrag verlangt.

```
Überlauf app/lade-4@320: 1 → DIV.gcap(323px)
Beschnitten app/lade-4@320: 2 → DIV.drwi schneidet DIV.gcap um 7.2px (San­bitter),
                                DIV.drwi schneidet DIV.gcap um 4.9px (Gast. 0,25)
Beschnitten app/lade-4@430: 1 → DIV.drwi schneidet DIV.gcap um 1.1px (Gast. 0,25)
✗ kein waagrechter Überlauf in 320/375/390/430/768/1280  (13 Stellen)
✗ nichts im Service wird von einem Kasten abgeschnitten  (3 Stellen)
✗ Trefferflächen mindestens 44 px (Service)  (56 Knöpfe ohne Griff)
```

Von den 121 Bildern des Laufs liegen hier die fünf, die den Befund tragen;
die vollständigen Zahlen stehen in `messung.json`. Der grüne Gegenlauf
liegt unter `../schluss/`.
