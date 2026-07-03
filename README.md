# Karin Walde

Statisk Astro-version av Karin Waldes webbplats.

Sajten är byggd som en enda sida. Allt egentligt innehåll styrs från en
Markdown-fil:

```text
content/site.md
```

## Kommandon

```sh
npm install
npm run metadata:fix
npm run images
npm run build
npm run astro -- dev --background
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

## Struktur

```text
content/
├── site.md                         # Alla sektioner, texter, bildreferenser och gallerimetadata
├── karin-walde/                    # Källbilder för galleriet Karin Walde
├── runrondellerna/                 # Källbilder för galleriet Runrondellerna
├── min-konst/                      # Källbilder för galleriet Min konst
└── om-mig/                         # Källbilder för galleriet Om mig
public/bilder/
├── CNAME                           # Testdomän för GitHub Pages
└── generated/                      # Genererade WebP-varianter, versionshanteras inte
src/
├── layouts/BaseLayout.astro        # Projektgemensam HTML och metadata
├── pages/index.astro               # Renderar hela sajten från content/site.md
├── styles/global.css               # Layout, sticky navigation och responsiv design
└── content.config.ts               # Validerar content/site.md
.github/workflows/deploy.yml        # Bygger och publicerar dist/ till GitHub Pages
```

## Innehållsmodell

`content/site.md` använder frontmatter. Varje sektion definieras i `sections`:

```yaml
copyrightOwner: Karin Walde
sections:
  - id: min-konst
    title: Min konst
    gallery:
      - src: min-konst/verk.jpg
        alt: Beskrivande alt-text.
        caption: Bildtext.
```

`id` används som ankare i navigationen. Exempel: `id: min-konst` ger länken
`#min-konst`.

Frontmatter styr sektionernas ordning och gallerimetadata. Den
löpande texten skrivs som vanlig Markdown i samma fil under `##`-rubriker som
matchar sektionernas `id` eller `title`:

`copyrightOwner` används för upphovsrättsmetadata i genererade bildfiler.
Bildtext anges med det valfria fältet `caption`. `src` och `alt` ska finnas
för varje bild.

Nuvarande publika sektioner är Karin Walde, Runrondellerna, Min konst och Om mig.
CV-informationen ligger som löpande Markdown-text under `## Om mig`, före
kontaktuppgifterna, och är inte en separat sektion.

```md
## Min konst

Inledande text.

### Underrubrik

- Punktlista
- Fler punkter
```

Alla bilder som visas på sidan ska ligga i en sektions `gallery`.

## Bilder

Bilder ska ligga i katalogen för den sektion de hör till under `content/`:

```text
content/karin-walde/
content/runrondellerna/
content/min-konst/
content/om-mig/
```

Bildreferens i `content/site.md` ska vara relativ till `content/`, till exempel
`min-konst/verk.jpg`. Kör `npm run images` efter att bilder lagts till eller
bytts ut. `npm run build` kör bildgenereringen automatiskt. Bildgenereringen
kräver ImageMagick, antingen kommandot `magick` eller de äldre kommandona
`identify` och `convert`, samt `exiftool` för metadatahantering.

Bildflödet skapar WebP-varianter i `public/bilder/generated/` för visning på
sidan. Katalogen är build-output och versionshanteras inte. Klick på en bild går
till den största genererade WebP-varianten.

### Metadata

Originalbilder kan märkas med `npm run metadata:fix`. Scriptet läser
`copyrightOwner` från `content/site.md`, kontrollerar källbilderna under
`content/` och skriver enkel upphovsrättsmetadata endast till bilder som saknar
något av metadatafälten nedan. Om något av fälten redan har ett värde lämnas
bilden helt oförändrad.

Fälten som skrivs när metadata saknas är:

```text
Artist / Creator / By-line: Karin Walde
Copyright / Rights / CopyrightNotice: Copyright Karin Walde. All rights reserved.
Credit / Owner: Karin Walde
Marked: True
```

De genererade WebP-filerna får metadata genom att bildflödet kopierar de
vanliga metadatafälten från källbilden efter optimering. `npm run build`
ändrar aldrig originalbilderna, men builden kräver att varje källbild som
refereras i `content/site.md` har creator/artist-metadata. Om en ny bild saknar
metadata ska `npm run metadata:fix` köras och den uppdaterade källbilden
committas.

Rekommenderat arbetsflöde när nya bilder läggs till:

```sh
npm run metadata:fix
npm run build
git add content/ content/site.md src/data/generated-images.json
git commit -m "Add gallery images"
```

Bildflödet är inkrementellt. `src/data/generated-images.json` sparar en hash för
varje källbild och en hash för de metadatafält som kopieras till WebP. Oförändrade
bilder återanvänder redan genererade WebP-varianter. Endast nya, ändrade eller
saknade bildvarianter byggs om.

Bildflödet validerar också att varje bildreferens i `content/site.md` är en
unik, relativ sökväg till en befintlig `.jpg`, `.jpeg` eller `.png` under
`content/`.

## Presentation

Navigationen ligger sticky överst på sidan. Aktiv sektion markeras endast genom
att länken i navigationen visas med vit text. Det ska inte finnas någon separat
rad under navigationen som upprepar aktuell sektions namn.

Galleribilder visas stora direkt på sidan, inte som thumbnails. Bilderna ska
inte beskäras. Höga bilder begränsas med CSS så att de ryms bättre inom
viewporten även i den vanliga gallerivisningen.

Bildtext visas lågmält under bilden när `caption` är ifyllt. Klick på bilden
går till bildfilen.

## Routing

Sajten byggs som en enda statisk sida på `/`. Navigationen använder ankare till
sektioner på samma sida:

```text
/#karin-walde
/#runrondellerna
/#min-konst
/#om-mig
```

Det finns inte längre separata Astro-routes för gallerier eller sidor.

## Publicering

GitHub Pages ska använda GitHub Actions som källa. Workflow-filen
`.github/workflows/deploy.yml` installerar ImageMagick och exiftool, kör
`npm ci`, `npm run build` och publicerar Astros genererade `dist/`-katalog.

Testdomänen för GitHub Pages anges i `public/CNAME` och kopieras till `dist/`
vid build.
