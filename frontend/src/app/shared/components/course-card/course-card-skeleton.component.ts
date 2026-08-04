import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder di caricamento per `unipc-course-card`. Nessun `@Input`:
 * puramente decorativo, marcato `aria-hidden="true"` così gli screen reader
 * non annunciano righe vuote mentre i dati reali sono in caricamento.
 */
@Component({
  selector: 'unipc-course-card-skeleton',
  standalone: true,
  imports: [],
  templateUrl: './course-card-skeleton.component.html',
  styleUrl: './course-card-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCardSkeletonComponent {}
