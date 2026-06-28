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
npm run build
npm run astro -- dev --background
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

## Struktur

```text
content/
└── site.md                         # Alla sektioner, texter, bildreferenser och gallerimetadata
public/bilder/
├── cropped-bakgrund-3.jpg          # Projektgemensam bakgrund
└── site/
    ├── karin-walde/                # Bilder som hör till sektionen Karin Walde
    ├── min-konst/                  # Bilder som hör till sektionen Min konst
    └── cv/                         # Bilder som hör till sektionen CV
src/
├── layouts/BaseLayout.astro        # Projektgemensam HTML, metadata och bakgrund
├── pages/index.astro               # Renderar hela sajten från content/site.md
├── styles/global.css               # Layout, sticky navigation och responsiv design
└── content.config.ts               # Validerar content/site.md
site.config.json                    # Globala projektvärden, till exempel bakgrundsbild
```

## Innehållsmodell

`content/site.md` använder frontmatter. Varje sektion definieras i `sections`:

```yaml
sections:
  - id: min-konst
    title: Min konst
    image:
      src: /bilder/site/min-konst/exempel.jpg
      alt: Beskrivande alt-text.
    gallery:
      - src: /bilder/site/min-konst/verk.jpg
        title: Titel
        year: 2026
        technique: Teknik
        caption: Bildtext.
        alt: Beskrivande alt-text.
```

`id` används som ankare i navigationen. Exempel: `id: min-konst` ger länken
`#min-konst`.

Frontmatter styr sektionernas ordning, introbild och gallerimetadata. Den
löpande texten skrivs som vanlig Markdown i samma fil under `##`-rubriker som
matchar sektionernas `id` eller `title`:

```md
## Min konst

Inledande text.

### Underrubrik

- Punktlista
- Fler punkter
```

Introbilden renderas efter sektionens Markdown-text och före ett eventuellt
galleri.

## Bilder

Bilder ska ligga i katalogen för den sektion de hör till:

```text
public/bilder/site/karin-walde/
public/bilder/site/min-konst/
public/bilder/site/cv/
```

Publicerad bildreferens i `content/site.md` ska börja med `/bilder/site/...`.

Bakgrunden är gemensam för hela projektet och pekas ut i `site.config.json`:

```json
{
  "backgroundImage": "/bilder/cropped-bakgrund-3.jpg"
}
```

## Presentation

Navigationen ligger sticky överst på sidan. Aktiv sektion markeras endast genom
att länken i navigationen visas med vit text. Det ska inte finnas någon separat
rad under navigationen som upprepar aktuell sektions namn.

Galleribilder visas stora direkt på sidan, inte som thumbnails. Bilderna ska
inte beskäras. Höga bilder begränsas med CSS så att de ryms bättre inom
viewporten även i den vanliga gallerivisningen.

Klick på en galleribild öppnar bilden i en lightbox. Lightboxen ska kunna
stängas med:

- kryss nära bildens övre högra hörn
- Escape
- klick på den mörka bakgrunden

Om JavaScript inte körs ska bildlänkarna fortfarande fungera som vanliga länkar
till bildfilen.

## Routing

Sajten byggs som en enda statisk sida på `/`. Navigationen använder ankare till
sektioner på samma sida:

```text
/#karin-walde
/#min-konst
/#cv
```

Det finns inte längre separata Astro-routes för gallerier eller sidor.
