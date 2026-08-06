import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CONSENT_CATEGORY_LABELS, THIRD_PARTY_SERVICES } from '../../../core/consent/third-party-services';
import { ConsentService } from '../../../core/services/consent.service';
import { CookiePreferencesService } from '../../../core/services/cookie-preferences.service';

/**
 * Segnaposto per contenuti che dipendono da un servizio di terze parti non
 * ancora consentito (es. un embed futuro: mappa, video). Oggi nessun
 * componente lo usa — nessun embed esiste nel catalogo — ma resta pronto:
 * aggiungere domani una mappa richiederà solo di avvolgerla in
 * `<unipc-consent-gate serviceId="...">`.
 */
@Component({
  selector: 'unipc-consent-gate',
  standalone: true,
  imports: [NgIf],
  templateUrl: './consent-gate.component.html',
  styleUrl: './consent-gate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentGateComponent {
  @Input() serviceId = '';

  private readonly registry = inject(THIRD_PARTY_SERVICES);
  private readonly consent = inject(ConsentService);
  private readonly preferencesPanel = inject(CookiePreferencesService);

  readonly categoryLabels = CONSENT_CATEGORY_LABELS;

  readonly service = computed(() => this.registry.find((candidate) => candidate.id === this.serviceId) ?? null);

  // Sblocco puntuale, locale a QUESTA istanza: non tocca `ConsentService`,
  // non concede il consenso alla categoria, non viene persistito. Riaprire
  // la pagina richiede di premere di nuovo "Carica contenuto".
  private readonly unlockedSignal = signal(false);

  readonly canShow = computed(() => {
    const service = this.service();
    if (!service) {
      return false;
    }
    return this.consent.hasConsent(service.category) || this.unlockedSignal();
  });

  unlock(): void {
    this.unlockedSignal.set(true);
  }

  openPreferences(): void {
    this.preferencesPanel.open();
  }
}
