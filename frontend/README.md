# UNIPC — Sito (Angular 17)

Porting in **Angular 17 (standalone components)** del sito UNIPC — Università Presila Crotonese.

## Requisiti
- Node.js 18.19+ o 20+
- npm 9+

## Avvio in locale
```bash
npm install
npm start
```
Poi apri http://localhost:4200

## Build di produzione
```bash
npm run build
```
Output in `dist/unipc/`.

## Struttura
```
src/
  index.html            # font Google + <app-root>
  main.ts               # bootstrap standalone
  styles.css            # design token (:root), reset, keyframes
  assets/
    brand/              # logo (png/svg)
    images/             # foto hero / studenti
    docs/               # PDF di esempio scaricabili (Avvisi & News)
  app/
    app.component.ts    # layout: header + home + footer
    directives/
      hover.directive.ts  # [appHover] — applica gli stili :hover inline
    components/
      ui-logo/          # logo riutilizzabile (variant full/white/mark)
      header/           # header: mega-menu desktop, drawer mobile, ricerca
      footer/           # footer
    pages/
      home/             # home page (tutte le sezioni + carosello avvisi)
```

## Note tecniche
- **Componenti standalone**: nessun `NgModule`; il bootstrap è in `main.ts`.
- **Stili inline**: la grafica usa `style="..."` sugli elementi; gli effetti
  hover sono gestiti dalla direttiva `[appHover]` (nessun foglio di stile per
  componente).
- **Design token** in `src/styles.css` sotto `:root` (colori, ombre, font).
- **Reveal on scroll** e **contatori animati** via `IntersectionObserver`
  (rispettano `prefers-reduced-motion`).
- **Avvisi & News**: carosello con scroll-snap; i pulsanti ‹ › scorrono le card.
  I PDF sono file di esempio in `src/assets/docs/`.
- Font **Fraunces** + **Plus Jakarta Sans** caricati da Google Fonts in `index.html`.
