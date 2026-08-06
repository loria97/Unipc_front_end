import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { effectivePriceCents } from '../../../core/models/course-pricing';
import type { ProfessionalCourse } from '../../../core/models/course.model';
import { vatRegimeLabel } from '../../../core/models/vat';
import { EuroCentsPipe } from '../../pipes/euro-cents.pipe';

/**
 * Card riusabile per un corso/certificazione professionalizzante. Un solo
 * `<a>` avvolge tutto il contenuto (badge, titolo, abstract, durata, CFU se
 * presente, prezzo, CTA testuale): nessun link/bottone annidato, per restare
 * valida come markup e navigabile da tastiera con un solo elemento a fuoco
 * per card.
 *
 * L'hero image non è renderizzata per il momento (vedi `course.model.ts`,
 * `heroImage` resta nel dominio dati ma inutilizzato qui): da reintrodurre
 * quando saranno disponibili asset reali.
 */
@Component({
  selector: 'unipc-course-card',
  standalone: true,
  imports: [NgIf, RouterLink, EuroCentsPipe],
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCardComponent {
  @Input({ required: true }) course!: ProfessionalCourse;

  /** Iniettabile nei test per rendere deterministico `effectivePriceCents`. */
  @Input() now: Date = new Date();

  get pricing(): { cents: number; isPromo: boolean } {
    return effectivePriceCents(this.course, this.now);
  }

  get typeLabel(): string {
    return this.course.type === 'certificazione' ? 'Certificazione' : 'Corso';
  }

  /** `null` per `da_definire`: nessuna dicitura finché il regime non è deciso. */
  get vatLabel(): string | null {
    return vatRegimeLabel(this.course.vatRegime);
  }
}
