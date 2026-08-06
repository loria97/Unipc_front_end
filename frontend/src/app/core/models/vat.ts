import type { VatRegime } from './course.model';

/**
 * Scorporo IVA per la sola vetrina (catalogo, dettaglio corso, riepilogo
 * carrello).
 *
 * ATTENZIONE — due avvertenze da tenere sempre presenti:
 *
 * 1. Questo calcolo serve alla vetrina. Il valore autorevole al momento
 *    dell'ordine sarà quello ricalcolato lato server e salvato su `orders`
 *    (regola 4 di CLAUDE.md, già citata in `cart.model.ts`): nessuna
 *    decisione fiscale o contabile deve dipendere da questa funzione.
 * 2. Oggi esiste una sola aliquota (22%, vedi `DEFAULT_VAT_RATE_PERCENT`).
 *    Se in futuro il catalogo avrà aliquote diverse, lo scorporo va fatto
 *    PER GRUPPO DI ALIQUOTA e non sul totale complessivo: la fattura
 *    elettronica richiede un blocco `DatiRiepilogo` per ogni aliquota/natura
 *    presente nel documento. Scorporare un totale misto produce un
 *    imponibile e un'imposta senza significato fiscale.
 */

/** Unica aliquota oggi in vigore per il catalogo (IVA 22% esposta). */
export const DEFAULT_VAT_RATE_PERCENT = 22;

/**
 * Lanciato quando `splitVat` riceve un input che non può produrre un
 * risultato corretto (non intero, negativo, non finito). Nessun fallback
 * silenzioso: un importo scorporato male è peggio di un errore esplicito.
 */
export class VatCalculationError extends Error {
  constructor(paramName: string, value: number) {
    super(`Scorporo IVA: parametro "${paramName}" non valido (${value})`);
    this.name = 'VatCalculationError';
  }
}

export interface VatBreakdown {
  /** Totale lordo (IVA inclusa), invariato rispetto all'input. */
  grossCents: number;
  /** Imponibile, in centesimi interi. */
  netCents: number;
  /** Imposta, in centesimi interi — sempre `grossCents - netCents`. */
  vatCents: number;
}

function assertValidAmount(paramName: string, value: number): void {
  if (!Number.isFinite(value)) {
    // Copre sia NaN sia ±Infinity.
    throw new VatCalculationError(paramName, value);
  }
  if (!Number.isInteger(value)) {
    throw new VatCalculationError(paramName, value);
  }
  if (value < 0) {
    throw new VatCalculationError(paramName, value);
  }
}

/**
 * Scorpora un totale lordo (IVA inclusa) in imponibile e imposta, in
 * centesimi interi.
 *
 * Sequenza di calcolo, vincolante:
 * 1. `netCents = round(grossCents * 100 / (100 + vatRatePercent))`
 * 2. `vatCents = grossCents - netCents` — SEMPRE per differenza, mai da una
 *    seconda moltiplicazione/divisione: `netCents + vatCents === grossCents`
 *    è garantito per costruzione, non da un secondo calcolo che potrebbe
 *    divergere di un centesimo.
 *
 * Perché `grossCents * 100 / (100 + vatRatePercent)` e non
 * `grossCents / 1.22`: `1.22` non è rappresentabile esattamente in binario,
 * quindi introdurrebbe un errore prima ancora della divisione. Moltiplicare
 * per l'intero 100 e dividere per l'intero `100 + vatRatePercent` resta
 * entro la precisione esatta di IEEE-754 per gli importi ammessi (vedi il
 * controllo su `Number.MAX_SAFE_INTEGER / 100` sotto), e produce il double
 * più vicino al valore razionale esatto.
 *
 * Arrotondamento: `Math.round`, cioè **round-half-up** (il mezzo arrotonda
 * verso l'alto), coerente con la prassi fiscale italiana — non
 * banker's-rounding (half-to-even). Con l'aliquota 22% questo caso di
 * pareggio esatto (`x,50`) non si presenta mai: per costruzione
 * `netCents = grossCents · 50/61`, e perché il risultato cada esattamente su
 * un mezzo centesimo servirebbe un `grossCents` multiplo di 61 tale che
 * `100·m` sia dispari — impossibile, `100·m` è sempre pari. La scelta
 * round-half-up resta comunque dichiarata qui perché diventa rilevante se in
 * futuro si introducono aliquote diverse dal 22% (es. 10%, 4%).
 *
 * @param totalGrossCents totale lordo, centesimi interi, >= 0.
 * @param vatRatePercent aliquota in punti percentuali (22, non 0.22), >= 0.
 * @throws {VatCalculationError} se un input non è intero, è negativo, o non
 *   è finito (`NaN`/`Infinity`).
 */
export function splitVat(totalGrossCents: number, vatRatePercent: number): VatBreakdown {
  assertValidAmount('totalGrossCents', totalGrossCents);
  assertValidAmount('vatRatePercent', vatRatePercent);

  // Garantisce che `totalGrossCents * 100` resti un intero esatto in
  // double (IEEE-754 rappresenta esattamente gli interi fino a 2^53).
  if (totalGrossCents > Number.MAX_SAFE_INTEGER / 100) {
    throw new VatCalculationError('totalGrossCents', totalGrossCents);
  }

  const netCents = Math.round((totalGrossCents * 100) / (100 + vatRatePercent));
  const vatCents = totalGrossCents - netCents;

  return { grossCents: totalGrossCents, netCents, vatCents };
}

/**
 * Dicitura da mostrare vicino al prezzo, in base al regime IVA del corso.
 * `null` per `da_definire`: nessuna dicitura finché il regime non è deciso,
 * mai un'affermazione fiscale non verificata.
 */
export function vatRegimeLabel(regime: VatRegime): string | null {
  switch (regime) {
    case 'iva_22':
      return 'IVA inclusa';
    case 'esente_art10':
      return 'Esente IVA art. 10';
    case 'da_definire':
      return null;
  }
}
