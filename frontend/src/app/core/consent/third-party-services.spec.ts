import { THIRD_PARTY_SERVICES_REGISTRY, ThirdPartyService, consentRegistryVersion } from './third-party-services';

function buildService(overrides: Partial<ThirdPartyService> = {}): ThirdPartyService {
  return {
    id: 'servizio-demo',
    name: 'Servizio Demo',
    provider: 'Demo Inc.',
    category: 'preferenze',
    purpose: 'Scopo demo',
    cookies: [],
    ...overrides,
  };
}

describe('THIRD_PARTY_SERVICES_REGISTRY', () => {
  it('ha id univoci', () => {
    const ids = THIRD_PARTY_SERVICES_REGISTRY.map((service) => service.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('consentRegistryVersion', () => {
  it('è stabile a parità di registro (stesso contenuto, istanze diverse)', () => {
    const a = [buildService()];
    const b = [buildService()];
    expect(consentRegistryVersion(a)).toBe(consentRegistryVersion(b));
  });

  it("è insensibile all'ordine dei servizi nel registro", () => {
    const a = [buildService({ id: 'uno' }), buildService({ id: 'due' })];
    const b = [buildService({ id: 'due' }), buildService({ id: 'uno' })];
    expect(consentRegistryVersion(a)).toBe(consentRegistryVersion(b));
  });

  it('cambia aggiungendo un servizio', () => {
    const before = [buildService()];
    const after = [buildService(), buildService({ id: 'altro-servizio' })];
    expect(consentRegistryVersion(before)).not.toBe(consentRegistryVersion(after));
  });

  it('cambia spostando un servizio di categoria', () => {
    const before = [buildService({ category: 'preferenze' })];
    const after = [buildService({ category: 'statistiche' })];
    expect(consentRegistryVersion(before)).not.toBe(consentRegistryVersion(after));
  });

  it('cambia se cambia il nome di uno storage dichiarato', () => {
    const before = [
      buildService({ cookies: [{ name: 'a', storage: 'localStorage', duration: '1 anno', purpose: 'x' }] }),
    ];
    const after = [
      buildService({ cookies: [{ name: 'b', storage: 'localStorage', duration: '1 anno', purpose: 'x' }] }),
    ];
    expect(consentRegistryVersion(before)).not.toBe(consentRegistryVersion(after));
  });

  it('resta invariato cambiando solo "purpose"', () => {
    const before = [buildService({ purpose: 'Scopo A' })];
    const after = [buildService({ purpose: 'Scopo completamente diverso, riscritto da capo' })];
    expect(consentRegistryVersion(before)).toBe(consentRegistryVersion(after));
  });

  it('resta invariato cambiando solo "name"', () => {
    const before = [buildService({ name: 'Nome A' })];
    const after = [buildService({ name: 'Nome B' })];
    expect(consentRegistryVersion(before)).toBe(consentRegistryVersion(after));
  });
});
