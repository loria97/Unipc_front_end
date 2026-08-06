import { NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { effectivePriceCents } from '../../../core/models/course-pricing';
import type { ProfessionalCourse } from '../../../core/models/course.model';
import type { DataError } from '../../../core/models/data-result';
import { vatRegimeLabel } from '../../../core/models/vat';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { CartService } from '../../../core/services/cart.service';
import { CoursesService } from '../../../core/services/courses.service';
import { EuroCentsPipe } from '../../../shared/pipes/euro-cents.pipe';

type ViewState = 'loading' | 'not-found' | 'error' | 'ready';

/**
 * Pagina di dettaglio di un corso/certificazione professionalizzante.
 * Ospita le due CTA di carrello che mancavano dalla Fase 2: senza questa
 * pagina, la card del catalogo (che linka a `['/corsi-professionalizzanti',
 * course.slug]`) finiva sulla route `**` (NotFound).
 *
 * Nessuna hero image: asset non disponibili, coerente con
 * `CourseCardComponent`.
 */
@Component({
  selector: 'unipc-course-detail',
  standalone: true,
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, RouterLink, EuroCentsPipe],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly cart = inject(CartService);
  private readonly cartDrawer = inject(CartDrawerService);

  private readonly now = new Date();

  readonly course = signal<ProfessionalCourse | null>(null);
  readonly loadError = signal<DataError | null>(null);
  readonly loading = signal(true);

  /** Annuncio per la regione `aria-live` al click su "Aggiungi al carrello". */
  readonly announcement = signal('');

  readonly viewState = computed<ViewState>(() => {
    if (this.loading()) {
      return 'loading';
    }
    const error = this.loadError();
    if (error) {
      return error.kind === 'not-found' ? 'not-found' : 'error';
    }
    return 'ready';
  });

  readonly pricing = computed(() => {
    const course = this.course();
    return course ? effectivePriceCents(course, this.now) : null;
  });

  /** `null` per `da_definire`: nessuna dicitura finché il regime non è deciso. */
  readonly vatLabel = computed(() => {
    const course = this.course();
    return course ? vatRegimeLabel(course.vatRegime) : null;
  });

  readonly isInCart = computed(() => {
    const course = this.course();
    return course !== null && this.cart.has(course.slug);
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        return;
      }
      this.load(slug);
    });
  }

  addToCart(): void {
    const course = this.course();
    if (!course) {
      return;
    }
    this.cart.add(course.slug);
    this.cartDrawer.open();
    this.announcement.set(`${course.title} aggiunto al carrello.`);
  }

  buyNow(): void {
    const course = this.course();
    if (!course) {
      return;
    }
    this.cart.add(course.slug);
    // TODO(fase-6): puntare a /checkout invece che alla pagina carrello.
    this.router.navigate(['/carrello']);
  }

  retry(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.load(slug);
    }
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.coursesService
      .getBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.loading.set(false);
        if (result.ok) {
          this.course.set(result.value);
          this.loadError.set(null);
          this.setSeo(result.value);
        } else {
          this.course.set(null);
          this.loadError.set(result.error);
        }
      });
  }

  private setSeo(course: ProfessionalCourse): void {
    this.titleService.setTitle(course.seo.metaTitle);
    this.meta.updateTag({ name: 'description', content: course.seo.metaDescription });
  }
}
