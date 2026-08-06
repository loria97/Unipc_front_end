import { DEFAULT_VAT_RATE_PERCENT, VatBreakdown, VatCalculationError, splitVat, vatRegimeLabel } from './vat';

/**
 * Verifica, per ogni caso, che imponibile e imposta chiudano esattamente al
 * centesimo sul totale lordo: è l'invariante che conta di più, più dei
 * singoli valori attesi.
 */
function expectClosesExactly(result: VatBreakdown): void {
  expect(result.netCents + result.vatCents).toBe(result.grossCents);
}

describe('splitVat', () => {
  it('caso di riferimento del piano: 1.500,00 € → imponibile 1.229,51 €, imposta 270,49 €', () => {
    const result = splitVat(150000, 22);

    expect(result.netCents).toBe(122951);
    expect(result.vatCents).toBe(27049);
    expectClosesExactly(result);
  });

  it('totale zero: imponibile e imposta zero', () => {
    const result = splitVat(0, 22);

    expect(result.netCents).toBe(0);
    expect(result.vatCents).toBe(0);
    expectClosesExactly(result);
  });

  it('un centesimo: arrotonda verso l\'alto (0,819… → 1)', () => {
    const result = splitVat(1, 22);

    expect(result.netCents).toBe(1);
    expect(result.vatCents).toBe(0);
    expectClosesExactly(result);
  });

  it('cento centesimi: 81,967… → 82', () => {
    const result = splitVat(100, 22);

    expect(result.netCents).toBe(82);
    expect(result.vatCents).toBe(18);
    expectClosesExactly(result);
  });

  it('arrotondamento verso il basso: 3 centesimi, 2,459… → 2', () => {
    const result = splitVat(3, 22);

    expect(result.netCents).toBe(2);
    expect(result.vatCents).toBe(1);
    expectClosesExactly(result);
  });

  it('arrotondamento verso l\'alto: 7 centesimi, 5,737… → 6', () => {
    const result = splitVat(7, 22);

    expect(result.netCents).toBe(6);
    expect(result.vatCents).toBe(1);
    expectClosesExactly(result);
  });

  it('importo grande: la chiusura resta esatta e gli importi restano interi sicuri', () => {
    const result = splitVat(999999999, 22);

    expectClosesExactly(result);
    expect(Number.isSafeInteger(result.netCents)).toBeTrue();
    expect(Number.isSafeInteger(result.vatCents)).toBeTrue();
  });

  // A 22% nessun importo intero in centesimi produce mai un pareggio esatto
  // a metà centesimo (dimostrazione nel commento di `vat.ts` sopra
  // `Math.round`): netCents = grossCents·50/61, e "grossCents multiplo di 61
  // con 100·m dispari" non si dà mai perché 100·m è sempre pari. Il
  // comportamento round-half-up resta quindi documentato ma non esercitato
  // da un test dedicato al tie in questo lavoro (deciso con l'utente).

  it('input non intero: lancia VatCalculationError', () => {
    expect(() => splitVat(150000.5, 22)).toThrowError(VatCalculationError);
  });

  it('input negativo: lancia VatCalculationError', () => {
    expect(() => splitVat(-1, 22)).toThrowError(VatCalculationError);
  });

  it('input NaN: lancia VatCalculationError', () => {
    expect(() => splitVat(NaN, 22)).toThrowError(VatCalculationError);
  });

  it('input Infinity/-Infinity: lancia VatCalculationError', () => {
    expect(() => splitVat(Infinity, 22)).toThrowError(VatCalculationError);
    expect(() => splitVat(-Infinity, 22)).toThrowError(VatCalculationError);
  });

  it('aliquota negativa: lancia VatCalculationError', () => {
    expect(() => splitVat(1000, -5)).toThrowError(VatCalculationError);
  });

  it('aliquota NaN: lancia VatCalculationError', () => {
    expect(() => splitVat(1000, NaN)).toThrowError(VatCalculationError);
  });

  it('la somma chiude sempre al centesimo su tutto il range (test a proprietà)', () => {
    // Passo 137: primo e coprimo con 122/61, i resti di `gross·100 mod 122`
    // percorrono l'intero spazio dei residui invece di ricadere sempre sugli
    // stessi valori, come accadrebbe con un passo "tondo" (100, 1000).
    for (let gross = 0; gross <= 500000; gross += 137) {
      const result = splitVat(gross, DEFAULT_VAT_RATE_PERCENT);

      expectClosesExactly(result);
      expect(Number.isInteger(result.netCents)).toBeTrue();
      expect(Number.isInteger(result.vatCents)).toBeTrue();
      expect(result.netCents).toBeGreaterThanOrEqual(0);
      expect(result.vatCents).toBeGreaterThanOrEqual(0);
      expect(result.netCents).toBeLessThanOrEqual(gross);
    }
  });

  it('la somma chiude sempre al centesimo sui piccoli importi (0-1000, passo 1)', () => {
    for (let gross = 0; gross <= 1000; gross += 1) {
      const result = splitVat(gross, DEFAULT_VAT_RATE_PERCENT);

      expectClosesExactly(result);
      expect(Number.isInteger(result.netCents)).toBeTrue();
      expect(Number.isInteger(result.vatCents)).toBeTrue();
    }
  });
});

describe('vatRegimeLabel', () => {
  it('iva_22 → "IVA inclusa"', () => {
    expect(vatRegimeLabel('iva_22')).toBe('IVA inclusa');
  });

  it('esente_art10 → "Esente IVA art. 10"', () => {
    expect(vatRegimeLabel('esente_art10')).toBe('Esente IVA art. 10');
  });

  it('da_definire → nessuna dicitura', () => {
    expect(vatRegimeLabel('da_definire')).toBeNull();
  });
});
