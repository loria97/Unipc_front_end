import { CONSENT_RECORD_VERSION, parseConsentRecord } from './consent-storage';

const REGISTRY_VERSION = 'abc12345';
const NOW = new Date(2026, 7, 6, 12, 0, 0); // 6 agosto 2026, mezzogiorno

function validRaw(
  overrides: Partial<{
    version: unknown;
    registryVersion: unknown;
    decidedAt: unknown;
    categories: unknown;
  }> = {},
): string {
  return JSON.stringify({
    version: CONSENT_RECORD_VERSION,
    registryVersion: REGISTRY_VERSION,
    decidedAt: NOW.toISOString(),
    categories: { necessari: true, preferenze: true, statistiche: false, marketing: false },
    ...overrides,
  });
}

describe('parseConsentRecord', () => {
  it('restituisce null per raw assente', () => {
    expect(parseConsentRecord(null, REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('restituisce null per JSON non parsabile', () => {
    expect(parseConsentRecord('{{{', REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('restituisce null per un valore non-oggetto', () => {
    expect(parseConsentRecord('"una-stringa"', REGISTRY_VERSION, NOW)).toBeNull();
    expect(parseConsentRecord('42', REGISTRY_VERSION, NOW)).toBeNull();
    expect(parseConsentRecord('[]', REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('restituisce null per una versione dello schema diversa da 1', () => {
    expect(parseConsentRecord(validRaw({ version: 2 }), REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('restituisce null se "registryVersion" è diversa da quella corrente', () => {
    expect(parseConsentRecord(validRaw({ registryVersion: 'hash-diverso' }), REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('restituisce null se "decidedAt" manca o non è una data valida', () => {
    expect(parseConsentRecord(validRaw({ decidedAt: undefined }), REGISTRY_VERSION, NOW)).toBeNull();
    expect(parseConsentRecord(validRaw({ decidedAt: 'non-una-data' }), REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('restituisce null se "decidedAt" è nel futuro rispetto a "now"', () => {
    const future = new Date(NOW.getTime() + 60_000).toISOString();
    expect(parseConsentRecord(validRaw({ decidedAt: future }), REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('restituisce null se "decidedAt" è scaduto oltre 6 mesi di calendario', () => {
    const decidedAt = new Date(NOW);
    decidedAt.setMonth(decidedAt.getMonth() - 7);
    expect(parseConsentRecord(validRaw({ decidedAt: decidedAt.toISOString() }), REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('è scaduto esattamente al limite dei 6 mesi (il limite non è più incluso)', () => {
    const decidedAt = new Date(NOW);
    decidedAt.setMonth(decidedAt.getMonth() - 6);
    expect(parseConsentRecord(validRaw({ decidedAt: decidedAt.toISOString() }), REGISTRY_VERSION, NOW)).toBeNull();
  });

  it('è ancora valido appena un giorno prima del limite dei 6 mesi', () => {
    const decidedAt = new Date(NOW);
    decidedAt.setMonth(decidedAt.getMonth() - 6);
    decidedAt.setDate(decidedAt.getDate() + 1);
    const record = parseConsentRecord(validRaw({ decidedAt: decidedAt.toISOString() }), REGISTRY_VERSION, NOW);
    expect(record).not.toBeNull();
  });

  it('restituisce il record valido con tutti i campi attesi', () => {
    const record = parseConsentRecord(validRaw(), REGISTRY_VERSION, NOW);
    expect(record).toEqual({
      version: 1,
      registryVersion: REGISTRY_VERSION,
      decidedAt: NOW.toISOString(),
      categories: { necessari: true, preferenze: true, statistiche: false, marketing: false },
    });
  });

  it('restituisce null se "categories" manca una delle quattro chiavi attese', () => {
    expect(
      parseConsentRecord(
        validRaw({ categories: { necessari: true, preferenze: true, statistiche: false } }),
        REGISTRY_VERSION,
        NOW,
      ),
    ).toBeNull();
  });
});
