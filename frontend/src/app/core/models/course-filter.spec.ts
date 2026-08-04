import { filterCourses } from './course-filter';
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

describe('filterCourses', () => {
  const digitale = buildCourse({
    slug: 'didattica-digitale-inclusione-scolastica',
    title: 'Didattica digitale e inclusione scolastica',
    abstract: 'Un percorso sulla didattica inclusiva.',
    type: 'corso',
    area: 'Mondo scuola',
  });
  const certificazione = buildCourse({
    slug: 'certificazione-competenza-digitali-base',
    title: 'Certificazione competenze digitali base',
    abstract: 'Competenze digitali di base per il lavoro.',
    type: 'certificazione',
    area: 'Informatica',
  });
  const management = buildCourse({
    slug: 'alta-formazione-management',
    title: 'Alta formazione in management sociosanitario',
    abstract: 'Gestione delle strutture sociosanitarie.',
    type: 'corso',
    area: 'Sanità',
  });
  const courses = [digitale, certificazione, management];

  const noFilter = { q: '', area: '', tipo: '' as const };

  it('con criteri tutti vuoti restituisce tutti i corsi', () => {
    expect(filterCourses(courses, noFilter)).toEqual(courses);
  });

  it('filtra per testo nel titolo', () => {
    const result = filterCourses(courses, { ...noFilter, q: 'management' });
    expect(result).toEqual([management]);
  });

  it('filtra per testo nell\'abstract', () => {
    const result = filterCourses(courses, { ...noFilter, q: 'lavoro' });
    expect(result).toEqual([certificazione]);
  });

  it('la ricerca testuale è case-insensitive', () => {
    // "didattica inclusiva" compare per esteso nell'abstract di `digitale`
    // ("...sulla didattica inclusiva.") indipendentemente dal maiuscolo.
    const result = filterCourses(courses, { ...noFilter, q: 'DIDATTICA INCLUSIVA' });
    expect(result).toEqual([digitale]);
    const result2 = filterCourses(courses, { ...noFilter, q: 'MANAGEMENT' });
    expect(result2).toEqual([management]);
  });

  it('filtra per area singola', () => {
    const result = filterCourses(courses, { ...noFilter, area: 'Informatica' });
    expect(result).toEqual([certificazione]);
  });

  it('filtra per tipo singolo', () => {
    const result = filterCourses(courses, { ...noFilter, tipo: 'certificazione' });
    expect(result).toEqual([certificazione]);
  });

  it('combina più criteri contemporaneamente', () => {
    const result = filterCourses(courses, { q: 'management', area: 'Sanità', tipo: 'corso' });
    expect(result).toEqual([management]);
  });

  it('restituisce un array vuoto se nessun corso soddisfa i criteri', () => {
    const result = filterCourses(courses, { ...noFilter, q: 'inesistente' });
    expect(result).toEqual([]);
  });

  it('una ricerca fatta di soli spazi equivale a nessun filtro testuale', () => {
    const result = filterCourses(courses, { ...noFilter, q: '   ' });
    expect(result).toEqual(courses);
  });

  it('combina area e tipo senza filtro testuale', () => {
    const result = filterCourses(courses, { q: '', area: 'Mondo scuola', tipo: 'corso' });
    expect(result).toEqual([digitale]);
  });
});
