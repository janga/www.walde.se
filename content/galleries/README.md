# Galleribilder

Varje galleri har en egen katalog. Katalogens namn är samma stabila slug som
används i sajtens URL och avgör vilket galleri en bild tillhör.

```text
content/galleries/<gallery-slug>/
├── gallery.json
└── originals/
```

## Lägga in en ny masterbild

1. Välj rätt galleri: `grafik`, `fiber-art`, `offentlig-konst` eller
   `akvarell`.
2. Lägg bilden i det galleriets `originals/`-katalog.
3. Döp filen beskrivande med gemener, ASCII-tecken och bindestreck, exempelvis
   `vinterljus-2024.jpg`.
4. Använd inte mellanslag, å, ä, ö eller gallerinamnet som obligatoriskt prefix.
   Katalogen anger redan galleritillhörigheten.
5. Lägg bildens metadata i `gallery.json` när bildflödet implementeras.

Masterbilder får inte läggas i `public/`. De ska inte skickas oförändrade till
webbplatsen.

## Metadata

Varje framtida bildpost i `gallery.json` ska innehålla minst:

- `file`: masterbildens filnamn
- `title`: verkets titel
- `alt`: kort, saklig alternativtext
- `caption`: valfri publik bildtext
- `year`: valfritt årtal
- `order`: heltal som styr visningsordningen

## Framtida generering

Bildgenereringen är avsiktligt inte implementerad. Den ska senare läsa
`originals/` och skriva responsiva filer till
`public/bilder/generated/<gallery-slug>/` enligt storlekarna och formaten i
`site.config.json`. Genererade filer ska kunna återskapas och ska aldrig vara
den enda kopian av ett verk.
