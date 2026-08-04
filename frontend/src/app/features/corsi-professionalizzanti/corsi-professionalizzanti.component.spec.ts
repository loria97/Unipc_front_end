import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ProfessionalCourse } from '../../core/models/course.model';
import type { DataResult } from '../../core/models/data-result';
import { CoursesService } from '../../core/services/courses.service';
import { CorsiProfessionalizzantiComponent } from './corsi-professionalizzanti.component';

// Numero di skeleton renderizzati durante il caricamento: deve restare
// allineato a `SKELETON_COUNT` nel componente (non esportata).
const SKELETON_COUNT = 6;

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
 * Doppio minimale di `CoursesService`: un `Subject` condiviso da
 * `getAll()`/`getAreas()`, come nel servizio reale dove `getAreas()` deriva
 * da `getAll()`. Nessuna chiamata di rete.
 */
class FakeCoursesService {
  private readonly result$ = new Subject<DataResult<ProfessionalCourse[]>>();
  refreshCount = 0;

  getAll(): Observable<DataResult<ProfessionalCourse[]>> {
    return this.result$.asObservable();
  }

  getAreas(): Observable<DataResult<string[]>> {
    return this.result$.pipe(
      map((result): DataResult<string[]> =>
        result.ok
          ? { ok: true, value: Array.from(new Set(result.value.map((c) => c.area))) }
          : result,
      ),
    );
  }

  refresh(): void {
    this.refreshCount += 1;
  }

  emit(result: DataResult<ProfessionalCourse[]>): void {
    this.result$.next(result);
  }
}

describe('CorsiProfessionalizzantiComponent', () => {
  let fake: FakeCoursesService;

  function setup(): void {
    fake = new FakeCoursesService();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'corsi-professionalizzanti', component: CorsiProfessionalizzantiComponent }]),
        { provide: CoursesService, useValue: fake },
      ],
    });
  }

  async function navigate(url: string): Promise<{
    harness: RouterTestingHarness;
    component: CorsiProfessionalizzantiComponent;
  }> {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url, CorsiProfessionalizzantiComponent);
    harness.detectChanges();
    return { harness, component };
  }

  beforeEach(() => setup());

  it('mostra gli skeleton mentre i corsi sono in caricamento', async () => {
    const { harness } = await navigate('/corsi-professionalizzanti');
    const el = harness.routeNativeElement as HTMLElement;

    expect(el.querySelectorAll('unipc-course-card-skeleton').length).toBe(SKELETON_COUNT);
  });

  it('mostra un messaggio di errore con azione "Riprova" se il servizio fallisce', async () => {
    const { harness } = await navigate('/corsi-professionalizzanti');
    fake.emit({ ok: false, error: { kind: 'network', message: 'errore di rete' } });
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    const retryButton = el.querySelector<HTMLButtonElement>('.state--error .state__action');
    expect(retryButton).not.toBeNull();
    expect(el.textContent).toContain('Non è stato possibile caricare i corsi.');

    retryButton?.click();
    expect(fake.refreshCount).toBe(1);
  });

  it('mostra le card quando i corsi arrivano con successo', async () => {
    const { harness } = await navigate('/corsi-professionalizzanti');
    fake.emit({
      ok: true,
      value: [buildCourse({ slug: 'a', title: 'Corso A' }), buildCourse({ slug: 'b', title: 'Corso B' })],
    });
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelectorAll('unipc-course-card').length).toBe(2);
    expect(el.textContent).toContain('2 corsi trovati.');
  });

  it('mostra lo stato vuoto con azione "Azzera i filtri" quando nessun corso soddisfa i filtri', async () => {
    const { harness } = await navigate('/corsi-professionalizzanti');
    fake.emit({ ok: true, value: [] });
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    const resetButton = el.querySelector<HTMLButtonElement>('.state--empty .state__action');
    expect(resetButton).not.toBeNull();
    expect(el.textContent).toContain('Nessun corso trovato.');
  });

  it('ripristina i filtri dai query param al caricamento della pagina', async () => {
    const { harness, component } = await navigate(
      '/corsi-professionalizzanti?q=management&area=Sanit%C3%A0&tipo=corso',
    );
    fake.emit({
      ok: true,
      value: [buildCourse({ title: 'Alta formazione in management', area: 'Sanità', type: 'corso' })],
    });
    harness.detectChanges();

    expect(component.searchTerm()).toBe('management');
    expect(component.selectedArea()).toBe('Sanità');
    expect(component.selectedType()).toBe('corso');

    const el = harness.routeNativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#filter-q');
    expect(input?.value).toBe('management');
  });

  it(
    'non sovrascrive il campo di ricerca durante il debounce (nessuna perdita di caratteri)',
    fakeAsync(() => {
      // `fakeAsync` sostituisce i timer reali con timer virtuali avanzati da
      // `tick()`: evita attese reali (rese inaffidabili dal `debounceTime`
      // di RxJS in ambienti di CI più lenti) mantenendo la stessa sequenza
      // temporale del comportamento reale.
      let harness!: RouterTestingHarness;
      RouterTestingHarness.create().then((h) => (harness = h));
      tick();

      harness.navigateByUrl('/corsi-professionalizzanti', CorsiProfessionalizzantiComponent);
      tick();
      harness.detectChanges();

      fake.emit({ ok: true, value: [] });
      harness.detectChanges();

      const el = harness.routeNativeElement as HTMLElement;
      const input = el.querySelector<HTMLInputElement>('#filter-q');
      if (!input) {
        throw new Error('Campo di ricerca non trovato');
      }

      input.value = 'abc';
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();

      // Meno dei 300ms di debounce: la navigazione con "abc" non è ancora partita.
      tick(100);
      input.value = 'abcd';
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();

      // Oltre il debounce: scatta la navigazione con "abcd". Se il valore
      // mostrato venisse riscritto dall'eco di "abc" nel frattempo, l'ultimo
      // carattere digitato andrebbe perso.
      tick(400);
      harness.detectChanges();

      expect(input.value).toBe('abcd');
    }),
  );
});
