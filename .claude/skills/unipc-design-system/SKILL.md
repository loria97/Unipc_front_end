---
name: unipc-design-system
description: Design system UNIPC — token colore, tipografia, breakpoint, spaziature e pattern dei componenti. Usalo ogni volta che scrivi o modifichi SCSS, crei un componente visibile, o devi scegliere un colore, una dimensione o un comportamento responsive.
---

# Design system UNIPC

## Token

Definiti in `frontend/src/app/styles/_tokens.scss`. **Leggi sempre quel file**: questa è la sintesi, la fonte di verità è il codice.

| Token | Valore | Uso |
|---|---|---|
| `--unipc-primary` | `#123A5E` | blu accademico: header chiaro, link, bordi attivi |
| `--unipc-accent` | `#C9A227` | oro antico: CTA primaria, evidenziazioni, badge |
| `--unipc-ink` | `#0E1B2C` | blu notte: header scuro, footer, testo su fondo chiaro |

**Mai un valore esadecimale scritto a mano in un componente.** Se serve una sfumatura che non esiste, aggiungi un token, non un colore locale.

## Tipografia

- Titoli: serif
- Corpo del testo: sans-serif
- Scala tipografica fluida, mai dimensioni fisse in `px` per il testo di lettura
- Lunghezza di riga: 60-75 caratteri sui testi lunghi

## Breakpoint

```
sm  480px
md  768px
lg  1024px
xl  1280px
```

**Mobile-first**: lo stile base è quello mobile, le media query aggiungono e non tolgono. Si usano i mixin in `_mixins.scss`, non media query scritte a mano.

## Contrasto

L'oro `#C9A227` **non raggiunge 4.5:1 su fondo bianco** per il testo normale. Usalo per superfici, bordi, icone e testo grande, oppure con testo scuro sopra. Per un CTA testuale in oro verifica sempre il contrasto prima.

Il blu notte `#0E1B2C` con testo bianco passa senza problemi.

## Pattern

- **Card corso**: immagine o fascia colore, titolo serif, meta (durata, CFU, modalità), prezzo, CTA. Componente unico in `shared/components/course-card/`.
- **CTA primaria**: fondo oro, testo `--unipc-ink`.
- **CTA secondaria**: bordo blu, fondo trasparente.
- **Focus**: outline visibile sempre, mai `outline: none` senza sostituto.
- **Stati**: ogni elemento interattivo ha hover, focus, active e disabled definiti.

## Prima di creare un componente nuovo

Cerca in `shared/components/`. Se esiste qualcosa di simile, si estende con input aggiuntivi. Due card corso leggermente diverse diventano due manutenzioni divergenti.
