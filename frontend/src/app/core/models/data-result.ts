/**
 * Wrapper di errore per i servizi di lettura dati.
 *
 * `CoursesService` (e i futuri servizi read-only) restituiscono sempre
 * `DataResult<T>` su un unico canale `next()` invece di far propagare
 * l'errore sul canale `error` dell'Observable: così i componenti possono
 * gestire successo/fallimento con un solo `subscribe`/`async` pipe, senza
 * dover agganciare un handler `error` separato che interromperebbe lo stream.
 */
export interface DataError {
  kind: 'network' | 'supabase' | 'not-found';
  message: string;
}

export type DataResult<T> = { ok: true; value: T } | { ok: false; error: DataError };
