import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import {
  CONSENT_CATEGORY_LABELS,
  ConsentCategory,
  THIRD_PARTY_SERVICES,
  ThirdPartyService,
} from '../../../core/consent/third-party-services';
import { ConsentService } from '../../../core/services/consent.service';
import { CookiePreferencesService } from '../../../core/services/cookie-preferences.service';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';

interface CategoryGroup {
  category: ConsentCategory;
  label: string;
  services: ThirdPartyService[];
}

let nextTitleId = 0;

/**
 * Pannello di dettaglio delle preferenze cookie. `role="dialog"`,
 * `unipcFocusTrap` (condivisa con `CartDrawerComponent`). Un toggle per
 * ogni categoria configurabile del registro; `necessari` compare come riga
 * informativa bloccata (checkbox `checked disabled`), mai come toggle
 * finto.
 *
 * Le scelte non toccate `ConsentService` finché l'utente non preme
 * "Salva preferenze" (o "Accetta/Rifiuta tutti"): restano in uno stato
 * locale (`draftSignal`), reinizializzato ogni volta che il pannello si
 * apre dalle preferenze correnti.
 */
@Component({
  selector: 'unipc-cookie-preferences',
  standalone: true,
  imports: [NgIf, NgFor, FocusTrapDirective],
  templateUrl: './cookie-preferences.component.html',
  styleUrl: './cookie-preferences.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiePreferencesComponent {
  private readonly registry = inject(THIRD_PARTY_SERVICES);
  private readonly consent = inject(ConsentService);
  private readonly panel = inject(CookiePreferencesService);

  readonly titleId = `cookie-preferences-title-${nextTitleId++}`;
  readonly isOpen = this.panel.isOpen;
  readonly trigger = this.panel.trigger;
  readonly categoryLabels = CONSENT_CATEGORY_LABELS;

  readonly necessaryServices = computed(() => this.registry.filter((service) => service.category === 'necessari'));

  readonly configurableGroups = computed<CategoryGroup[]>(() =>
    this.consent.configurableCategories().map((category) => ({
      category,
      label: CONSENT_CATEGORY_LABELS[category],
      services: this.registry.filter((service) => service.category === category),
    })),
  );

  private readonly draftSignal = signal<Record<ConsentCategory, boolean>>(this.consent.preferences());

  constructor() {
    // Riallinea la bozza locale alle preferenze correnti ogni volta che il
    // pannello si apre: riaprirlo non deve mostrare scelte di una sessione
    // precedente mai salvate (es. toggle spuntato e poi chiuso con Esc).
    effect(() => {
      if (this.isOpen()) {
        this.draftSignal.set(this.consent.preferences());
      }
    });
  }

  isChecked(category: ConsentCategory): boolean {
    return this.draftSignal()[category];
  }

  onToggleChange(category: ConsentCategory, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.draftSignal.update((prev) => ({ ...prev, [category]: target.checked }));
    }
  }

  acceptAll(): void {
    this.consent.acceptAll();
    this.close();
  }

  rejectAll(): void {
    this.consent.rejectAll();
    this.close();
  }

  savePreferences(): void {
    this.consent.save(this.draftSignal());
    this.close();
  }

  close(): void {
    this.panel.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      // Esc chiude equivalendo a un rifiuto: stesso record prodotto dalla X
      // del banner, nessuna via di chiusura "silenziosa" che lasci lo stato
      // ambiguo.
      this.rejectAll();
    }
  }
}
