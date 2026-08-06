import { CART_STORAGE_VERSION, cartTotalCents, parseCartStorage } from './cart.model';
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

describe('cartTotalCents', () => {
  it('restituisce 0 per un carrello vuoto', () => {
    expect(cartTotalCents([], new Date(2026, 5, 1))).toBe(0);
  });

  it('somma il prezzo di un singolo corso a listino', () => {
    const course = buildCourse({ listPriceCents: 60000 });

    expect(cartTotalCents([course], new Date(2026, 5, 1))).toBe(60000);
  });

  it('somma i prezzi di più corsi', () => {
    const a = buildCourse({ slug: 'a', listPriceCents: 60000 });
    const b = buildCourse({ slug: 'b', listPriceCents: 40000 });

    expect(cartTotalCents([a, b], new Date(2026, 5, 1))).toBe(100000);
  });

  it('usa il prezzo promo se la promo è ancora attiva', () => {
    const course = buildCourse({
      listPriceCents: 60000,
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-12-31' },
    });

    expect(cartTotalCents([course], new Date(2026, 5, 1))).toBe(49900);
  });

  it('usa il prezzo di listino se la promo è scaduta', () => {
    const course = buildCourse({
      listPriceCents: 60000,
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-01-31' },
    });

    expect(cartTotalCents([course], new Date(2026, 5, 1))).toBe(60000);
  });

  it('somma correttamente un corso in promo attiva e uno a listino', () => {
    const promo = buildCourse({
      slug: 'promo',
      listPriceCents: 60000,
      promo: { priceCents: 49900, label: 'Promo', validUntil: '2026-12-31' },
    });
    const listino = buildCourse({ slug: 'listino', listPriceCents: 30000 });

    expect(cartTotalCents([promo, listino], new Date(2026, 5, 1))).toBe(79900);
  });
});

describe('parseCartStorage', () => {
  it('restituisce un array vuoto per null', () => {
    expect(parseCartStorage(null)).toEqual([]);
  });

  it('restituisce un array vuoto per JSON non parsabile (non lancia mai)', () => {
    expect(parseCartStorage('{{{')).toEqual([]);
  });

  it('restituisce un array vuoto per un valore non-oggetto', () => {
    expect(parseCartStorage('"una-stringa"')).toEqual([]);
    expect(parseCartStorage('42')).toEqual([]);
    expect(parseCartStorage('[]')).toEqual([]);
  });

  it('restituisce un array vuoto per una versione dello schema diversa da 1', () => {
    expect(parseCartStorage(JSON.stringify({ version: 2, items: [] }))).toEqual([]);
  });

  it('restituisce un array vuoto se "items" non è un array', () => {
    expect(
      parseCartStorage(JSON.stringify({ version: CART_STORAGE_VERSION, items: 'non-un-array' })),
    ).toEqual([]);
    expect(parseCartStorage(JSON.stringify({ version: CART_STORAGE_VERSION }))).toEqual([]);
  });

  it('scarta le singole voci malformate senza buttare via le altre', () => {
    const raw = JSON.stringify({
      version: CART_STORAGE_VERSION,
      items: [
        { slug: 'corso-a', addedAt: '2026-01-01T00:00:00.000Z' },
        { slug: '', addedAt: '2026-01-01T00:00:00.000Z' },
        { slug: 123, addedAt: '2026-01-01T00:00:00.000Z' },
        { slug: 'corso-b', addedAt: 456 },
        { slug: 'corso-c' },
        'non-un-oggetto',
      ],
    });

    expect(parseCartStorage(raw)).toEqual([{ slug: 'corso-a', addedAt: '2026-01-01T00:00:00.000Z' }]);
  });

  it('deduplica per slug tenendo la prima occorrenza', () => {
    const raw = JSON.stringify({
      version: CART_STORAGE_VERSION,
      items: [
        { slug: 'corso-a', addedAt: '2026-01-01T00:00:00.000Z' },
        { slug: 'corso-a', addedAt: '2026-02-01T00:00:00.000Z' },
      ],
    });

    expect(parseCartStorage(raw)).toEqual([{ slug: 'corso-a', addedAt: '2026-01-01T00:00:00.000Z' }]);
  });
});
