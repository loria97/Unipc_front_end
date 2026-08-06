import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  CartItem,
  CartStorageV1,
  CartStoredItem,
  cartTotalCents,
  parseCartStorage,
} from '../models/cart.model';
import { effectivePriceCents } from '../models/course-pricing';
import type { ProfessionalCourse } from '../models/course.model';
import type { DataError } from '../models/data-result';
import { CoursesService } from './courses.service';

/**
 * Carrello lato client: signals per lo stato, persistenza versionata in
 * `localStorage` (vedi `cart.model.ts`). Un corso può stare in carrello una
 * sola volta (iscrizioni nominative, quantità sempre 1).
 *
 * Non è mai la fonte di verità sul prezzo: `totalCents` serve solo per la
 * UI, il totale autorevole si ricalcola sempre lato server al checkout.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly coursesService = inject(CoursesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stored = signal<CartStoredItem[]>(parseCartStorage(this.read()));
  private readonly catalog = signal<ProfessionalCourse[] | null>(null);

  // Come `CourseCardComponent`: catturato una sola volta per restare
  // deterministico durante il ciclo di vita del servizio (non `new Date()`
  // ad ogni lettura).
  private readonly now = new Date();

  private catalogRequested = false;

  private readonly loadErrorSignal = signal<DataError | null>(null);
  readonly loadError = this.loadErrorSignal.asReadonly();

  // Finché il catalogo non è arrivato, il badge legge la lunghezza degli
  // slug memorizzati: evita che il contatore lampeggi 0 -> N al primo
  // render (il catalogo arriva async, gli slug sono sincroni da subito).
  readonly count = computed(() => (this.catalog() === null ? this.stored().length : this.items().length));

  // Esclude il caso di errore: senza questo, un fallimento di rete
  // lascerebbe `isLoading` vero per sempre (il catalogo non arriva mai) e la
  // UI resterebbe bloccata su uno spinner infinito invece di mostrare un
  // errore con "Riprova".
  readonly isLoading = computed(
    () => this.stored().length > 0 && this.catalog() === null && this.loadErrorSignal() === null,
  );

  readonly items = computed<CartItem[]>(() => {
    const catalog = this.catalog();
    if (catalog === null) {
      return [];
    }
    const bySlug = new Map(catalog.map((course) => [course.slug, course]));
    const result: CartItem[] = [];
    for (const entry of this.stored()) {
      const course = bySlug.get(entry.slug);
      if (!course) {
        continue;
      }
      const pricing = effectivePriceCents(course, this.now);
      result.push({
        slug: entry.slug,
        addedAt: entry.addedAt,
        course,
        priceCents: pricing.cents,
        isPromo: pricing.isPromo,
      });
    }
    return result;
  });

  readonly totalCents = computed(() =>
    cartTotalCents(
      this.items().map((item) => item.course),
      this.now,
    ),
  );

  constructor() {
    // Solo se il carrello non è vuoto: home e pagine senza carrello non
    // fanno alcuna query in più rispetto a oggi.
    if (this.stored().length > 0) {
      this.ensureCatalogLoaded();
    }
  }

  has(slug: string): boolean {
    return this.stored().some((item) => item.slug === slug);
  }

  add(slug: string): void {
    // Sempre, anche su no-op: un utente che atterra direttamente sul
    // dettaglio con carrello vuoto deve comunque veder reidratato lo slug
    // appena aggiunto.
    this.ensureCatalogLoaded();

    if (this.has(slug)) {
      // Iscrizioni nominative, quantità sempre 1: nessun errore, nessun duplicato.
      return;
    }
    const next = [...this.stored(), { slug, addedAt: new Date().toISOString() }];
    this.stored.set(next);
    this.persist(next);
  }

  remove(slug: string): void {
    const next = this.stored().filter((item) => item.slug !== slug);
    this.stored.set(next);
    this.persist(next);
  }

  clear(): void {
    this.stored.set([]);
    this.persist([]);
  }

  /** Riprova a caricare il catalogo dopo un errore (bottone "Riprova" in UI). */
  retryLoad(): void {
    this.catalogRequested = false;
    this.loadErrorSignal.set(null);
    this.ensureCatalogLoaded();
  }

  private ensureCatalogLoaded(): void {
    if (this.catalogRequested) {
      return;
    }
    this.catalogRequested = true;

    this.coursesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result.ok) {
          // Errore di rete transitorio: mai cancellare slug per questo. Il
          // carrello resta senza catalogo (invece di svuotarsi) e la UI
          // mostra uno stato di errore con "Riprova" invece di uno spinner
          // infinito. `catalogRequested` torna `false` solo tramite
          // `retryLoad()`, non qui: un errore non deve far ripartire da
          // solo una nuova richiesta a ogni lettura di un signal.
          this.loadErrorSignal.set(result.error);
          return;
        }
        this.loadErrorSignal.set(null);
        this.catalog.set(result.value);

        const validSlugs = new Set(result.value.map((course) => course.slug));
        const cleaned = this.stored().filter((item) => validSlugs.has(item.slug));
        if (cleaned.length !== this.stored().length) {
          // Uno slug memorizzato non compare più tra i corsi pubblicati
          // (rimosso/spubblicato): scartato silenziosamente e lo storage
          // riscritto ripulito.
          this.stored.set(cleaned);
          this.persist(cleaned);
        }
      });
  }

  private persist(items: CartStoredItem[]): void {
    this.write({ version: CART_STORAGE_VERSION, items });
  }

  private read(): string | null {
    try {
      return window.localStorage.getItem(CART_STORAGE_KEY);
    } catch {
      // Storage indisponibile (modalità privata, permessi negati): si
      // prosegue in memoria, nessuna eccezione.
      return null;
    }
  }

  private write(payload: CartStorageV1): void {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage indisponibile o `QuotaExceededError`: la mutazione resta
      // valida in memoria (il signal è già aggiornato), solo la
      // persistenza fallisce silenziosamente.
    }
  }
}
