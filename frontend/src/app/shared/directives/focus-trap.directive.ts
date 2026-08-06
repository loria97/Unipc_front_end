import { Directive, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Contatore di lock a livello di modulo: più overlay modali possono
// esistere in pagina (drawer del carrello, pannello preferenze cookie). Solo
// il primo che si apre blocca lo scroll, solo l'ultimo che si chiude lo
// sblocca — altrimenti due overlay aperti in sequenza si "rubano" a vicenda
// lo sblocco (il secondo che chiude ripristinerebbe lo scroll mentre il
// primo è ancora aperto).
let activeLockCount = 0;
let lockedScrollY = 0;

/**
 * Trap del focus per overlay modali (drawer, dialog), estratta da
 * `CartDrawerComponent` e condivisa con il pannello preferenze cookie.
 * Applicata sull'elemento pannello (quello con `role="dialog"`), pensata
 * per essere montata/smontata insieme a lui dentro un `*ngIf` — coerente
 * con l'uso attuale in entrambi i consumer.
 *
 * Gestisce: ciclo di `Tab`/`Shift+Tab` dentro il pannello (con redirect
 * anche da elementi FUORI dal pannello, come il backdrop — per questo
 * l'ascolto è su `document`, non sul solo host), scroll lock del `body`,
 * focus iniziale su un elemento del pannello, ritorno del focus
 * all'elemento indicato in `focusTrapReturnTo` alla disattivazione.
 */
@Directive({
  selector: '[unipcFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements OnInit, OnChanges, OnDestroy {
  /**
   * Stato attivo del trap. Default `true`: l'uso previsto è come attributo
   * semplice (`unipcFocusTrap`, senza binding) su un elemento montato da un
   * `*ngIf` — in quel caso Angular non emette mai un `SimpleChanges` per un
   * `@Input` non collegato, quindi l'attivazione avviene in `ngOnInit()`.
   * Il binding esplicito (`[unipcFocusTrap]="condizione"`) resta comunque
   * supportato via `ngOnChanges()`, per un eventuale uso futuro in cui il
   * pannello resti montato e cambi solo visibilità.
   */
  @Input('unipcFocusTrap') active = true;

  /** Selettore, relativo al pannello, dell'elemento su cui spostare il focus all'attivazione. */
  @Input() focusTrapInitialFocus = '';

  /** Elemento a cui restituire il focus alla disattivazione (il trigger che ha aperto l'overlay). */
  @Input() focusTrapReturnTo: HTMLElement | null = null;

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  // Guardia di istanza: evita una doppia attivazione/disattivazione se
  // `ngOnInit()` e un `ngOnChanges()` "a vuoto" (binding esplicito già a
  // `true` al primo giro) capitassero nello stesso ciclo.
  private isLocked = false;

  ngOnInit(): void {
    if (this.active) {
      this.activate();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('active' in changes) || changes['active'].isFirstChange()) {
      // Il primo giro è già gestito da `ngOnInit()`, che gira comunque
      // prima del primo `ngOnChanges` per un `@Input` collegato.
      return;
    }
    if (this.active) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }

  // Ascolto su `document:keydown` grezzo, non sulla sintassi
  // `document:keydown.tab`: la `KeyEventsPlugin` di Angular richiede una
  // corrispondenza ESATTA dei modificatori quando si usa il suffisso sul
  // nome evento (`.tab` implica "senza Shift") — `Shift+Tab` non
  // attiverebbe mai l'handler. Verificando `event.key` a mano dentro
  // l'handler evitiamo il filtro e gestiamo entrambe le direzioni.
  //
  // Ascolto su `document`, non sul solo host: il backdrop dei due overlay
  // esistenti è un elemento FRATELLO del pannello (fuori dal suo
  // sottoalbero), quindi un `Tab` premuto lì non attraverserebbe mai un
  // `@HostListener` scoped al pannello.
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.active) {
      return;
    }
    const focusables = this.getFocusableElements();
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const panel = this.elementRef.nativeElement;
    const activeInsidePanel = active instanceof Node && panel.contains(active);

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

  private activate(): void {
    if (this.isLocked) {
      return;
    }
    this.isLocked = true;
    this.lockScroll();
    // Il pannello deve prima stabilizzarsi nel DOM (stesso pattern già in
    // uso in `cart-drawer.component.ts` e `header.component.ts`).
    setTimeout(() => {
      const target = this.focusTrapInitialFocus
        ? this.elementRef.nativeElement.querySelector<HTMLElement>(this.focusTrapInitialFocus)
        : this.getFocusableElements()[0];
      target?.focus();
    }, 0);
  }

  private deactivate(): void {
    if (!this.isLocked) {
      return;
    }
    this.isLocked = false;
    this.unlockScroll();
    this.focusTrapReturnTo?.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  private lockScroll(): void {
    activeLockCount += 1;
    if (activeLockCount > 1) {
      // Un altro overlay ha già bloccato lo scroll: nulla da fare, sarà
      // l'ultimo a chiudersi a sbloccarlo.
      return;
    }
    lockedScrollY = window.scrollY;
    const bodyStyle = document.body.style;
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${lockedScrollY}px`;
    bodyStyle.width = '100%';
  }

  private unlockScroll(): void {
    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount > 0) {
      // Un altro overlay è ancora aperto: lo sblocco vero avverrà quando
      // si chiuderà anche quello.
      return;
    }
    const bodyStyle = document.body.style;
    bodyStyle.position = '';
    bodyStyle.top = '';
    bodyStyle.width = '';
    window.scrollTo(0, lockedScrollY);
  }
}
