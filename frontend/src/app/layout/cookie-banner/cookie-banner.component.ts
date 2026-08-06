import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentService } from '../../core/services/consent.service';
import { CookiePreferencesService } from '../../core/services/cookie-preferences.service';

/**
 * Banner di consenso cookie. `role="region"`, non un dialog: non
 * intrappola il focus e non blocca la lettura della pagina agli screen
 * reader né l'indicizzazione. Visibile solo perché il registro dichiara
 * almeno una categoria configurabile (oggi: `preferenze`, per Google
 * Fonts) — vedi `ConsentService.shouldShowBanner`.
 *
 * Montato come primo figlio del wrapper in `AppComponent`, prima
 * dell'header: fisso in basso visivamente, ma primo blocco interattivo
 * nell'ordine di tabulazione.
 */
@Component({
  selector: 'unipc-cookie-banner',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieBannerComponent implements OnDestroy {
  private readonly consent = inject(ConsentService);
  private readonly preferencesPanel = inject(CookiePreferencesService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly isVisible = this.consent.shouldShowBanner;

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Nessun layout shift: il consenso si legge in modo sincrono nel
    // costruttore di `ConsentService`, quindi il banner è già presente al
    // primo render. Perché non copra contenuto, un `ResizeObserver` scrive
    // l'altezza reale del banner (fisso, quindi "fuori flusso") in una
    // variabile CSS che `AppComponent` usa come `padding-bottom` del
    // wrapper: lo spazio esiste dal primo paint e si adatta quando il
    // testo va a capo ai vari breakpoint.
    effect(() => {
      if (this.isVisible()) {
        setTimeout(() => this.observeBanner(), 0);
      } else {
        this.stopObserving();
        document.documentElement.style.setProperty('--cookie-banner-space', '0px');
      }
    });
  }

  ngOnDestroy(): void {
    this.stopObserving();
    document.documentElement.style.setProperty('--cookie-banner-space', '0px');
  }

  acceptAll(): void {
    this.consent.acceptAll();
  }

  rejectAll(): void {
    this.consent.rejectAll();
  }

  openPreferences(): void {
    this.preferencesPanel.open();
  }

  private observeBanner(): void {
    const banner = this.elementRef.nativeElement.querySelector<HTMLElement>('.cookie-banner');
    if (!banner) {
      return;
    }
    this.stopObserving();
    this.resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      document.documentElement.style.setProperty('--cookie-banner-space', `${height}px`);
    });
    this.resizeObserver.observe(banner);
  }

  private stopObserving(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
