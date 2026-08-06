import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CONSENT_STORAGE_KEY } from '../consent/consent-storage';
import { THIRD_PARTY_SERVICES, ThirdPartyService } from '../consent/third-party-services';
import { ConsentService } from './consent.service';

const FAKE_REGISTRY: readonly ThirdPartyService[] = [
  {
    id: 'necessario-demo',
    name: 'Servizio necessario demo',
    provider: 'UNIPC',
    category: 'necessari',
    purpose: 'Test',
    cookies: [{ name: 'necessario-key', storage: 'localStorage', duration: 'sessione', purpose: 'Test' }],
  },
  {
    id: 'preferenze-demo',
    name: 'Servizio preferenze demo',
    provider: 'Demo Inc.',
    category: 'preferenze',
    purpose: 'Test',
    cookies: [
      { name: 'preferenze-cookie', storage: 'cookie', duration: '1 anno', purpose: 'Test' },
      { name: 'preferenze-key', storage: 'localStorage', duration: '1 anno', purpose: 'Test' },
    ],
    scriptUrl: 'https://example.com/demo.css',
    resourceKind: 'stylesheet',
    hotRemovable: true,
  },
];

function setup(registry: readonly ThirdPartyService[] = FAKE_REGISTRY): ConsentService {
  TestBed.configureTestingModule({
    providers: [ConsentService, { provide: THIRD_PARTY_SERVICES, useValue: registry }],
  });
  return TestBed.inject(ConsentService);
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

describe('ConsentService', () => {
  beforeEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    localStorage.removeItem('preferenze-key');
    localStorage.removeItem('necessario-key');
    clearCookie('preferenze-cookie');
  });

  afterEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    localStorage.removeItem('preferenze-key');
    localStorage.removeItem('necessario-key');
    clearCookie('preferenze-cookie');
  });

  it('nessuna scelta salvata: il banner compare e nessuna categoria opzionale è concessa', () => {
    const service = setup();

    expect(service.shouldShowBanner()).toBeTrue();
    expect(service.hasConsent('preferenze')).toBeFalse();
    expect(service.hasConsent('necessari')).toBeTrue();
  });

  it('acceptAll() concede tutte le categorie configurabili e nasconde il banner', () => {
    const service = setup();

    service.acceptAll();

    expect(service.hasConsent('preferenze')).toBeTrue();
    expect(service.shouldShowBanner()).toBeFalse();
  });

  it('rejectAll() nega tutte le categorie opzionali', () => {
    const service = setup();
    service.acceptAll();

    service.rejectAll();

    expect(service.hasConsent('preferenze')).toBeFalse();
    expect(service.shouldShowBanner()).toBeFalse();
  });

  it('save() concede solo le categorie granularmente indicate', () => {
    const service = setup();

    service.save({ preferenze: true });

    expect(service.hasConsent('preferenze')).toBeTrue();
  });

  it('"necessari" è sempre vera e non disattivabile, anche forzando il contrario in save()', () => {
    const service = setup();

    service.save({ necessari: false, preferenze: false });

    expect(service.hasConsent('necessari')).toBeTrue();
    expect(service.preferences().necessari).toBeTrue();
  });

  it('il banner non ricompare dopo un rifiuto, nemmeno ricreando il servizio (come dopo un refresh)', () => {
    const service = setup();
    service.rejectAll();
    expect(service.shouldShowBanner()).toBeFalse();

    TestBed.resetTestingModule();
    const service2 = setup();

    expect(service2.shouldShowBanner()).toBeFalse();
  });

  it('con storage.getItem che lancia, il consenso parte assente senza eccezioni e il banner compare', () => {
    spyOn(localStorage, 'getItem').and.throwError('storage non disponibile');

    expect(() => setup()).not.toThrow();
    expect(TestBed.inject(ConsentService).shouldShowBanner()).toBeTrue();
  });

  it('con storage.setItem che lancia, acceptAll() non solleva eccezioni e resta valido in memoria', () => {
    const service = setup();
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

    expect(() => service.acceptAll()).not.toThrow();
    expect(service.hasConsent('preferenze')).toBeTrue();
  });

  it('revoke() cancella davvero cookie e chiavi della categoria revocata, ma non quelle necessarie', () => {
    const service = setup();
    service.acceptAll();
    localStorage.setItem('preferenze-key', '1');
    document.cookie = 'preferenze-cookie=1; path=/';
    localStorage.setItem('necessario-key', '1');

    service.revoke(['preferenze']);

    expect(localStorage.getItem('preferenze-key')).toBeNull();
    expect(document.cookie).not.toContain('preferenze-cookie=1');
    expect(localStorage.getItem('necessario-key')).toBe('1');
  });

  it('save() che disattiva una categoria prima concessa la revoca automaticamente (cancella lo storage associato)', () => {
    const service = setup();
    service.save({ preferenze: true });
    localStorage.setItem('preferenze-key', '1');

    service.save({ preferenze: false });

    expect(localStorage.getItem('preferenze-key')).toBeNull();
    expect(service.hasConsent('preferenze')).toBeFalse();
  });

  it('revoke() di una categoria con un servizio non hotRemovable ricarica la pagina', () => {
    const registryWithFixedService: ThirdPartyService[] = [
      ...FAKE_REGISTRY,
      {
        id: 'statistiche-demo',
        name: 'Servizio statistiche demo',
        provider: 'Demo Inc.',
        category: 'statistiche',
        purpose: 'Test',
        cookies: [{ name: 'statistiche-key', storage: 'localStorage', duration: '1 anno', purpose: 'Test' }],
        hotRemovable: false,
      },
    ];
    const service = setup(registryWithFixedService);
    service.acceptAll();
    const reloadSpy = jasmine.createSpy('reloadPage');
    (service as unknown as { reloadPage: () => void }).reloadPage = reloadSpy;

    service.revoke(['statistiche']);

    expect(reloadSpy).toHaveBeenCalled();
    localStorage.removeItem('statistiche-key');
  });

  it('revoke() di una categoria hotRemovable non ricarica la pagina', () => {
    const service = setup();
    service.acceptAll();
    const reloadSpy = jasmine.createSpy('reloadPage');
    (service as unknown as { reloadPage: () => void }).reloadPage = reloadSpy;

    service.revoke(['preferenze']);

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('revoke() senza argomenti azzera anche il record: il banner ricompare', () => {
    const service = setup();
    service.acceptAll();

    service.revoke();

    expect(service.shouldShowBanner()).toBeTrue();
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it('configurableCategories() riflette il registro iniettato: nessun servizio non-necessario -> nessuna categoria configurabile', () => {
    const onlyNecessary: ThirdPartyService[] = FAKE_REGISTRY.filter((s) => s.category === 'necessari');
    const service = setup(onlyNecessary);

    expect(service.configurableCategories()).toEqual([]);
    expect(service.shouldShowBanner()).toBeFalse();
  });

  // Firma dei test invariata al variare del tipo di stato interno: usare
  // `signal` qui serve solo a dimostrare che `preferences()` è un vero
  // signal leggibile ripetutamente, non un valore calcolato una tantum.
  it('preferences() è un signal che riflette lo stato corrente ad ogni lettura', () => {
    const service = setup();
    const snapshot = signal(service.preferences());

    expect(snapshot().preferenze).toBeFalse();
    service.acceptAll();
    snapshot.set(service.preferences());
    expect(snapshot().preferenze).toBeTrue();
  });
});
