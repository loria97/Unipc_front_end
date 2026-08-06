import type { ConsentCategory } from './third-party-services';

/**
 * Persistenza del consenso in `localStorage`, stesso stile di
 * `parseCartStorage` (`core/models/cart.model.ts`): funzioni pure, che non
 * lanciano mai. `v1` è la forma del record, non della singola scelta:
 * cambia solo se cambiano i campi salvati, non a ogni modifica del
 * registro (per quello c'è `registryVersion`, vedi `third-party-services.ts`).
 */
export const CONSENT_STORAGE_KEY = 'unipc.consent.v1';
export const CONSENT_RECORD_VERSION = 1;

/**
 * "6 mesi" nelle Linee guida cookie del Garante è un termine di calendario,
 * non di giorni: calcolato con `setMonth(+6)`, non `+180 * 24h`.
 */
export const CONSENT_MAX_AGE_MONTHS = 6;

export interface ConsentRecordV1 {
  version: 1;
  registryVersion: string;
  /** ISO 8601, momento in cui l'utente ha espresso la scelta. */
  decidedAt: string;
  categories: Record<ConsentCategory, boolean>;
}

const CATEGORY_KEYS: readonly ConsentCategory[] = ['necessari', 'preferenze', 'statistiche', 'marketing'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidCategories(value: unknown): value is Record<ConsentCategory, boolean> {
  if (!isPlainObject(value)) {
    return false;
  }
  return CATEGORY_KEYS.every((key) => typeof value[key] === 'boolean');
}

/**
 * Legge e valida il contenuto grezzo di `localStorage`. **Non lancia mai**:
 * restituisce `null` (= consenso assente, banner visibile) per `raw`
 * nullo, JSON non parsabile, un valore non-oggetto, `version` diversa da 1,
 * `registryVersion` diversa da quella corrente, `decidedAt` mancante o non
 * parsabile, `decidedAt` nel futuro (clock skew: altrimenti un record del
 * genere non scadrebbe mai) o più vecchio di `CONSENT_MAX_AGE_MONTHS` mesi
 * di calendario rispetto a `now`.
 *
 * `now` è sempre passato come parametro esplicito, mai `new Date()` interno:
 * stessa ragione documentata in `effectivePriceCents` (`course-pricing.ts`),
 * per restare puro e testabile sui casi limite della scadenza.
 */
export function parseConsentRecord(raw: string | null, registryVersion: string, now: Date): ConsentRecordV1 | null {
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) {
    return null;
  }
  if (parsed['version'] !== CONSENT_RECORD_VERSION) {
    return null;
  }
  if (parsed['registryVersion'] !== registryVersion) {
    return null;
  }

  const decidedAtRaw = parsed['decidedAt'];
  if (typeof decidedAtRaw !== 'string') {
    return null;
  }
  const decidedAt = new Date(decidedAtRaw);
  if (Number.isNaN(decidedAt.getTime())) {
    return null;
  }
  if (decidedAt.getTime() > now.getTime()) {
    return null;
  }

  const expiry = new Date(decidedAt);
  expiry.setMonth(expiry.getMonth() + CONSENT_MAX_AGE_MONTHS);
  if (now.getTime() >= expiry.getTime()) {
    return null;
  }

  const categories = parsed['categories'];
  if (!isValidCategories(categories)) {
    return null;
  }

  return {
    version: CONSENT_RECORD_VERSION,
    registryVersion,
    decidedAt: decidedAtRaw,
    categories,
  };
}
