import { effectivePriceCents } from './course-pricing';
import type { ProfessionalCourse } from './course.model';

/**
 * Persistenza del carrello in `localStorage`: si salvano **solo** gli
 * identificativi (slug + timestamp di aggiunta), mai titoli o prezzi.
 * Titoli e prezzi cambiano nel tempo; salvarli nel browser produrrebbe dati
 * stantii e discrepanze tra ciò che l'utente vede e ciò che il server
 * addebiterà al momento del checkout. La fonte di verità resta il database
 * (regola 4 di CLAUDE.md): ogni riga viene sempre reidratata da
 * `CoursesService` prima di essere mostrata o sommata in un totale.
 */
export const CART_STORAGE_KEY = 'unipc.cart.v1';
export const CART_STORAGE_VERSION = 1;

export interface CartStoredItem {
  slug: string;
  addedAt: string;
}

export interface CartStorageV1 {
  version: 1;
  items: CartStoredItem[];
}

/** Riga di carrello a runtime: slug + corso reidratato + prezzo del momento. */
export interface CartItem {
  slug: string;
  addedAt: string;
  course: ProfessionalCourse;
  priceCents: number;
  isPromo: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidStoredItem(value: unknown): value is CartStoredItem {
  if (!isPlainObject(value)) {
    return false;
  }
  const { slug, addedAt } = value;
  return typeof slug === 'string' && slug.length > 0 && typeof addedAt === 'string';
}

/**
 * Legge e valida il contenuto grezzo di `localStorage`. **Non lancia mai**:
 * `null`, JSON non parsabile, un valore non-oggetto, `version !== 1` o
 * `items` non array producono un carrello vuoto (`[]`). Le singole voci
 * malformate (slug non stringa/vuoto, `addedAt` non stringa) vengono
 * scartate senza buttare via le altre. Deduplica per slug tenendo la prima
 * occorrenza.
 */
export function parseCartStorage(raw: string | null): CartStoredItem[] {
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isPlainObject(parsed)) {
    return [];
  }
  if (parsed['version'] !== CART_STORAGE_VERSION) {
    return [];
  }
  if (!Array.isArray(parsed['items'])) {
    return [];
  }

  const seenSlugs = new Set<string>();
  const result: CartStoredItem[] = [];
  for (const item of parsed['items']) {
    if (!isValidStoredItem(item)) {
      continue;
    }
    if (seenSlugs.has(item.slug)) {
      continue;
    }
    seenSlugs.add(item.slug);
    result.push({ slug: item.slug, addedAt: item.addedAt });
  }
  return result;
}

/**
 * Totale del carrello in centesimi interi: somma di `effectivePriceCents`
 * per ciascun corso al momento `now`. Firma su `ProfessionalCourse[]` (non
 * su `CartItem[]`) proprio per restare testabile su promo attiva/scaduta
 * senza dover costruire un `CartItem` completo.
 *
 * Valore solo per la UI: il totale autorevole resta sempre ricalcolato lato
 * server al momento del checkout (regola 4 di CLAUDE.md).
 */
export function cartTotalCents(courses: readonly ProfessionalCourse[], now: Date): number {
  return courses.reduce((sum, course) => sum + effectivePriceCents(course, now).cents, 0);
}
