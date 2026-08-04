import type { CourseType, ProfessionalCourse } from './course.model';

/**
 * Criteri di filtro per l'elenco dei corsi professionalizzanti. Stringa
 * vuota `''` significa "nessun filtro attivo su quel criterio" — sia per
 * `q` sia per `area`/`tipo` — così l'oggetto di default (tutti i campi a
 * `''`) rappresenta "mostra tutto" senza bisogno di `undefined`/`null`.
 */
export interface CourseFilterCriteria {
  q: string;
  area: string;
  tipo: CourseType | '';
}

/**
 * Filtro puro, senza dipendenze da Angular né da Supabase: applicato in
 * memoria sull'elenco già caricato da `CoursesService.getAll()`.
 *
 * - `q`: match case-insensitive su `title` OPPURE `abstract`.
 * - `area`/`tipo`: uguaglianza esatta, case-sensitive (i valori provengono
 *   da un elenco chiuso derivato dai corsi stessi o da un `<select>`, non da
 *   testo libero).
 */
export function filterCourses(
  courses: ProfessionalCourse[],
  criteria: CourseFilterCriteria,
): ProfessionalCourse[] {
  const q = criteria.q.trim().toLowerCase();

  return courses.filter((course) => {
    const matchesQ =
      q.length === 0 ||
      course.title.toLowerCase().includes(q) ||
      course.abstract.toLowerCase().includes(q);
    const matchesArea = criteria.area.length === 0 || course.area === criteria.area;
    const matchesTipo = criteria.tipo.length === 0 || course.type === criteria.tipo;

    return matchesQ && matchesArea && matchesTipo;
  });
}
