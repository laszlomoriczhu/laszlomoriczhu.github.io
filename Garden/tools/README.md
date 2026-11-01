# Fotók feldolgozása

Az eredeti képek forrása: `C:\Garden\KEZDETEK`, `C:\Garden\LAKOINK`, `C:\Garden\VIRAGOK`.
Az eredetiket a feldolgozó nem módosítja. A ZIP-ekben lévő képeket is kezeli.

Futtatás Pillow és WebP támogatással rendelkező Pythonnal:

```
python tools/process_photos.py C:\Garden
```

A script 480 pixeles miniatűröket és legfeljebb 1600 pixeles nagy képeket készít, helyes tájolással, EXIF/GPS-adatok nélkül. Az ismételt futtatás kihagyja a már elkészült változatokat. Az azonos albumon belüli, byte-ra azonos képeket kiszűri. A Garden.html beágyazott képlistáját frissíti, ezért file:// megnyitással is működik, nincs szükség külön adatkérésre.

Az EXIF készítési dátum alapján sorol évbe és évszakba. Január és február az előző év teléhez tartozik. Dátum nélküli VIRAGOK-képek a „Besorolásra vár” albumba kerülnek. Az eredmények és hibák a tools/processing-report.json fájlban ellenőrizhetők. Új fotók hozzáadása után újra kell futtatni; a böngésző nem olvassa a C:\Garden mappát.

A kezdőlapi három kép jelenleg automatikus válogatás a legújabb, dátummal rendelkező VIRAGOK-képekből. Később kézzel kiválasztható a végleges borító.
