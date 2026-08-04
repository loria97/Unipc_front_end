import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { CourseMappingError, mapCourseRow } from '../models/course.mapper';
import type { ProfessionalCourse } from '../models/course.model';
import type { DataResult } from '../models/data-result';
import { SupabaseService } from './supabase.service';

function toErrorResult<T>(err: unknown): DataResult<T> {
  if (err instanceof CourseMappingError) {
    // Dato malformato a monte (jsonb rotto, enum non riconosciuto): non è un
    // problema di rete, ma un problema di dati coerenti con la RLS letta.
    return { ok: false, error: { kind: 'supabase', message: err.message } };
  }
  const message = err instanceof Error ? err.message : 'Errore di rete sconosciuto';
  return { ok: false, error: { kind: 'network', message } };
}

/**
 * Servizio di sola lettura per i corsi professionalizzanti. Non filtra mai
 * `published` lato client: la RLS su Postgres espone ad `anon`/`authenticated`
 * solo le righe con `published = true`, quindi qui non serve (e non
 * andrebbe) duplicare quella logica.
 */
@Injectable({ providedIn: 'root' })
export class CoursesService {
  private readonly supabase = inject(SupabaseService);

  // Pilotato da `refresh$`: ogni emissione rilancia `buildGetAll()` da capo.
  // Senza questo, un errore sulla prima query resterebbe cacheato per
  // sempre da `shareReplay(1)` e un bottone "Riprova" che si limitasse a
  // ri-sottoscriversi riceverebbe lo stesso errore all'infinito, senza mai
  // ritentare la chiamata a Supabase.
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  // shareReplay(1) condivide/riproduce l'ultimo risultato ai subscriber
  // successivi, evitando query duplicate quando più componenti consumano la
  // stessa lista di corsi tra un refresh e l'altro.
  private readonly courses$: Observable<DataResult<ProfessionalCourse[]>> = this.refresh$.pipe(
    switchMap(() => this.buildGetAll()),
    shareReplay(1),
  );

  getAll(): Observable<DataResult<ProfessionalCourse[]>> {
    return this.courses$;
  }

  /** Rilancia la query `getAll()` da capo (es. bottone "Riprova" dopo un errore). */
  refresh(): void {
    this.refresh$.next();
  }

  getBySlug(slug: string): Observable<DataResult<ProfessionalCourse>> {
    return from(this.supabase.client.from('courses').select('*').eq('slug', slug).maybeSingle()).pipe(
      map((response): DataResult<ProfessionalCourse> => {
        const { data, error } = response;
        if (error) {
          return { ok: false, error: { kind: 'supabase', message: error.message } };
        }
        if (!data) {
          return {
            ok: false,
            error: { kind: 'not-found', message: `Nessun corso trovato per slug "${slug}"` },
          };
        }
        return { ok: true, value: mapCourseRow(data) };
      }),
      catchError((err: unknown) => of(toErrorResult<ProfessionalCourse>(err))),
    );
  }

  /**
   * Elenco delle aree tematiche, derivato da `getAll()` (map + `Set` + sort)
   * invece di una query separata: evita di duplicare la gestione
   * errori/RLS per un secondo endpoint quando i dati sono già disponibili
   * nella lista condivisa via `shareReplay(1)`.
   */
  getAreas(): Observable<DataResult<string[]>> {
    return this.getAll().pipe(
      map((result): DataResult<string[]> => {
        if (!result.ok) {
          return result;
        }
        const areas = Array.from(new Set(result.value.map((course) => course.area))).sort((a, b) =>
          a.localeCompare(b, 'it'),
        );
        return { ok: true, value: areas };
      }),
    );
  }

  private buildGetAll(): Observable<DataResult<ProfessionalCourse[]>> {
    return from(
      this.supabase.client
        .from('courses')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false }),
    ).pipe(
      map((response): DataResult<ProfessionalCourse[]> => {
        const { data, error } = response;
        if (error) {
          return { ok: false, error: { kind: 'supabase', message: error.message } };
        }
        const courses = (data ?? []).map(mapCourseRow);
        return { ok: true, value: courses };
      }),
      catchError((err: unknown) => of(toErrorResult<ProfessionalCourse[]>(err))),
    );
  }
}
