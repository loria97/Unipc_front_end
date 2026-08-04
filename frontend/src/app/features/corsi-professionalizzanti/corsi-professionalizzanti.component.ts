import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
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
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CourseFilterCriteria, filterCourses } from '../../core/models/course-filter';
import type { CourseType, ProfessionalCourse } from '../../core/models/course.model';
import type { DataError } from '../../core/models/data-result';
import { CoursesService } from '../../core/services/courses.service';
import { CourseCardComponent } from '../../shared/components/course-card/course-card.component';
import { CourseCardSkeletonComponent } from '../../shared/components/course-card/course-card-skeleton.component';

/**
 * Costante sentinella usata per distinguere "il valore di `q` in arrivo
 * dai query param coincide con l'ultimo carattere digitato dall'utente"
 * (nessuna azione, l'utente sta ancora scrivendo) da "il valore in arrivo
 * viene da una navigazione esterna" (back, refresh, azzera filtri): solo nel
 * secondo caso il campo mostrato nell'input va riscritto. Vedi
 * `lastTypedSearch` più sotto.
 */
const NEVER_TYPED = Symbol('never-typed');

type ViewState = 'loading' | 'error' | 'empty' | 'ready';

const SKELETON_COUNT = 6;

function parseCourseType(value: string | null): CourseType | '' {
  return value === 'corso' || value === 'certificazione' ? value : '';
}

@Component({
  selector: 'unipc-corsi-professionalizzanti',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    CourseCardComponent,
    CourseCardSkeletonComponent,
  ],
  templateUrl: './corsi-professionalizzanti.component.html',
  styleUrl: './corsi-professionalizzanti.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorsiProfessionalizzantiComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  private readonly searchInput$ = new Subject<string>();

  // Ultimo valore digitato dall'utente nel campo di ricerca, non ancora
  // detto essere lo stesso `q` risultante nell'URL (il debounce introduce un
  // ritardo). Serve a distinguere, quando `queryParamMap` emette un nuovo
  // `q`, se il cambiamento viene dall'utente che sta ancora scrivendo
  // (nessuna azione: sovrascrivere l'input perderebbe i caratteri digitati
  // nel frattempo) oppure da una navigazione esterna — back, refresh, link
  // diretto, "azzera filtri" — nel qual caso l'input va sincronizzato.
  private lastTypedSearch: string | typeof NEVER_TYPED = NEVER_TYPED;

  // Stato locale come signal, coerente con la convenzione "Signals per lo
  // stato" del progetto.
  readonly searchTerm = signal('');
  /** Valore mostrato nel campo di ricerca: vedi `lastTypedSearch`. */
  readonly displayedSearchTerm = signal('');
  readonly selectedArea = signal('');
  readonly selectedType = signal<CourseType | ''>('');
  readonly allCourses = signal<ProfessionalCourse[]>([]);
  readonly areas = signal<string[]>([]);
  readonly loadError = signal<DataError | null>(null);
  readonly loading = signal(true);

  readonly skeletons: readonly number[] = Array.from({ length: SKELETON_COUNT }, (_, i) => i);
  readonly now = new Date();

  readonly filteredCourses = computed(() => {
    const criteria: CourseFilterCriteria = {
      q: this.searchTerm(),
      area: this.selectedArea(),
      tipo: this.selectedType(),
    };
    return filterCourses(this.allCourses(), criteria);
  });

  readonly viewState = computed<ViewState>(() => {
    if (this.loading()) {
      return 'loading';
    }
    if (this.loadError()) {
      return 'error';
    }
    if (this.filteredCourses().length === 0) {
      return 'empty';
    }
    return 'ready';
  });

  readonly resultsCountLabel = computed(() => {
    if (this.viewState() !== 'ready' && this.viewState() !== 'empty') {
      return '';
    }
    const count = this.filteredCourses().length;
    if (count === 0) {
      return 'Nessun corso trovato.';
    }
    return count === 1 ? '1 corso trovato.' : `${count} corsi trovati.`;
  });

  ngOnInit(): void {
    this.titleService.setTitle('Corsi Professionalizzanti | UNIPC');
    this.meta.updateTag({
      name: 'description',
      content:
        "Scopri i corsi e le certificazioni professionalizzanti UNIPC: percorsi per l'aggiornamento professionale, con CFU e certificazioni riconosciute.",
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params.get('q') ?? '';
      this.searchTerm.set(q);
      this.selectedArea.set(params.get('area') ?? '');
      this.selectedType.set(parseCourseType(params.get('tipo')));

      // Riscrivi il campo mostrato solo se il `q` in arrivo NON è quello
      // che l'utente ha appena digitato (navigazione esterna): altrimenti,
      // durante il debounce, l'eco del proprio input riporterebbe indietro
      // il cursore e cancellerebbe i caratteri digitati nel frattempo.
      if (q !== this.lastTypedSearch) {
        this.displayedSearchTerm.set(q);
        this.lastTypedSearch = q;
      }
    });

    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.navigateWithParams({ q: q.trim() || null }, true));

    this.coursesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.loading.set(false);
        if (result.ok) {
          this.allCourses.set(result.value);
          this.loadError.set(null);
        } else {
          this.loadError.set(result.error);
        }
      });

    // Derivata da `getAll()` dietro `shareReplay(1)`: nessuna query
    // aggiuntiva rispetto alla sottoscrizione sopra.
    this.coursesService
      .getAreas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.ok) {
          this.areas.set(result.value);
        }
      });
  }

  onSearchInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.lastTypedSearch = value.trim();
    this.searchInput$.next(value);
  }

  onAreaChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.navigateWithParams({ area: value || null }, false);
  }

  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.navigateWithParams({ tipo: value || null }, false);
  }

  resetFilters(): void {
    this.navigateWithParams({ q: null, area: null, tipo: null }, false);
  }

  retry(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.coursesService.refresh();
  }

  private navigateWithParams(params: Record<string, string | null>, replaceUrl: boolean): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
