import { Injectable, signal } from '@angular/core';

/**
 * Stato UI puro del drawer del carrello: separato da `CartService` (dati) e
 * da qualunque manipolazione del DOM (quella vive esclusivamente in
 * `CartDrawerComponent`). È il canale che permette a header, dettaglio
 * corso e drawer di parlarsi senza che un componente tocchi il DOM di un
 * altro.
 */
@Injectable({ providedIn: 'root' })
export class CartDrawerService {
  private readonly openSignal = signal(false);
  private readonly triggerSignal = signal<HTMLElement | null>(null);

  readonly isOpen = this.openSignal.asReadonly();

  /**
   * Elemento che aveva il focus quando `open()` è stato chiamato, catturato
   * qui in modo sincrono — non nell'`effect()` di `CartDrawerComponent`,
   * che gira dopo eventuali mutazioni del DOM innescate dallo stesso click
   * (es. chiusura del menu mobile, sparizione del bottone "Aggiungi al
   * carrello" quando `isInCart()` diventa vero). Catturare tardi rischia di
   * restituire un elemento già rimosso dal DOM invece del trigger reale.
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
