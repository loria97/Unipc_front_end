import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CartItem } from '../../../core/models/cart.model';
import type { ProfessionalCourse } from '../../../core/models/course.model';
import type { DataError } from '../../../core/models/data-result';
import { CartService } from '../../../core/services/cart.service';
import { CartContentComponent } from './cart-content.component';

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

function buildCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const course = overrides.course ?? buildCourse();
  return {
    slug: course.slug,
    addedAt: '2026-01-01T00:00:00.000Z',
    course,
    priceCents: course.listPriceCents,
    isPromo: false,
    ...overrides,
  };
}

/**
 * Doppio minimale di `CartService`: solo i signal/metodi letti dal
 * template di `CartContentComponent`. Nessun `jasmine.createSpyObj`, in
 * linea con lo stile di casa: `removedSlugs` traccia manualmente le
 * chiamate a `remove()`.
 */
class FakeCartService {
  readonly isLoading = signal(false);
  readonly loadError = signal<DataError | null>(null);
  readonly items = signal<CartItem[]>([]);
  readonly count = computed(() => this.items().length);
  readonly totalCents = signal(0);

  removedSlugs: string[] = [];
  retryCount = 0;

  remove(slug: string): void {
    this.removedSlugs.push(slug);
  }

  retryLoad(): void {
    this.retryCount += 1;
  }
}

describe('CartContentComponent', () => {
  let fixture: ComponentFixture<CartContentComponent>;
  let fake: FakeCartService;

  beforeEach(async () => {
    fake = new FakeCartService();
    await TestBed.configureTestingModule({
      imports: [CartContentComponent],
      providers: [provideRouter([]), { provide: CartService, useValue: fake }],
    }).compileComponents();

    fixture = TestBed.createComponent(CartContentComponent);
  });

  it('mostra lo stato vuoto quando il carrello non ha corsi', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Il carrello è vuoto');
    expect(el.querySelectorAll('.cart-content__item').length).toBe(0);
  });

  it('mostra le righe e il totale con due corsi in carrello', () => {
    const a = buildCartItem({ course: buildCourse({ slug: 'a', title: 'Corso A', listPriceCents: 60000 }) });
    const b = buildCartItem({ course: buildCourse({ slug: 'b', title: 'Corso B', listPriceCents: 40000 }) });
    fake.items.set([a, b]);
    fake.totalCents.set(100000);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('.cart-content__item');
    expect(rows.length).toBe(2);
    expect(el.textContent).toContain('Corso A');
    expect(el.textContent).toContain('Corso B');
    expect(el.textContent).toContain('1000,00');
  });

  it('mostra lo stato di errore con "Riprova" invece di uno spinner infinito, e chiama retryLoad()', () => {
    fake.loadError.set({ kind: 'network', message: 'errore di rete' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Non è stato possibile caricare il carrello');

    const retryButton = el.querySelector<HTMLButtonElement>('.cart-content__state-action');
    expect(retryButton).not.toBeNull();
    retryButton?.click();

    expect(fake.retryCount).toBe(1);
  });

  it('il pulsante "Vai al checkout" disabilitato è collegato alla nota tramite aria-describedby', () => {
    const a = buildCartItem({ course: buildCourse({ slug: 'a', title: 'Corso A' }) });
    fake.items.set([a]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const checkoutButton = el.querySelector<HTMLButtonElement>('.cart-content__checkout');
    const describedBy = checkoutButton?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(el.querySelector(`#${describedBy}`)?.textContent).toContain('Il checkout sarà disponibile a breve');
  });

  it('il pulsante di rimozione chiama cart.remove() con lo slug corretto', () => {
    const a = buildCartItem({ course: buildCourse({ slug: 'a', title: 'Corso A' }) });
    fake.items.set([a]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const removeButton = el.querySelector<HTMLButtonElement>('.cart-content__remove');
    expect(removeButton).not.toBeNull();
    removeButton?.click();

    expect(fake.removedSlugs).toEqual(['a']);
  });

  describe('ripartizione IVA', () => {
    it('un corso a IVA 22%: mostra imponibile e imposta corretti', () => {
      const a = buildCartItem({ course: buildCourse({ slug: 'a', vatRegime: 'iva_22', listPriceCents: 150000 }) });
      fake.items.set([a]);
      fake.totalCents.set(150000);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const rows = el.querySelectorAll('.cart-content__vat-row');
      expect(rows.length).toBe(2);
      expect(el.textContent).toContain('di cui imponibile');
      expect(el.textContent).toContain('1229,51');
      expect(el.textContent).toContain('di cui IVA 22%');
      expect(el.textContent).toContain('270,49');
    });

    it('più corsi a IVA 22%: la ripartizione è calcolata sul totale', () => {
      const a = buildCartItem({ course: buildCourse({ slug: 'a', vatRegime: 'iva_22', listPriceCents: 60000 }) });
      const b = buildCartItem({ course: buildCourse({ slug: 'b', vatRegime: 'iva_22', listPriceCents: 40000 }) });
      fake.items.set([a, b]);
      fake.totalCents.set(100000);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('819,67');
      expect(el.textContent).toContain('180,33');
    });

    it('un corso in promo a IVA 22%: la ripartizione segue il prezzo scontato, non il listino', () => {
      const promoItem = buildCartItem({
        isPromo: true,
        priceCents: 45000,
        course: buildCourse({
          slug: 'a',
          vatRegime: 'iva_22',
          listPriceCents: 60000,
          promo: { priceCents: 45000, label: 'Promo', validUntil: '2026-12-31' },
        }),
      });
      fake.items.set([promoItem]);
      fake.totalCents.set(45000);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      // Scorporo su 45000 (prezzo effettivo), non su 60000 (listino).
      expect(el.textContent).toContain('368,85');
      expect(el.textContent).toContain('81,15');
    });

    it('regime IVA misto in carrello: la ripartizione non viene mostrata', () => {
      const a = buildCartItem({ course: buildCourse({ slug: 'a', vatRegime: 'iva_22', listPriceCents: 60000 }) });
      const b = buildCartItem({ course: buildCourse({ slug: 'b', vatRegime: 'esente_art10', listPriceCents: 40000 }) });
      fake.items.set([a, b]);
      fake.totalCents.set(100000);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.cart-content__vat')).toBeNull();
    });
  });
});
