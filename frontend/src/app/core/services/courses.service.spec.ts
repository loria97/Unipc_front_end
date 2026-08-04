import { TestBed } from '@angular/core/testing';
import type { Tables } from '../models/database.types';
import { CoursesService } from './courses.service';
import { SupabaseService } from './supabase.service';

type CourseRow = Tables<'courses'>;
interface PostgrestLikeError {
  message: string;
}

function buildRow(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'corso-demo',
    title: 'Corso Demo',
    type: 'corso',
    area: 'Area Demo',
    abstract: 'Abstract demo',
    hero_image: { src: '/img.jpg', alt: 'Alt demo' },
    a_chi_e_rivolto: ['Chiunque'],
    obiettivi: ['Obiettivo'],
    requisiti_ammissione: ['Nessuno'],
    programma: null,
    durata_ore: 100,
    durata_label: '100 ore',
    cfu: null,
    modalita: 'Online',
    prove_previste: null,
    list_price_cents: 60000,
    promo_price_cents: null,
    promo_label: null,
    promo_valid_until: null,
    vat_regime: 'esente_art10',
    riferimenti_normativi: null,
    punti_graduatoria: null,
    classi_concorso: null,
    published: true,
    sort_order: 1,
    seo: { metaTitle: 'Titolo', metaDescription: 'Descrizione' },
    created_at: '2026-08-01T09:45:00.000Z',
    updated_at: '2026-08-01T09:45:00.000Z',
    ...overrides,
  };
}

/**
 * Doppio minimale della chain PostgREST effettivamente usata da
 * `CoursesService`: `.from('courses').select('*').order(...)` per
 * `getAll()` e `.from('courses').select('*').eq('slug', ...).maybeSingle()`
 * per `getBySlug()`. Nessuna chiamata di rete: si mocka `SupabaseService`,
 * non `createClient`.
 */
function createFakeSupabaseService(options: {
  listData?: CourseRow[] | null;
  listError?: PostgrestLikeError | null;
  singleData?: CourseRow | null;
  singleError?: PostgrestLikeError | null;
}): SupabaseService {
  const { listData = null, listError = null, singleData = null, singleError = null } = options;

  const fakeClient = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: listData, error: listError }),
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: singleData, error: singleError }),
        }),
      }),
    }),
  };

  return { client: fakeClient } as unknown as SupabaseService;
}

describe('CoursesService', () => {
  function setup(fakeSupabase: SupabaseService): CoursesService {
    TestBed.configureTestingModule({
      providers: [CoursesService, { provide: SupabaseService, useValue: fakeSupabase }],
    });
    return TestBed.inject(CoursesService);
  }

  it('getAll() restituisce i corsi mappati in caso di successo', (done) => {
    const rows = [buildRow({ slug: 'corso-a' }), buildRow({ slug: 'corso-b', sort_order: 2 })];
    const service = setup(createFakeSupabaseService({ listData: rows }));

    service.getAll().subscribe((result) => {
      expect(result.ok).toBeTrue();
      if (result.ok) {
        expect(result.value.length).toBe(2);
        expect(result.value[0].slug).toBe('corso-a');
        expect(result.value[1].slug).toBe('corso-b');
      }
      done();
    });
  });

  it('getBySlug() restituisce un errore "not-found" per uno slug inesistente', (done) => {
    const service = setup(createFakeSupabaseService({ singleData: null, singleError: null }));

    service.getBySlug('slug-che-non-esiste').subscribe((result) => {
      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error.kind).toBe('not-found');
      }
      done();
    });
  });

  it('getAll() traduce un errore Supabase in DataResult con kind "supabase"', (done) => {
    const service = setup(
      createFakeSupabaseService({ listData: null, listError: { message: 'connessione al DB fallita' } }),
    );

    service.getAll().subscribe((result) => {
      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error.kind).toBe('supabase');
        expect(result.error.message).toBe('connessione al DB fallita');
      }
      done();
    });
  });
});
