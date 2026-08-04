import type { ProfessionalCourse } from './course.model';

/**
 * Calcolo del prezzo da mostrare in vetrina, in centesimi interi.
 *
 * IMPORTANTE: questo valore serve solo per la UI (vetrina, card, hero del
 * corso). Il prezzo autorevole è sempre ricalcolato lato server (Edge
 * Function) al momento del checkout: il client non è mai la fonte di verità
 * sul totale da pagare.
 *
 * `now` è sempre passato come parametro esplicito — questa funzione non
 * chiama mai `new Date()` internamente per restare pura e testabile.
 */
export function effectivePriceCents(
  course: ProfessionalCourse,
  now: Date,
): { cents: number; isPromo: boolean } {
  if (!course.promo) {
    return { cents: course.listPriceCents, isPromo: false };
  }

  const promoActive = now.getTime() <= endOfDay(course.promo.validUntil).getTime();
  return promoActive
    ? { cents: course.promo.priceCents, isPromo: true }
    : { cents: course.listPriceCents, isPromo: false };
}

/**
 * `promo_valid_until` è una data SQL senza componente oraria
 * ("YYYY-MM-DD"). Semantica scelta: **inclusiva fino a fine giornata**
 * (23:59:59.999 locale) del giorno indicato. Un cliente che legge "promo
 * valida fino al 31/12" si aspetta di poter acquistare fino alla fine di
 * quel giorno, non dalla mezzanotte precedente.
 */
function endOfDay(sqlDate: string): Date {
  const [year, month, day] = sqlDate.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}
