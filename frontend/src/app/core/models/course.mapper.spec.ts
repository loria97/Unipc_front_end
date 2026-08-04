import type { Tables } from './database.types';
import { CourseMappingError, mapCourseRow } from './course.mapper';

// Fixture ispirata al primo corso demo del seed
// (backend/supabase/migrations/20260801094500_seed_demo_courses.sql).
function buildFullCourseRow(): Tables<'courses'> {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'didattica-digitale-inclusione-scolastica',
    title: '[DEMO] Corso di Perfezionamento in Didattica Digitale e Inclusione Scolastica',
    type: 'corso',
    area: 'Formazione Insegnanti',
    abstract:
      'Un percorso di perfezionamento annuale per acquisire competenze avanzate di didattica digitale e inclusione, valido per punteggio nelle graduatorie GPS.',
    hero_image: {
      src: '/assets/img/corsi/didattica-digitale-inclusione-hero.jpg',
      alt: 'Docente che utilizza una lavagna digitale interattiva in classe',
    },
    a_chi_e_rivolto: [
      "Il corso è rivolto a docenti di ogni ordine e grado, già in servizio o aspiranti, che desiderano approfondire le metodologie della didattica digitale e dell'inclusione scolastica.",
    ],
    obiettivi: [
      "Fornire strumenti operativi per progettare percorsi didattici digitali accessibili a tutti gli studenti, incluso chi ha bisogni educativi speciali.",
    ],
    requisiti_ammissione: [
      'Diploma di laurea triennale, magistrale o vecchio ordinamento, oppure diploma di scuola secondaria di secondo grado per i profili non docenti.',
    ],
    programma: null,
    durata_ore: 1500,
    durata_label: '1500 ore / 60 CFU',
    cfu: 60,
    modalita: 'E-learning asincrono, piattaforma FAD con tutor dedicato e verifiche periodiche',
    prove_previste: null,
    list_price_cents: 60000,
    promo_price_cents: 49900,
    promo_label: 'Promo Iscrizioni Anticipate',
    promo_valid_until: '2026-12-31',
    vat_regime: 'esente_art10',
    riferimenti_normativi: [
      {
        label: 'D.M. 22 novembre 2019, n. 995 - Tabella di valutazione titoli GPS',
        url: 'https://www.miur.gov.it/documents/20182/0/DM+995_19.pdf',
      },
    ],
    punti_graduatoria: {
      punti: 3,
      note:
        'Valido per le Graduatorie Provinciali per le Supplenze (GPS), II fascia, ambito Sostegno, secondo la tabella di valutazione titoli vigente.',
    },
    classi_concorso: [
      'ADSS - Sostegno Scuola Secondaria di Primo Grado',
      'ADSH - Sostegno Scuola Secondaria di Secondo Grado',
    ],
    published: true,
    sort_order: 1,
    seo: {
      metaTitle: 'Corso Didattica Digitale e Inclusione Scolastica | UNIPC',
      metaDescription:
        'Corso di perfezionamento in didattica digitale e inclusione scolastica, 60 CFU, valido per punteggio GPS. Iscrizioni online.',
    },
    created_at: '2026-08-01T09:45:00.000Z',
    updated_at: '2026-08-01T09:45:00.000Z',
  };
}

// Fixture ispirata al secondo corso demo (certificazione, nessuna promo).
function buildCertificationCourseRow(): Tables<'courses'> {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'certificazione-competenze-digitali-base',
    title: '[DEMO] Certificazione Informatica di Base - Competenze Digitali Essenziali',
    type: 'certificazione',
    area: 'Informatica',
    abstract:
      'Certificazione delle competenze digitali di base, pensata per chi deve dimostrare in modo rapido ed economico il possesso di abilità informatiche essenziali.',
    hero_image: {
      src: '/assets/img/corsi/certificazione-competenze-digitali-hero.jpg',
      alt: "Persona che sostiene un test al computer in una postazione d'esame",
    },
    a_chi_e_rivolto: [
      'La certificazione è rivolta a studenti, lavoratori e chiunque debba attestare in modo formale le proprie competenze digitali di base per motivi di studio o di lavoro.',
    ],
    obiettivi: [
      "Verificare la conoscenza dei concetti fondamentali dell'informatica, della navigazione in rete e dell'uso della posta elettronica.",
    ],
    requisiti_ammissione: [
      'Nessun titolo di studio specifico richiesto: la certificazione è aperta a tutti i maggiorenni.',
    ],
    programma: null,
    durata_ore: 30,
    durata_label: '30 ore di preparazione facoltativa + esame',
    cfu: null,
    modalita: 'Esame online in videosorveglianza (proctoring), disponibile su prenotazione',
    prove_previste: null,
    list_price_cents: 6900,
    promo_price_cents: null,
    promo_label: null,
    promo_valid_until: null,
    vat_regime: 'esente_art10',
    riferimenti_normativi: null,
    punti_graduatoria: null,
    classi_concorso: null,
    published: true,
    sort_order: 2,
    seo: {
      metaTitle: 'Certificazione Competenze Digitali di Base | UNIPC',
      metaDescription:
        'Certificazione informatica di base, esame online in videosorveglianza. Attestato valido come titolo per concorsi pubblici.',
    },
    created_at: '2026-08-01T09:45:00.000Z',
    updated_at: '2026-08-01T09:45:00.000Z',
  };
}

describe('mapCourseRow', () => {
  it('mappa una riga completa (con promo, normativa, punti graduatoria)', () => {
    const course = mapCourseRow(buildFullCourseRow());

    expect(course.slug).toBe('didattica-digitale-inclusione-scolastica');
    expect(course.type).toBe('corso');
    expect(course.cfu).toBe(60);
    expect(course.heroImage).toEqual({
      src: '/assets/img/corsi/didattica-digitale-inclusione-hero.jpg',
      alt: 'Docente che utilizza una lavagna digitale interattiva in classe',
    });
    expect(course.promo).toEqual({
      priceCents: 49900,
      label: 'Promo Iscrizioni Anticipate',
      validUntil: '2026-12-31',
    });
    expect(course.riferimentiNormativi).toEqual([
      {
        label: 'D.M. 22 novembre 2019, n. 995 - Tabella di valutazione titoli GPS',
        url: 'https://www.miur.gov.it/documents/20182/0/DM+995_19.pdf',
      },
    ]);
    expect(course.puntiGraduatoria?.punti).toBe(3);
    expect(course.classiConcorso).toEqual([
      'ADSS - Sostegno Scuola Secondaria di Primo Grado',
      'ADSH - Sostegno Scuola Secondaria di Secondo Grado',
    ]);
  });

  it('mappa una riga certificazione (cfu null, promo tutta null)', () => {
    const course = mapCourseRow(buildCertificationCourseRow());

    expect(course.type).toBe('certificazione');
    expect(course.cfu).toBeUndefined();
    expect(course.promo).toBeUndefined();
    expect(course.riferimentiNormativi).toBeUndefined();
    expect(course.puntiGraduatoria).toBeUndefined();
    expect(course.classiConcorso).toBeUndefined();
    expect(course.programma).toBeUndefined();
  });

  it('lancia CourseMappingError se hero_image è malformato', () => {
    const row = buildFullCourseRow();
    row.hero_image = { src: '/img.jpg' }; // manca "alt"

    expect(() => mapCourseRow(row)).toThrowError(CourseMappingError);
  });

  it('lancia CourseMappingError se i campi promo sono parzialmente valorizzati', () => {
    const row = buildFullCourseRow();
    row.promo_label = null; // price e validUntil restano valorizzati: incoerente

    expect(() => mapCourseRow(row)).toThrowError(CourseMappingError);
  });

  it('lancia CourseMappingError se seo è malformato', () => {
    const row = buildCertificationCourseRow();
    row.seo = { metaTitle: 'Solo titolo' };

    expect(() => mapCourseRow(row)).toThrowError(CourseMappingError);
  });
});
