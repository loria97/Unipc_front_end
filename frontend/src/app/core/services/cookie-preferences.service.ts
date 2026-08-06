import { Injectable, signal } from '@angular/core';

/**
 * Stato UI puro del pannello preferenze cookie: separato da `ConsentService`
 * (dati) e da qualunque manipolazione del DOM (quella vive esclusivamente
 * in `CookiePreferencesComponent`). Stesso ruolo di `CartDrawerService`
 * rispetto a `CartService`/`CartDrawerComponent`: è il canale che permette
 * a banner, footer e consent-gate di aprire il pannello senza toccare il
 * DOM di un altro componente.
 */
@Injectable({ providedIn: 'root' })
export class CookiePreferencesService {
  private readonly openSignal = signal(false);
  private readonly triggerSignal = signal<HTMLElement | null>(null);

  readonly isOpen = this.openSignal.asReadonly();

  /**
   * Elemento che aveva il focus quando `open()` è stato chiamato, catturato
   * qui in modo sincrono — non nell'effetto/costruttore del componente del
   * pannello, che gira dopo eventuali mutazioni del DOM innescate dallo
   * stesso click. Stessa ragione documentata in `cart-drawer.service.ts`.
   */
  readonly trigger = this.triggerSignal.asReadonly();

  open(): void {
    this.triggerSignal.set(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    this.openSignal.set(true);
  }

  close(): void {
    this.openSignal.set(false);
  }
}
