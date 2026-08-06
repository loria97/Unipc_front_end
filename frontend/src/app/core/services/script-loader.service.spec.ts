import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import type { ConsentCategory, ThirdPartyService } from '../consent/third-party-services';
import { THIRD_PARTY_SERVICES } from '../consent/third-party-services';
import { ConsentService } from './consent.service';
import { ScriptLoaderService } from './script-loader.service';

/**
 * Doppio minimale di `ConsentService`: `hasConsent()` legge da un signal,
 * non da un campo semplice, perché l'`effect()` di `ScriptLoaderService`
 * deve poter tracciarne le letture e ri-eseguirsi quando il consenso
 * cambia (un campo mutato senza passare da un signal non ri-attiverebbe
 * l'effetto).
 */
class FakeConsentService {
  private readonly grantedSignal = signal<ReadonlySet<ConsentCategory>>(new Set());

  grant(category: ConsentCategory): void {
    this.grantedSignal.set(new Set([...this.grantedSignal(), category]));
  }

  hasConsent(category: ConsentCategory): boolean {
    return category === 'necessari' || this.grantedSignal().has(category);
  }
}

const FAKE_SERVICE: ThirdPartyService = {
  id: 'servizio-demo',
  name: 'Servizio Demo',
  provider: 'Demo Inc.',
  category: 'preferenze',
  purpose: 'Test',
  cookies: [],
  scriptUrl: 'https://example.com/style.css',
  resourceKind: 'stylesheet',
  preconnectUrls: ['https://example.com'],
  hotRemovable: true,
};

const NON_HOT_REMOVABLE_SERVICE: ThirdPartyService = {
  ...FAKE_SERVICE,
  id: 'servizio-fisso',
  scriptUrl: 'https://example.com/fisso.css',
  hotRemovable: false,
};

function setup(services: ThirdPartyService[]): { loader: ScriptLoaderService; consent: FakeConsentService } {
  const consent = new FakeConsentService();
  TestBed.configureTestingModule({
    providers: [
      ScriptLoaderService,
      { provide: ConsentService, useValue: consent },
      { provide: THIRD_PARTY_SERVICES, useValue: services },
    ],
  });
  const loader = TestBed.inject(ScriptLoaderService);
  return { loader, consent };
}

function removeInjected(href: string): void {
  document.querySelectorAll(`link[href="${href}"]`).forEach((el) => el.remove());
  document.querySelectorAll('link[rel="preconnect"][href="https://example.com"]').forEach((el) => el.remove());
}

describe('ScriptLoaderService', () => {
  afterEach(() => {
    removeInjected(FAKE_SERVICE.scriptUrl as string);
    removeInjected(NON_HOT_REMOVABLE_SERVICE.scriptUrl as string);
  });

  it('non carica nulla senza consenso', fakeAsync(() => {
    const { loader } = setup([FAKE_SERVICE]);
    tick();

    expect(document.querySelector(`link[href="${FAKE_SERVICE.scriptUrl}"]`)).toBeNull();
    expect(loader.load(FAKE_SERVICE.id)).toBeFalse();
  }));

  it('carica la risorsa (e il preconnect) dopo il consenso', fakeAsync(() => {
    const { consent } = setup([FAKE_SERVICE]);
    consent.grant('preferenze');
    tick();

    expect(document.querySelector(`link[href="${FAKE_SERVICE.scriptUrl}"]`)).not.toBeNull();
    expect(document.querySelector('link[rel="preconnect"][href="https://example.com"]')).not.toBeNull();
  }));

  it('è idempotente: chiamate ripetute a load() non producono tag doppi', fakeAsync(() => {
    const { loader, consent } = setup([FAKE_SERVICE]);
    consent.grant('preferenze');
    tick();

    loader.load(FAKE_SERVICE.id);
    loader.load(FAKE_SERVICE.id);

    expect(document.querySelectorAll(`link[href="${FAKE_SERVICE.scriptUrl}"]`).length).toBe(1);
  }));

  it('unload() rimuove gli elementi di un servizio hotRemovable', fakeAsync(() => {
    const { loader, consent } = setup([FAKE_SERVICE]);
    consent.grant('preferenze');
    tick();
    expect(document.querySelector(`link[href="${FAKE_SERVICE.scriptUrl}"]`)).not.toBeNull();

    const result = loader.unload(FAKE_SERVICE.id);

    expect(result).toBeTrue();
    expect(document.querySelector(`link[href="${FAKE_SERVICE.scriptUrl}"]`)).toBeNull();
  }));

  it('unload() restituisce false per un servizio non hotRemovable e non rimuove nulla', fakeAsync(() => {
    const { loader, consent } = setup([NON_HOT_REMOVABLE_SERVICE]);
    consent.grant('preferenze');
    tick();
    expect(document.querySelector(`link[href="${NON_HOT_REMOVABLE_SERVICE.scriptUrl}"]`)).not.toBeNull();

    const result = loader.unload(NON_HOT_REMOVABLE_SERVICE.id);

    expect(result).toBeFalse();
    expect(document.querySelector(`link[href="${NON_HOT_REMOVABLE_SERVICE.scriptUrl}"]`)).not.toBeNull();
  }));
});
