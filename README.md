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
npm run content:check
npm run content:sync
npm run metadata:fix
npm run images
npm run build
npm run deploy -- "Publiceringsmeddelande"
npm run dev:local
npm run dev:status
npm run dev:logs
npm run dev:stop
```

`npm run build` kör hela lokala byggkedjan: först `content:check`, sedan
bildgenerering och till sist `astro build`.

`npm run deploy -- "Publiceringsmeddelande"` kör en konservativ lokal
publicering från `main`: kommandot kräver ett commitmeddelande, kör
`npm run build`, visar `git status --short`, stage:ar bara tillåtna
sajt-/innehållsfiler, committar, pushar till `main` och kontrollerar senaste
GitHub Pages-workflowet. Nya otrackade filer accepteras automatiskt bara när de
är refererade galleribilder i rätt `content/<section-id>/`-katalog. Redan
versionshanterade filer under `content/` kan committas även när de inte är
refererade i galleriet. Kommandot kör inte `npm run metadata:fix`.

För lokal testning i webbläsare används `npm run dev:local`. Kommandot startar
Astros dev-server i bakgrunden på `http://localhost:4321/` och öppnar samma URL
i webbläsaren. Servern hanteras med `npm run dev:status`,
`npm run dev:logs`, `npm run dev:logs -- --follow` och `npm run dev:stop`.

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
.github/workflows/deploy.yml        # Bygger, cachar bildvarianter och publicerar dist/ till GitHub Pages
```

## Innehållsmodell

`content/site.md` använder frontmatter. Varje sektion definieras i `sections`:

```yaml
copyrightOwner: Karin Walde
sections:
  - id: om-mig
  - id: min-konst
    gallery:
      - image: verk.jpg
        alt: Beskrivande alt-text.
        caption: Bildtext.
```

`id` är sektionens stabila tekniska nyckel och används som ankare i
navigationen. Exempel: `id: min-konst` ger länken `#min-konst`.

Frontmatter styr vilka sektioner som visas, deras ordning och eventuell
gallerimetadata. `gallery` kan utelämnas för sektioner utan bilder. Det
synliga sektionsnamnet finns bara i Markdown-rubriken. Den löpande texten
skrivs som vanlig Markdown i samma fil under `##`-rubriker med explicit
sektions-id:

`copyrightOwner` används för upphovsrättsmetadata i genererade bildfiler.
Bildtext anges med det valfria fältet `caption`. `image` och `alt` ska finnas
för varje bild i ett galleri. `image` är ett globalt unikt filnamn utan katalog.

Nuvarande publika sektioner är Karin Walde, Runrondellerna, Min konst och Om mig.
CV-informationen ligger som löpande Markdown-text under `## Om mig`, före
kontaktuppgifterna, och är inte en separat sektion.

```md
## Min konst {#min-konst}

Inledande text.

### Underrubrik

- Punktlista
- Fler punkter
```

Builden varnar om Markdown-sektionernas ordning skiljer sig från ordningen i
frontmatter, men skriver inte om `content/site.md`. Kör `npm run content:check`
för att kontrollera ordning och bildplacering utan att ändra filer. Kommandot
visar också bildfiler under `content/` som inte refereras från `content/site.md`
och därför inte monteras på sajten. Kör
`npm run content:sync` för att sortera Markdown-sektionerna efter frontmatter
och flytta galleribilder till rätt sektionskatalog; kommandot frågar innan det
skriver om eller flyttar filer.

Alla bilder som visas på sidan ska ligga i en sektions `gallery`.

## Bilder

Bilder ska ligga i katalogen för den sektion de hör till under `content/`:

```text
content/karin-walde/
content/runrondellerna/
content/min-konst/
content/om-mig/
```

Bildreferens i `content/site.md` ska vara ett filnamn utan katalog, till exempel
`image: verk.jpg`. Varje bildfilnamn under `content/` måste vara globalt unikt.
Katalogen ska motsvara sektionens `id`; en bild som visas i `min-konst` ska
alltså ligga i `content/min-konst/`. Kör `npm run content:sync` om en bildrad
har flyttats till en annan sektion i frontmatter. Kör `npm run images` efter
att bilder lagts till eller bytts ut. `npm run build` kör bildgenereringen
automatiskt. Bildgenereringen kräver ImageMagick, antingen kommandot `magick`
eller de äldre kommandona `identify` och `convert`, samt `exiftool` för
metadatahantering.

Bildflödet skapar WebP-varianter i `public/bilder/generated/` för visning på
sidan. Katalogen är build-output och versionshanteras inte. Vanliga
visningsvarianter skapas i bredderna 480, 768, 1080, 1440 och 1920 px när
källbilden är tillräckligt stor. Bildflödet skapar också en största variant som
motsvarar källbildens bredd när den är större än standardbredderna.

Själva gallerivisningen använder ett begränsat responsivt `srcset` på upp till
1920 px och en fallback-`src` kring 1440 px. Klick på en bild går fortfarande
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

GitHub Actions-workflowet cachar `public/bilder/generated/` mellan deployer.
Vid cacheträff kan GitHub återanvända genererade WebP-varianter. Vid cachemiss
byggs bilderna om från källbilderna under `content/`.

Bildflödet validerar också att varje bildreferens i `content/site.md` är en
unik filnamnsreferens till en befintlig `.jpg`, `.jpeg` eller `.png` under
`content/`, och att bilden ligger i katalogen för den sektion där den används.

## Presentation

Navigationen ligger sticky överst på sidan. Aktiv sektion markeras endast genom
att länken i navigationen visas med vit text. Det ska inte finnas någon separat
rad under navigationen som upprepar aktuell sektions namn.

Galleribilder visas stora direkt på sidan, inte som thumbnails. Bilderna ska
inte beskäras. Höga bilder begränsas med CSS så att de ryms bättre inom
viewporten även i den vanliga gallerivisningen.

Första galleribilden i första sektionen prioriteras som trolig LCP-bild med
`loading="eager"` och `fetchpriority="high"`. Övriga galleribilder lazy-loadas.
Alla galleribilder får responsiva bildattribut och explicit `aspect-ratio` från
bildmanifestet för att minska layout shift.

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
`.github/workflows/deploy.yml` installerar ImageMagick och exiftool, återställer
cache för genererade WebP-varianter, kör `npm ci`, `npm run build` och
publicerar Astros genererade `dist/`-katalog.

Publicera lokala ändringar med `npm run deploy -- "Publiceringsmeddelande"`.
Scriptet vägrar köra utanför `main`, vägrar om det saknas ändringar att
committa, vägrar oväntade otrackade filer, pushar inte förrän committen är
skapad och kontrollerar därefter GitHub Pages-körningarna med `gh run list`.
Om senaste Pages-körningen har misslyckats hämtas felloggarna med
`gh run view <run-id> --log-failed`.

Testdomänen för GitHub Pages anges i `public/CNAME` och kopieras till `dist/`
vid build.
