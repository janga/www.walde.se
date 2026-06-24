# Redigera vanliga sidor

Den här katalogen innehåller Markdownfiler för vanliga sidor. Gallerier hanteras separat i `content/galleries/`.

## Koppling mellan fil och webbadress

Filnamnet bestämmer sidans adress:

- `home.md` → `/`
- `cv.md` → `/cv/`
- `utstallningar.md` → `/utstallningar/`
- `objekt.md` → `/objekt/`

Använd gemener, ASCII-tecken och bindestreck i filnamn. Använd inte mellanslag eller å, ä och ö.

## Sidans metadata

Varje fil börjar med frontmatter:

```md
---
title: Sidans titel
description: En kort beskrivning för sökmotorer och delningar.
---
```

`title` och `description` är obligatoriska.

Exempel:

```md
---
title: CV
description: Karin Waldes utbildning, utställningar och offentliga verk.
---
```

## Text och rubriker

Sidans huvudrubrik skapas automatiskt från `title`. Börja därför inte innehållet med en ny huvudrubrik.

Använd underrubriker från nivå tre:

```md
### Utbildning
```

Använd tom rad mellan stycken:

```md
Första stycket.

Andra stycket.
```

Använd listor när innehållet är en uppräkning:

```md
- Första punkten
- Andra punkten
- Tredje punkten
```

Numrerade listor skrivs så här:

```md
1. Första steget
2. Andra steget
3. Tredje steget
```

## Länkar

Intern länk:

```md
[Se CV](/cv/)
```

Extern länk:

```md
[Täby kommun](https://www.taby.se/)
```

Använd beskrivande länktext. Undvik texter som ”klicka här”.

## Radbrytningar

Använd i första hand separata stycken eller listor.

Om en radbrytning måste ske utan nytt stycke avslutas raden med två mellanslag:

```md
Första raden.  
Andra raden.
```

## Meny och publicering

En Markdownfil skapar en statisk webbadress, men den läggs inte automatiskt i huvudmenyn. Menyn styrs av `site.config.json`.

Fältet `hidden: true` dokumenterar att en sida inte ska synas i menyn, men förhindrar inte att sidan byggs eller kan besökas direkt. Det är alltså inte ett utkastläge.

## Skapa en ny sida

1. Skapa `content/pages/<slug>.md`.
2. Lägg till `title` och `description`.
3. Skriv sidans innehåll.
4. Lägg till sidan i `site.config.json` om den ska visas i huvudmenyn.
5. Kör `npm run build`.

Byggningen ska slutföras utan fel innan ändringarna publiceras.

## Avgränsning

Lägg inte galleriinformation eller galleriers masterbilder här. Följ instruktionerna i `content/galleries/README.md` för sådant material.
