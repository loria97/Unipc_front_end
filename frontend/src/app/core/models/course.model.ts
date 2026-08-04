/**
 * Modello di dominio dei corsi professionalizzanti, indipendente dallo schema
 * di Supabase: nessuna dipendenza da `database.types.ts`. La conversione
 * riga DB -> `ProfessionalCourse` avviene esclusivamente in `course.mapper.ts`.
 */

export type CourseType = 'corso' | 'certificazione';

export type VatRegime = 'esente_art10' | 'iva_22' | 'da_definire';

/**
 * Riga di testo che può contenere markup HTML inline limitato a tag sicuri:
 * `<strong>`, `<em>`, `<a href="...">`. È responsabilità del layer di
 * presentazione sanificare/renderizzare in modo sicuro (mai markup arbitrario
 * non controllato).
 */
export type RichTextLine = string;

export interface CourseHeroImage {
  src: string;
  alt: string;
}

export interface CourseSeo {
  metaTitle: string;
  metaDescription: string;
}

export interface CourseNormRef {
  label: string;
  url: string;
}

export interface CourseGraduatoriaPoints {
  punti: number;
  note: string;
}

export interface CoursePromo {
  /** Prezzo promozionale in centesimi interi. */
  priceCents: number;
  label: string;
  /**
   * Data (SQL date "YYYY-MM-DD") fino a cui la promo è valida, inclusiva
   * fino a fine giornata locale (23:59:59.999). Vedi `course-pricing.ts`.
   */
  validUntil: string;
}

export interface ProfessionalCourse {
  // Identità
  slug: string;
  title: string;
  type: CourseType;
  area: string;

  // Contenuti
  abstract: string;
  heroImage: CourseHeroImage;
  aChiERivolto: RichTextLine[];
  obiettivi: RichTextLine[];
  requisitiAmmissione: RichTextLine[];
  programma?: RichTextLine[];

  // Specifiche
  durataOre: number;
  durataLabel: string;
  modalita: string;
  /** Assente (mai `null`) per le certificazioni. */
  cfu?: number;
  provePreviste?: string[];
  classiConcorso?: string[];

  // Prezzo — sempre in centesimi interi. Il totale finale è comunque
  // ricalcolato lato server: questi valori servono solo per la vetrina.
  listPriceCents: number;
  vatRegime: VatRegime;
  promo?: CoursePromo;

  // Normativa, opzionale
  riferimentiNormativi?: CourseNormRef[];
  puntiGraduatoria?: CourseGraduatoriaPoints;

  // SEO
  seo: CourseSeo;
}
