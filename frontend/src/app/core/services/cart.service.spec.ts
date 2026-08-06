import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { CART_STORAGE_KEY } from '../models/cart.model';
import type { ProfessionalCourse } from '../models/course.model';
import type { DataResult } from '../models/data-result';
import { CartService } from './cart.service';
import { CoursesService } from './courses.service';

function buildCourse(overrides: Partial<ProfessionalCourse> = {}): ProfessionalCourse {
  return {
    slug: 'corso-demo',
    title: 'Corso Demo',
    type: 'corso',
    area: 'Area Demo',
    abstract: 'Abstract demo',
    heroImage: { src: '/img.jpg', alt: 'Alt demo' },
    aChiERivolto: ['Chiunque'],
    obiettivi: ['Obiettivo'],
    requisitiAmmissione: ['Nessuno'],
    durataOre: 100,
    durataLabel: '100 ore',
    modalita: 'Online',
    listPriceCents: 60000,
    vatRegime: 'esente_art10',
    seo: { metaTitle: 'Titolo', metaDescription: 'Descrizione' },
    ...overrides,
  };
}

/**
 * Doppio minimale di `CoursesService`: un `Subject` condiviso, nessuna
 * chiamata di rete. Stesso stile del fake usato per il catalogo
 * (`corsi-professionalizzanti.component.spec.ts`).
 */
class FakeCoursesService {
  private readonly result$ = new Subject<DataResult<ProfessionalCourse[]>>();
  callCount = 0;

  getAll(): Observable<DataResult<ProfessionalCourse[]>> {
    this.callCount += 1;
    return this.result$.asObservable();
  }

  emit(result: DataResult<ProfessionalCourse[]>): void {
    this.result$.next(result);
  }
}

describe('CartService', () => {
  let fake: FakeCoursesService;

  function setup(): CartService {
    fake = new FakeCoursesService();
    TestBed.configureTestingModule({
      providers: [CartService, { provide: CoursesService, useValue: fake }],
    });
    return TestBed.inject(CartService);
  }

  beforeEach(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
  });

  it('aggiunge un corso al carrello: subito disponibile via has()/count(), reidratato quando arriva il catalogo', () => {
    const service = setup();
    service.add('corso-a');

    expect(service.has('corso-a')).toBeTrue();
    expect(service.count()).toBe(1);
    expect(service.items().length).toBe(0); // catalogo non ancora arrivato

    fake.emit({ ok: true, value: [buildCourse({ slug: 'corso-a' })] });

    expect(service.items().length).toBe(1);
    expect(service.items()[0].slug).toBe('corso-a');
  });

  it('add() su uno slug già presente è un no-op silenzioso: nessun duplicato', () => {
    const service = setup();
    service.add('corso-a');
    service.add('corso-a');

    expect(service.count()).toBe(1);
  });

  it('remove() toglie il corso dal carrello', () => {
    const service = setup();
    service.add('corso-a');
    service.remove('corso-a');

    expect(service.has('corso-a')).toBeFalse();
    expect(service.count()).toBe(0);
  });

  it('clear() svuota completamente il carrello', () => {
    const service = setup();
    service.add('corso-a');
    service.add('corso-b');
    service.clear();

    expect(service.count()).toBe(0);
    expect(service.has('corso-a')).toBeFalse();
  });

  it('uno slug non più pubblicato viene scartato e lo storage riscritto ripulito', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: 1, items: [{ slug: 'non-esiste', addedAt: '2026-01-01T00:00:00.000Z' }] }),
    );
    const service = setup();

    fake.emit({ ok: true, value: [] });

    expect(service.items().length).toBe(0);
    expect(service.count()).toBe(0);

    const raw = localStorage.getItem(CART_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).items).toEqual([]);
  });

  it('un errore del catalogo non cancella gli slug memorizzati e smette di "caricare" a favore di un errore esplicito', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: 1, items: [{ slug: 'corso-a', addedAt: '2026-01-01T00:00:00.000Z' }] }),
    );
    const service = setup();

    expect(service.isLoading()).toBeTrue();
    expect(service.loadError()).toBeNull();

    fake.emit({ ok: false, error: { kind: 'network', message: 'errore di rete' } });

    // Niente spinner infinito: l'errore esce da `isLoading` verso `loadError`.
    expect(service.isLoading()).toBeFalse();
    expect(service.loadError()?.kind).toBe('network');
    expect(service.count()).toBe(1);
    expect(service.has('corso-a')).toBeTrue();
  });

  it('retryLoad() dopo un errore azzera loadError() e ripete la richiesta al catalogo', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: 1, items: [{ slug: 'corso-a', addedAt: '2026-01-01T00:00:00.000Z' }] }),
    );
    const service = setup();
    fake.emit({ ok: false, error: { kind: 'network', message: 'errore di rete' } });
    expect(fake.callCount).toBe(1);

    service.retryLoad();
    expect(service.isLoading()).toBeTrue();
    expect(service.loadError()).toBeNull();
    expect(fake.callCount).toBe(2);

    fake.emit({ ok: true, value: [buildCourse({ slug: 'corso-a' })] });
    expect(service.items().length).toBe(1);
  });

  it('ensureCatalogLoaded() è idempotente: add() ripetuti prima della risposta non generano richieste multiple', () => {
    const service = setup();
    service.add('corso-a');
    service.add('corso-b');
    service.add('corso-c');

    expect(fake.callCount).toBe(1);
  });

  it('la persistenza sopravvive alla ri-creazione del servizio', () => {
    const service = setup();
    service.add('corso-a');

    TestBed.resetTestingModule();
    const fake2 = new FakeCoursesService();
    TestBed.configureTestingModule({
      providers: [CartService, { provide: CoursesService, useValue: fake2 }],
    });
    const service2 = TestBed.inject(CartService);

    expect(service2.has('corso-a')).toBeTrue();
    expect(service2.count()).toBe(1);
  });

  it('con storage.getItem che lancia, il carrello parte vuoto senza eccezioni', () => {
    spyOn(localStorage, 'getItem').and.throwError('storage non disponibile');

    expect(() => setup()).not.toThrow();
    expect(TestBed.inject(CartService).count()).toBe(0);
  });

  it('con storage.setItem che lancia (quota superata), add() non solleva eccezioni e resta valido in memoria', () => {
    const service = setup();
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

    expect(() => service.add('corso-a')).not.toThrow();
    expect(service.has('corso-a')).toBeTrue();
  });
});
