import { effectivePriceCents } from './course-pricing';
import type { ProfessionalCourse } from './course.model';

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

describe('effectivePriceCents', () => {
  it('restituisce il prezzo promo se la promo è ancora attiva', () => {
    const course = buildCourse({
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-12-31' },
    });

    const result = effectivePriceCents(course, new Date(2026, 5, 1));

    expect(result).toEqual({ cents: 49900, isPromo: true });
  });

  it('restituisce il prezzo di listino se la promo è scaduta', () => {
    const course = buildCourse({
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-01-31' },
    });

    const result = effectivePriceCents(course, new Date(2026, 1, 1)); // 1 febbraio 2026

    expect(result).toEqual({ cents: 60000, isPromo: false });
  });

  it('restituisce il prezzo di listino se non c\'è promo', () => {
    const course = buildCourse();

    const result = effectivePriceCents(course, new Date(2026, 5, 1));

    expect(result).toEqual({ cents: 60000, isPromo: false });
  });

  it('considera la promo ancora valida se "now" cade nel giorno di scadenza (inclusiva fino a fine giornata)', () => {
    const course = buildCourse({
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-12-31' },
    });

    const result = effectivePriceCents(course, new Date(2026, 11, 31, 23, 30));

    expect(result).toEqual({ cents: 49900, isPromo: true });
  });

  it('considera la promo scaduta subito dopo la fine del giorno di scadenza', () => {
    const course = buildCourse({
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-12-31' },
    });

    const result = effectivePriceCents(course, new Date(2027, 0, 1, 0, 0, 0, 1));

    expect(result).toEqual({ cents: 60000, isPromo: false });
  });
});
