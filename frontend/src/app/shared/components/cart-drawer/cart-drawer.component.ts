import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';
import { CartContentComponent } from '../cart-content/cart-content.component';

let nextTitleId = 0;

/**
 * Drawer accessibile del carrello. Trap del focus, scroll lock e ritorno
 * del focus sono delegati a `FocusTrapDirective` (estratta da qui, ora
 * condivisa anche dal pannello preferenze cookie): questo componente resta
 * responsabile solo di apertura/chiusura, chiusura su navigazione ed `Esc`.
 *
 * Il backdrop è un vero `<button>` (non un `div` con `(click)`), così
 * `templateAccessibility` passa senza `eslint-disable` — a differenza degli
 * overlay di `header.component.html`, che restano invariati.
 */
@Component({
  selector: 'unipc-cart-drawer',
  standalone: true,
  imports: [NgIf, CartContentComponent, FocusTrapDirective],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  private readonly drawerService = inject(CartDrawerService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly titleId = `cart-drawer-title-${nextTitleId++}`;
  readonly isOpen = this.drawerService.isOpen;

  // Letto dal template per `[focusTrapReturnTo]`: la cattura resta fatta a
  // monte da `CartDrawerService.open()` (sincrona, prima di eventuali
  // mutazioni del DOM innescate dallo stesso click — vedi il commento lì).
  readonly trigger = this.drawerService.trigger;

  constructor() {
    // Chiusura automatica su navigazione: lo sblocco dello scroll (gestito
    // dalla direttiva, alla distruzione del pannello) deve avvenire PRIMA
    // che il router applichi il proprio `scrollPositionRestoration`,
    // altrimenti i due si combattono per la posizione di scroll.
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart && this.drawerService.isOpen()) {
        this.close();
      }
    });
  }

  close(): void {
    this.drawerService.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
