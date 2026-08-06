import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ProfessionalCourse } from '../../../core/models/course.model';
import { CourseCardComponent } from './course-card.component';

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

describe('CourseCardComponent', () => {
  let fixture: ComponentFixture<CourseCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CourseCardComponent);
  });

  it('mostra il CFU quando presente', () => {
    fixture.componentInstance.course = buildCourse({ cfu: 60 });
    fixture.componentInstance.now = new Date(2026, 5, 1);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const metaItems = Array.from(el.querySelectorAll('.card__meta-item')).map((n) => n.textContent?.trim());
    expect(metaItems.some((t) => t?.includes('60 CFU'))).toBeTrue();
  });

  it('non mostra alcun nodo CFU per una certificazione senza CFU', () => {
    fixture.componentInstance.course = buildCourse({ type: 'certificazione', cfu: undefined });
    fixture.componentInstance.now = new Date(2026, 5, 1);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const metaItems = Array.from(el.querySelectorAll('.card__meta-item')).map((n) => n.textContent?.trim());
    expect(metaItems.some((t) => t?.includes('CFU'))).toBeFalse();
  });

  it('per un corso in promo mostra sia il prezzo di listino barrato sia il prezzo promo', () => {
    fixture.componentInstance.course = buildCourse({
      listPriceCents: 60000,
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-12-31' },
    });
    fixture.componentInstance.now = new Date(2026, 5, 1);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const listPrice = el.querySelector('.card__price-list');
    const promoPrice = el.querySelector('.card__price-promo');
    expect(listPrice?.textContent).toContain('600,00');
    expect(promoPrice?.textContent).toContain('499,00');
  });

  it('corso a IVA 22%: mostra "IVA inclusa" anche nel ramo promo', () => {
    fixture.componentInstance.course = buildCourse({
      vatRegime: 'iva_22',
      listPriceCents: 60000,
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-12-31' },
    });
    fixture.componentInstance.now = new Date(2026, 5, 1);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.card__price-vat')?.textContent).toContain('IVA inclusa');
  });

  it('corso esente art. 10: mostra "Esente IVA art. 10"', () => {
    fixture.componentInstance.course = buildCourse({ vatRegime: 'esente_art10' });
    fixture.componentInstance.now = new Date(2026, 5, 1);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.card__price-vat')?.textContent).toContain('Esente IVA art. 10');
  });

  it('corso con regime da definire: nessuna dicitura IVA', () => {
    fixture.componentInstance.course = buildCourse({ vatRegime: 'da_definire' });
    fixture.componentInstance.now = new Date(2026, 5, 1);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.card__price-vat')).toBeNull();
  });
});
