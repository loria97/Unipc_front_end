import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONSENT_STORAGE_KEY } from '../../../core/consent/consent-storage';
import { THIRD_PARTY_SERVICES, ThirdPartyService } from '../../../core/consent/third-party-services';
import { ConsentService } from '../../../core/services/consent.service';
import { CookiePreferencesService } from '../../../core/services/cookie-preferences.service';
import { ConsentGateComponent } from './consent-gate.component';

const FAKE_SERVICE: ThirdPartyService = {
  id: 'mappa-demo',
  name: 'Mappa Demo',
  provider: 'Demo Maps Inc.',
  category: 'preferenze',
  purpose: 'Mostra una mappa interattiva.',
  cookies: [],
  privacyPolicyUrl: 'https://example.com/privacy',
};

@Component({
  standalone: true,
  imports: [ConsentGateComponent],
  template: `<unipc-consent-gate [serviceId]="serviceId"><p class="content-marker">Contenuto reale</p></unipc-consent-gate>`,
})
class HostComponent {
  serviceId = FAKE_SERVICE.id;
}

describe('ConsentGateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let preferencesPanel: CookiePreferencesService;

  beforeEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: THIRD_PARTY_SERVICES, useValue: [FAKE_SERVICE] }],
    });
    fixture = TestBed.createComponent(HostComponent);
    preferencesPanel = TestBed.inject(CookiePreferencesService);
  });

  afterEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  });

  it('mostra il contenuto proiettato quando la categoria è già consentita', () => {
    TestBed.inject(ConsentService).acceptAll();

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.content-marker')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.consent-gate')).toBeNull();
  });

  it('mostra il segnaposto con nome, provider e motivo quando manca il consenso', () => {
    fixture.detectChanges();

    const gate = fixture.nativeElement.querySelector('.consent-gate');
    expect(gate).not.toBeNull();
    expect(gate.textContent).toContain('Mappa Demo');
    expect(gate.textContent).toContain('Demo Maps Inc.');
    expect(fixture.nativeElement.querySelector('.content-marker')).toBeNull();
  });

  it('"Carica contenuto" sblocca solo questa istanza, senza toccare ConsentService', () => {
    fixture.detectChanges();
    const consent = TestBed.inject(ConsentService);

    const unlockButton: HTMLButtonElement = fixture.nativeElement.querySelector('.consent-gate__unlock');
    unlockButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.content-marker')).not.toBeNull();
    expect(consent.hasConsent('preferenze')).toBeFalse();
  });

  it('"Gestisci preferenze cookie" apre il pannello preferenze', () => {
    fixture.detectChanges();

    const manageButton: HTMLButtonElement = fixture.nativeElement.querySelector('.consent-gate__manage');
    manageButton.click();

    expect(preferencesPanel.isOpen()).toBeTrue();
  });

  it('non mostra nulla per un serviceId sconosciuto al registro', () => {
    fixture.componentInstance.serviceId = 'servizio-inesistente';

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.content-marker')).toBeNull();
    expect(fixture.nativeElement.querySelector('.consent-gate')).toBeNull();
  });
});
