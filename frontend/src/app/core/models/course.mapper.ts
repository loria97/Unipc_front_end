// Insieme a `course.model.ts` e `supabase.service.ts`, questo è l'unico file
// che importa `database.types.ts`: nessun componente o servizio a valle deve
// conoscere lo schema grezzo della tabella `courses`.
import type { Json, Tables } from './database.types';
import type {
  CourseGraduatoriaPoints,
  CourseHeroImage,
  CourseNormRef,
  CoursePromo,
  CourseSeo,
  CourseType,
  ProfessionalCourse,
  VatRegime,
} from './course.model';

/**
 * Lanciato quando un jsonb della riga `courses` (o un campo enum-like) non
 * rispetta la forma attesa dal dominio. Nessun fallback silenzioso: una
 * pagina corso con dati rotti non deve mai essere pubblicata mostrando
 * contenuti parziali o inventati.
 */
export class CourseMappingError extends Error {
  constructor(
    public readonly slug: string,
    public readonly field: string,
    reason: string,
  ) {
    super(`Corso "${slug}": campo "${field}" malformato — ${reason}`);
    this.name = 'CourseMappingError';
  }
}

function isJsonRecord(value: Json): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonArray(value: Json): value is Json[] {
  return Array.isArray(value);
}

function isNonEmptyString(value: Json | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseHeroImage(json: Json, slug: string): CourseHeroImage {
  if (!isJsonRecord(json)) {
    throw new CourseMappingError(slug, 'hero_image', 'atteso un oggetto { src, alt }');
  }
  const { src, alt } = json;
  if (!isNonEmptyString(src) || !isNonEmptyString(alt)) {
    throw new CourseMappingError(slug, 'hero_image', 'campi "src"/"alt" mancanti o non stringa');
  }
  return { src, alt };
}

function parseSeo(json: Json, slug: string): CourseSeo {
  if (!isJsonRecord(json)) {
    throw new CourseMappingError(slug, 'seo', 'atteso un oggetto { metaTitle, metaDescription }');
  }
  const { metaTitle, metaDescription } = json;
  if (!isNonEmptyString(metaTitle) || !isNonEmptyString(metaDescription)) {
    throw new CourseMappingError(
      slug,
      'seo',
      'campi "metaTitle"/"metaDescription" mancanti o non stringa',
    );
  }
  return { metaTitle, metaDescription };
}

function parseRiferimentiNormativi(json: Json, slug: string): CourseNormRef[] {
  if (!isJsonArray(json)) {
    throw new CourseMappingError(slug, 'riferimenti_normativi', 'atteso un array di { label, url }');
  }
  return json.map((item, index) => {
    if (!isJsonRecord(item)) {
      throw new CourseMappingError(
        slug,
        `riferimenti_normativi[${index}]`,
        'atteso un oggetto { label, url }',
      );
    }
    const { label, url } = item;
    if (!isNonEmptyString(label) || !isNonEmptyString(url)) {
      throw new CourseMappingError(
        slug,
        `riferimenti_normativi[${index}]`,
        'campi "label"/"url" mancanti o non stringa',
      );
    }
    return { label, url };
  });
}

function parsePuntiGraduatoria(json: Json, slug: string): CourseGraduatoriaPoints {
  if (!isJsonRecord(json)) {
    throw new CourseMappingError(slug, 'punti_graduatoria', 'atteso un oggetto { punti, note }');
  }
  const { punti, note } = json;
  if (typeof punti !== 'number' || !isNonEmptyString(note)) {
    throw new CourseMappingError(
      slug,
      'punti_graduatoria',
      'campi "punti"/"note" mancanti o di tipo errato',
    );
  }
  return { punti, note };
}

function parseCourseType(value: string, slug: string): CourseType {
  if (value === 'corso' || value === 'certificazione') {
    return value;
  }
  throw new CourseMappingError(slug, 'type', `valore "${value}" non riconosciuto`);
}

function parseVatRegime(value: string, slug: string): VatRegime {
  if (value === 'esente_art10' || value === 'iva_22' || value === 'da_definire') {
    return value;
  }
  throw new CourseMappingError(slug, 'vat_regime', `valore "${value}" non riconosciuto`);
}

/**
 * `promo_price_cents`, `promo_label`, `promo_valid_until` devono essere tutti
 * `null` (nessuna promo) o tutti valorizzati (promo attiva/futura/scaduta).
 * Una combinazione parziale è un dato incoerente: si lancia sempre.
 */
function parsePromo(row: Tables<'courses'>): CoursePromo | undefined {
  const { promo_price_cents: priceCents, promo_label: label, promo_valid_until: validUntil, slug } = row;

  if (priceCents === null && label === null && validUntil === null) {
    return undefined;
  }
  if (priceCents === null || label === null || validUntil === null) {
    throw new CourseMappingError(
      slug,
      'promo_*',
      'promo_price_cents/promo_label/promo_valid_until devono essere tutti null o tutti valorizzati',
    );
  }

  return { priceCents, label, validUntil };
}

export function mapCourseRow(row: Tables<'courses'>): ProfessionalCourse {
  const heroImage = parseHeroImage(row.hero_image, row.slug);
  const seo = parseSeo(row.seo, row.slug);
  const riferimentiNormativi =
    row.riferimenti_normativi !== null
      ? parseRiferimentiNormativi(row.riferimenti_normativi, row.slug)
      : undefined;
  const puntiGraduatoria =
    row.punti_graduatoria !== null ? parsePuntiGraduatoria(row.punti_graduatoria, row.slug) : undefined;

  return {
    slug: row.slug,
    title: row.title,
    type: parseCourseType(row.type, row.slug),
    area: row.area,

    abstract: row.abstract,
    heroImage,
    aChiERivolto: row.a_chi_e_rivolto,
    obiettivi: row.obiettivi,
    requisitiAmmissione: row.requisiti_ammissione,
    programma: row.programma ?? undefined,

    durataOre: row.durata_ore,
    durataLabel: row.durata_label,
    modalita: row.modalita,
    cfu: row.cfu ?? undefined,
    provePreviste: row.prove_previste ?? undefined,
    classiConcorso: row.classi_concorso ?? undefined,

    listPriceCents: row.list_price_cents,
    vatRegime: parseVatRegime(row.vat_regime, row.slug),
    promo: parsePromo(row),

    riferimentiNormativi,
    puntiGraduatoria,

    seo,
  };
}
