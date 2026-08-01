---
name: accessibilita-wcag
description: Requisiti di accessibilità WCAG 2.1 AA per UNIPC — form, stepper, modali, upload, contrasto, focus, screen reader. Usalo quando crei o modifichi qualsiasi interfaccia, in particolare form, checkout multi-step e componenti di upload.
---

# Accessibilità — WCAG 2.1 AA

Un ateneo ha un obbligo sostanziale su questo, non solo formale. Ogni pagina nuova nasce accessibile, non viene sistemata dopo.

## Base

- Un solo `h1` per pagina, gerarchia di heading senza salti
- HTML semantico prima di ARIA: `button` per le azioni, `a` per la navigazione, `nav`, `main`, `footer`
- Skip link verso il contenuto principale
- Lingua dichiarata sull'elemento `html`
- Focus sempre visibile: mai `outline: none` senza un sostituto evidente

## Form

- Ogni input ha una `label` reale associata. Il placeholder **non** è una label
- Campi obbligatori indicati nel testo, non solo con un asterisco colorato
- Errori: `aria-invalid="true"`, messaggio collegato con `aria-describedby`, annuncio con `aria-live="polite"`
- Al submit fallito: riepilogo degli errori in cima con link ai campi, e focus sul primo campo invalido
- `autocomplete` corretto: `email`, `current-password`, `new-password`, `tel`, `postal-code`, `street-address`
- Validazione al blur, non a ogni carattere

## Stepper del checkout

- Lista semantica `<ol>` con gli step
- `aria-current="step"` sullo step attivo
- Al cambio di step, focus sul titolo del nuovo step
- Lo stato di avanzamento è comprensibile anche senza colore

## Upload

- Input file **nativo** sempre presente, anche quando c'è il drag&drop
- Stato di caricamento annunciato con `aria-live`
- Errori di formato o dimensione dichiarati in testo, non solo con un bordo rosso
- Nome del file caricato leggibile da screen reader

## Modali e drawer

- Focus intrappolato all'interno finché sono aperti
- Chiusura con `Esc`
- Focus restituito all'elemento che li ha aperti
- `role="dialog"` e `aria-labelledby`

## Contrasto

- Testo normale 4.5:1, testo grande e componenti 3:1
- **Attenzione all'oro `#C9A227`**: su fondo bianco non passa per il testo normale. Usalo per superfici, bordi e icone, o con testo scuro sopra
- Nessuna informazione veicolata dal solo colore

## Touch e zoom

- Area cliccabile minima 44x44 px
- Testo ridimensionabile al 200% senza perdita di contenuto o scroll orizzontale
- Nessun `user-scalable=no`

## Verifica

Il controllo automatico (axe, Lighthouse) intercetta forse metà dei problemi. Navigazione da sola tastiera e prova con screen reader restano necessarie sui flussi critici: registrazione, checkout, upload.
