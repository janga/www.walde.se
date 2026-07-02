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
└── min-konst/                      # Källbilder för galleriet Min konst
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

Bildtext anges med det valfria fältet `caption`. `src` och `alt` ska finnas
för varje bild.

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
content/min-konst/
```

Bildreferens i `content/site.md` ska vara relativ till `content/`, till exempel
`min-konst/verk.jpg`. Kör `npm run images` efter att bilder lagts till eller
bytts ut. `npm run build` kör bildgenereringen automatiskt. Bildgenereringen
kräver ImageMagick, antingen kommandot `magick` eller de äldre kommandona
`identify` och `convert`.

Bildflödet skapar WebP-varianter i `public/bilder/generated/` för visning på
sidan. Katalogen är build-output och versionshanteras inte. Klick på en bild går
till den största genererade WebP-varianten.

Bildflödet är inkrementellt. `src/data/generated-images.json` sparar en hash för
varje källbild, så oförändrade bilder återanvänder redan genererade
WebP-varianter. Endast nya, ändrade eller saknade bildvarianter byggs om.

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
/#min-konst
/#cv
```

Det finns inte längre separata Astro-routes för gallerier eller sidor.

## Publicering

GitHub Pages ska använda GitHub Actions som källa. Workflow-filen
`.github/workflows/deploy.yml` kör `npm ci`, `npm run build` och publicerar
Astros genererade `dist/`-katalog.

Testdomänen för GitHub Pages anges i `public/CNAME` och kopieras till `dist/`
vid build.
