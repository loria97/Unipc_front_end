import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { CartContentComponent } from '../cart-content/cart-content.component';

let nextTitleId = 0;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Drawer accessibile del carrello. Nessun `@angular/cdk` disponibile:
 * focus trap, scroll lock e chiusura su navigazione sono scritti a mano.
 *
 * Il backdrop è un vero `<button>` (non un `div` con `(click)`), così
 * `templateAccessibility` passa senza `eslint-disable` — a differenza degli
 * overlay di `header.component.html`, che restano invariati.
 */
@Component({
  selector: 'unipc-cart-drawer',
  standalone: true,
  imports: [NgIf, CartContentComponent],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  private readonly drawerService = inject(CartDrawerService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly titleId = `cart-drawer-title-${nextTitleId++}`;
  readonly isOpen = this.drawerService.isOpen;

  private lastFocusedElement: HTMLElement | null = null;
  private scrollY = 0;

  constructor() {
    // Chiusura automatica su navigazione: lo sblocco dello scroll deve
    // avvenire PRIMA che il router applichi il proprio
    // `scrollPositionRestoration` (su `NavigationEnd`), altrimenti i due si
    // combattono per la posizione di scroll.
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart && this.drawerService.isOpen()) {
        this.close();
      }
    });

    // Reagisce all'apertura/chiusura pilotata da `CartDrawerService`
    // (bottone nell'header, CTA nel dettaglio corso...): apre/chiude non è
    // mai chiamato direttamente da questo componente.
    effect(() => {
      if (this.isOpen()) {
        this.handleOpen();
      } else {
        this.handleClose();
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

  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const focusables = this.getFocusableElements();
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const panel = this.getPanel();
    const activeInsidePanel = !!panel && active instanceof Node && panel.contains(active);

    if (event.shiftKey) {
      if (!activeInsidePanel || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (!activeInsidePanel || active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  // Traccia se lo scroll è attualmente bloccato: evita che la prima
  // esecuzione dell'`effect()` (che parte subito con `isOpen() === false`)
  // esegua `unlockScroll()`/`window.scrollTo()` a vuoto all'avvio dell'app.
  private isLocked = false;

  private handleOpen(): void {
    if (this.isLocked) {
      return;
    }
    this.isLocked = true;
    this.lastFocusedElement = this.drawerService.trigger();
    this.lockScroll();
    // Il pannello deve prima montarsi nel DOM (stesso pattern di
    // `HeaderComponent.openSearch()`).
    setTimeout(() => {
      this.getPanel()?.querySelector<HTMLButtonElement>('.drawer__close')?.focus();
    }, 0);
  }

  private handleClose(): void {
    if (!this.isLocked) {
      return;
    }
    this.isLocked = false;
    this.unlockScroll();
    this.lastFocusedElement?.focus();
    this.lastFocusedElement = null;
  }

  private getPanel(): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector<HTMLElement>('.drawer__panel');
  }

  private getFocusableElements(): HTMLElement[] {
    const panel = this.getPanel();
    if (!panel) {
      return [];
    }
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  private lockScroll(): void {
    this.scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${this.scrollY}px`;
    bodyStyle.width = '100%';
  }

  private unlockScroll(): void {
    const bodyStyle = document.body.style;
    bodyStyle.position = '';
    bodyStyle.top = '';
    bodyStyle.width = '';
    window.scrollTo(0, this.scrollY);
  }
}
