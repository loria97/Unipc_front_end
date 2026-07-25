# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Angular 17 (standalone components, no NgModules) port of the UNIPC (Università Presila Crotonese)
marketing website. Single-page app: header + home + footer, no routing, no backend — all content is
hardcoded in component classes.

## Commands

```bash
npm install       # install deps
npm start          # ng serve, dev server at http://localhost:4200
npm run build       # production build → dist/unipc/
npm run watch       # dev build with --watch
```

There are no tests and no linter configured in this repo (no test runner, no ESLint/TSLint config).

## Architecture

- **Bootstrap**: `src/main.ts` calls `bootstrapApplication(AppComponent)` — no `AppModule`. Every
  component is `standalone: true` and lists its own `imports` (e.g. `NgFor`, `NgIf`, `HoverDirective`).
- **Layout**: `app.component.ts` composes `<app-header>`, `<app-home>`, `<app-footer>` — there is no router.
- **Structure**:
  - `src/app/components/` — reusable pieces: `header/` (mega-menu desktop nav + mobile drawer + search
    overlay), `footer/`, `ui-logo/` (logo with `variant` full/white/mark and `size` sm/md/lg inputs).
  - `src/app/pages/home/` — the entire home page; all page content (hero stats, news items, course
    catalog, testimonials, office locations, etc.) lives as typed arrays/objects directly on
    `HomeComponent` (see `home.component.ts`), rendered by `home.component.html`.
  - `src/app/directives/hover.directive.ts` — `[appHover]` custom directive.
  - `src/assets/` — `brand/` (logo files), `images/`, `docs/` (sample PDFs linked from the news section).

### Styling convention (important, non-standard)

This project deliberately does **not** use per-component stylesheets or CSS classes for most visual
styling:

- All visual styling is written as **inline `style="..."` attributes** directly in the component
  templates (`*.component.html`).
- Design tokens (colors, shadows, fonts, easing) are CSS custom properties defined once in
  `src/styles.css` under `:root` (e.g. `--unipc-primary`, `--unipc-accent`, `--font-serif`,
  `--shadow-md`) and referenced from inline styles via `var(--unipc-*)`.
- **Hover states** can't be done with inline styles, so they go through the `HoverDirective`:
  `[appHover]="'background:#b8931f;transform:translateY(-1px);'"` — a string of CSS declarations
  applied on `mouseenter` and reverted on `mouseleave`.
- Global concerns (resets, `:focus-visible`, `::selection`, keyframes, the `[data-reveal]` base
  state) live in `src/styles.css`; everything else is inline.

When editing templates, follow this pattern rather than introducing component `styleUrls`/CSS
classes, to stay consistent with the rest of the codebase.

### Interaction patterns used in `HomeComponent` and `HeaderComponent`

- **Reveal-on-scroll**: elements marked `data-reveal` in templates are faded/translated in via an
  `IntersectionObserver` set up in `ngAfterViewInit` (`home.component.ts`), respecting
  `prefers-reduced-motion`.
- **Animated counters**: the "numbers" stat section animates from 0 to target once its container
  intersects the viewport (`runCounters`, cubic ease-out over 1.3s).
- **News carousel**: scroll-snap track scrolled programmatically via `scrollBy` in `newsPrev`/`newsNext`.
- **Header**: desktop vs. mobile behavior is driven by a `matchMedia('(min-width: 1180px)')` listener
  (`desktop` flag), not CSS media queries alone — mega-menu (desktop) and accordion drawer (mobile)
  are separate code paths reading the same `nav` data array.

All observers/listeners registered in `ngAfterViewInit` are torn down in `ngOnDestroy` — keep this
symmetry when adding new ones.
