# Karin Walde

Statisk Astro-version av [walde.se](https://walde.se). Projektet återskapar den
befintliga sidstrukturen utan att vara beroende av WordPress vid byggning eller
drift.

## Kommandon

```sh
npm install
npm run build
npm run astro -- dev --background
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

## Struktur

```text
content/
├── pages/                         # Vanliga sidor i Markdown
└── galleries/
    └── <gallery-slug>/
        ├── gallery.json           # Titel, texter, ordning och bildmetadata
        └── originals/             # Ej publicerade masterbilder
public/bilder/
├── generated/<gallery-slug>/      # Framtida webboptimerade bilder
└── legacy/                         # Redan webbanpassade bilder från gamla sajten
src/
├── components/                    # Navigation, sidhuvud, sidfot och sidmallar
├── layouts/BaseLayout.astro       # Projektgemensam HTML och bakgrund
├── pages/                         # Filbaserade och statiskt genererade routes
└── content.config.ts              # Validering av sidor och gallerier
site.config.json                   # Meny, sökvägar och framtida bildformat
```

Huvudmenyn motsvarar WordPress-sajten: hem, grafik, fiber art, offentlig konst,
akvarell, utställningar och CV. De publicerade men meny-dolda sidorna `nyheter`
och `objekt` byggs också för att bevara befintliga URL:er.

## Lägga till galleriinnehåll

1. Välj galleri genom att välja katalog, exempelvis
   `content/galleries/grafik/`.
2. Lägg masterbilden i galleriets `originals/`-katalog.
3. Använd ett beskrivande filnamn med gemener och bindestreck, exempelvis
   `rorelse-i-rott.jpg`.
4. Lägg senare till titel, alt-text, bildtext, år och visningsordning i samma
   galleris `gallery.json`.

Katalogen är den entydiga kopplingen mellan bild och galleri. Galleri-sluggen
ska vara densamma i katalogen, URL:en och den framtida genererade
bildkatalogen. Se även `content/galleries/README.md`.

## Framtida bildgenerering

Bildgenereringen är inte implementerad ännu. När den införs ska en byggprocess
läsa masterbilder från `originals/` och skapa de storlekar och format som anges
i `site.config.json`. Endast de genererade filerna ska publiceras.

Planerad utdata är miniatyr, mobil och desktop i AVIF, WebP och JPEG. Mallarna
ska då använda `srcset` och `sizes` så att webbläsaren väljer lämplig fil.

## Innehållskällor

Texter, sidtitlar, menyordning och den befintliga startsidesbilden migrerades
från den publika WordPress-sajten. Migrerat innehåll lagras lokalt och ska inte
hotlinkas från `walde.se` eller `media.walde.se`.
