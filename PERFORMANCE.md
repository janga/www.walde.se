# Prioriterad prestandalista

Underlag: PageSpeed Insights PDF för `https://www.walde.se/` och aktuell
implementation i repo:t. Fokus är mobile och desktop utan att lösningen ska
vara "färre bilder".

## Aktuell status

Genomfört:

- Aktiv markering i sticky-menyn påverkar inte längre layouten.
- Galleribilder får explicit `aspect-ratio` från bildmanifestet.
- Första galleribilden i första sektionen prioriteras som LCP-kandidat.
- Övriga galleribilder lazy-loadas och får `decoding="async"`.
- Galleriets `sizes` matchar mobilmarginal och desktopbredd bättre.
- Display-`srcset` begränsas till högst 1920 px, medan klicklänken går till
  största genererade WebP.
- GitHub Actions cachar `public/images/generated/` mellan deployer.

Medvetna beslut:

- CDN införs inte i nuläget.
- AVIF införs inte i nuläget.
- WebP-kvalitet ligger kvar på 82 tills en visuell jämförelse mot lägre kvalitet
  eventuellt görs.

## 1. Minska layout shift på mobil

Status: genomfört.

Lighthouse-rapporten visar hög `CLS` på mobil. Det bör åtgärdas först eftersom
det drar ned performance-betyget kraftigt även när sidan i övrigt laddar
rimligt snabbt.

Åtgärder:

- Markera aktiv länk i sticky-menyn utan att ändra layout, till exempel med
  färg, opacity eller pseudo-element i stället för tyngre fontvikt.
- Säkerställ att varje galleribild reserverar stabilt utrymme innan bilden
  laddas, helst med `aspect-ratio` baserat på bildens manifestdata.
- Kontrollera särskilt mobilradbrytning i sticky-menyn, eftersom ändrad
  aktivmarkering kan påverka radbredd och höjd.

Verifiering:

- Kör lokal build.
- Testa mobilvy i browser.
- Kör PageSpeed igen och kontrollera att `CLS` sjunker tydligt.

## 2. Prioritera första synliga bilden

Status: genomfört.

Första bilden i första sektionen är en trolig LCP-kandidat men renderas idag
som lazy-loaded bild.

Åtgärder:

- Ge första bilden i första sektionen `loading="eager"`.
- Lägg till `fetchpriority="high"` på samma bild.
- Lägg till `decoding="async"` på galleribilder.
- Behåll `loading="lazy"` för övriga bilder.

Verifiering:

- Kontrollera genererad HTML i `dist/index.html`.
- Kör PageSpeed och kontrollera `LCP discovery` och `Largest Contentful Paint`.

## 3. Begränsa bildvarianter för visning

Status: genomfört.

Sidan länkar korrekt till stora bildfiler, men själva visningsbildens fallback
`src` pekar ofta på största genererade varianten. Det gör HTML:en mindre
optimal och kan bidra till onödigt tunga bildval i vissa situationer.

Åtgärder:

- Använd största varianten endast som klicklänk.
- Använd en rimlig fallback-`src` för visning, till exempel 1080 eller 1440 px.
- Begränsa display-`srcset` till storlekar som faktiskt behövs för layouten,
  exempelvis upp till 1440 eller 1920 px.
- Gör `sizes` mer exakt, till exempel mobilbredd minus sidmarginal i stället
  för `100vw`.

Verifiering:

- Kontrollera att klick på bild fortfarande öppnar största genererade WebP.
- Kontrollera att browsern väljer rimliga bildstorlekar i DevTools Network.

## 4. Utred GitHub Pages cachebegränsning

Status: delvis åtgärdat för buildtid med GitHub Actions-cache. HTTP-cache för
besökare är kvar som GitHub Pages-begränsning eftersom CDN inte införs.

Live headers visar `cache-control: max-age=600` även för CSS och WebP-bilder.
Detta är normalt för GitHub Pages och kan ge Lighthouse-anmärkningar på cache.

Åtgärder:

- Acceptera detta om PageSpeed-betyget är tillräckligt efter övriga åtgärder.
- Om det fortfarande stör: lägg Cloudflare eller annan CDN framför GitHub
  Pages och ge genererade bilder samt Astro-assets längre cache.
- Innan mycket lång cache används bör filnamn vara innehållsversionerade eller
  på annat sätt säkert cache-brytande.

Verifiering:

- Kontrollera headers med `curl -I`.
- Kör PageSpeed och kontrollera cache-diagnostiken.

## 5. Överväg AVIF som senare steg

Status: ej planerat i nuläget.

AVIF kan minska bildstorlek, men är mer invasivt än att justera nuvarande WebP-
flöde. För konstbilder bör färg och detaljering kontrolleras visuellt.

Åtgärder:

- Lägg till AVIF-varianter i bildgeneratorn.
- Rendera `<picture>` med AVIF först och WebP som fallback.
- Behåll WebP-länk eller största WebP/AVIF beroende på vad som granskas bäst.

Verifiering:

- Jämför bildkvalitet visuellt i flera verk.
- Kontrollera filstorlekar och browserns valda format.

## 6. Överväg renderoptimering för lång enkel sida

Status: kvar som möjlig senare åtgärd om mätningar visar renderkostnad eller
DOM-storlek som faktisk flaskhals.

Sajten är en enda lång sida. Om renderkostnad eller DOM-storlek fortsätter att
pekas ut kan sektioner optimeras utan att ta bort innehåll.

Åtgärder:

- Testa `content-visibility: auto` på sektioner eller galleriblock.
- Använd `contain-intrinsic-size` försiktigt för att undvika ny layout shift.
- Verifiera att ankarlänkar och sticky-navigation fortfarande beter sig rätt.

Verifiering:

- Testa ankarnavigation i desktop och mobil.
- Kör PageSpeed och kontrollera DOM/render-diagnostik.

## Rekommenderad ordning

1. Fixera layout shift i sticky-menyn och galleriblocken.
2. Prioritera första synliga bilden.
3. Begränsa visningsbildernas `src`, `srcset` och `sizes`.
4. Kör PageSpeed igen.
5. Ta ställning till CDN/cache först om cache fortfarande är ett stort problem.
6. Överväg AVIF och `content-visibility` som andra steg.
