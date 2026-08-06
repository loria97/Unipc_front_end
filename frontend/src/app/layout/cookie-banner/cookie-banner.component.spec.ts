import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONSENT_STORAGE_KEY } from '../../core/consent/consent-storage';
import { THIRD_PARTY_SERVICES, ThirdPartyService } from '../../core/consent/third-party-services';
import { CookieBannerComponent } from './cookie-banner.component';

const ONLY_NECESSARY: readonly ThirdPartyService[] = [
  { id: 'necessario-demo', name: 'Necessario Demo', provider: 'UNIPC', category: 'necessari', purpose: 'Test', cookies: [] },
];

const WITH_PREFERENZE: readonly ThirdPartyService[] = [
  ...ONLY_NECESSARY,
  { id: 'preferenze-demo', name: 'Preferenze Demo', provider: 'Demo Inc.', category: 'preferenze', purpose: 'Test', cookies: [] },
];

function createFixture(registry: readonly ThirdPartyService[]): ComponentFixture<CookieBannerComponent> {
  TestBed.configureTestingModule({
    imports: [CookieBannerComponent],
    providers: [provideRouter([]), { provide: THIRD_PARTY_SERVICES, useValue: registry }],
  });
  return TestBed.createComponent(CookieBannerComponent);
}

describe('CookieBannerComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    document.documentElement.style.removeProperty('--cookie-banner-space');
  });

  it('è visibile quando il registro contiene almeno una categoria configurabile (nessuna scelta ancora salvata)', () => {
    const fixture = createFixture(WITH_PREFERENZE);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cookie-banner')).not.toBeNull();
  });

  it('non è visibile quando il registro contiene solo servizi necessari', () => {
    const fixture = createFixture(ONLY_NECESSARY);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cookie-banner')).toBeNull();
  });

  it('le tre azioni ("Accetta tutti", "Rifiuta tutti", "Personalizza") condividono la stessa classe', () => {
    const fixture = createFixture(WITH_PREFERENZE);

    fixture.detectChanges();

    const actions: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.cookie-banner__action');
    expect(actions.length).toBe(3);
    const labels = Array.from(actions).map((btn) => btn.textContent?.trim());
    expect(labels).toEqual(['Accetta tutti', 'Rifiuta tutti', 'Personalizza']);
  });

  it('"Rifiuta tutti" nasconde il banner', () => {
    const fixture = createFixture(WITH_PREFERENZE);
    fixture.detectChanges();

    const rejectButton: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.cookie-banner__action')[1];
    rejectButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cookie-banner')).toBeNull();
  });
});
