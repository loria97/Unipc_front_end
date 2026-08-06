import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  CONSENT_RECORD_VERSION,
  CONSENT_STORAGE_KEY,
  ConsentRecordV1,
  parseConsentRecord,
} from '../consent/consent-storage';
import { ConsentCategory, THIRD_PARTY_SERVICES, consentRegistryVersion } from '../consent/third-party-services';

const ALL_CATEGORIES: readonly ConsentCategory[] = ['necessari', 'preferenze', 'statistiche', 'marketing'];

/**
 * Stato del consenso: signals in lettura, persistenza versionata in
 * `localStorage` (vedi `consent-storage.ts`). Nessuna prova di consenso lato
 * server in questo lavoro (solo `localStorage`, decisione presa con
 * l'utente): la tabella `consents` resta aperta per un lavoro futuro.
 *
 * La lettura di `localStorage` avviene **sincrona nel costruttore**:
 * essenziale perché il banner sia già deciso al primo render (nessun
 * layout shift, vedi `cookie-banner.component.ts`).
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly services = inject(THIRD_PARTY_SERVICES);
  private readonly registryVersion = consentRegistryVersion(this.services);

  private readonly recordSignal = signal<ConsentRecordV1 | null>(
    parseConsentRecord(this.read(), this.registryVersion, new Date()),
  );

  /** Categorie ≠ `necessari` con almeno un servizio nel registro: sono le uniche che banner e pannello mostrano. */
  readonly configurableCategories: Signal<ConsentCategory[]> = computed(() => {
    const categoriesWithService = new Set(this.services.map((service) => service.category));
    return ALL_CATEGORIES.filter((category) => category !== 'necessari' && categoriesWithService.has(category));
  });

  /** Il banner compare solo se c'è qualcosa da chiedere e nessuna scelta è stata ancora salvata. */
  readonly shouldShowBanner: Signal<boolean> = computed(
    () => this.configurableCategories().length > 0 && this.recordSignal() === null,
  );

  readonly preferences: Signal<Record<ConsentCategory, boolean>> = computed(() => {
    const record = this.recordSignal();
    const result = {} as Record<ConsentCategory, boolean>;
    for (const category of ALL_CATEGORIES) {
      result[category] = category === 'necessari' ? true : (record?.categories[category] ?? false);
    }
    return result;
  });

  /** `necessari` è sempre vera, a prescindere dal record: non è mai stata negoziabile. */
  hasConsent(category: ConsentCategory): boolean {
    if (category === 'necessari') {
      return true;
    }
    return this.recordSignal()?.categories[category] ?? false;
  }

  acceptAll(): void {
    this.persist(this.buildCategories(() => true));
  }

  /**
   * Rifiuta tutte le categorie opzionali. Produce **lo stesso** record della
   * chiusura del banner (X) o di `Esc` sul pannello: tutte le opzionali
   * `false`, `decidedAt` valorizzato — il banner non riappare per 6 mesi.
   */
  rejectAll(): void {
    this.persist(this.buildCategories(() => false));
  }

  /** `necessari` non è disattivabile: viene forzata a `true` anche se `preferences` prova a spegnerla. */
  save(preferences: Partial<Record<ConsentCategory, boolean>>): void {
    this.persist(this.buildCategories((category) => preferences[category] ?? false));
  }

  /**
   * Revoca il consenso alle categorie indicate: cancella lo storage
   * dichiarato dai servizi di quelle categorie (mai quelli `necessari`) e,
   * se anche un solo servizio coinvolto non è `hotRemovable`, ricarica la
   * pagina — la rimozione del solo tag DOM non basterebbe a disattivarlo.
   *
   * `ScriptLoaderService` non viene chiamato direttamente da qui: dipende
   * da `ConsentService` (legge `hasConsent()` in un `effect()`) e non il
   * contrario, per evitare un ciclo di dependency injection tra i due
   * (Angular lo rileverebbe come NG0200). Il flag `hotRemovable`, che serve
   * solo a decidere il reload, è letto direttamente dal registro.
   *
   * Senza argomenti: rappresenta un opt-out esplicito e completo (pensato
   * per un eventuale link "Revoca il consenso" nella cookie policy). In
   * quel caso azzera anche il record stesso, così il banner ricompare.
   * Con argomenti: revoca granulare interna, usata da `persist()` quando
   * `save()`/`rejectAll()` fanno perdere il consenso a una categoria prima
   * concessa — il record, già riscritto da `persist()`, resta.
   */
  revoke(categories?: readonly ConsentCategory[]): void {
    const explicit = categories !== undefined;
    const current = this.preferences();
    const targets = explicit
      ? categories.filter((category) => category !== 'necessari')
      : this.configurableCategories().filter((category) => current[category]);

    if (targets.length === 0) {
      return;
    }

    for (const category of targets) {
      this.clearCategoryStorage(category);
    }

    if (!explicit) {
      this.recordSignal.set(null);
      this.removeStoredRecord();
    }

    if (this.needsReload(targets)) {
      this.reloadPage();
    }
  }

  // Campo di istanza, non metodo di prototipo: `window.location.reload` non
  // è ridefinibile nei browser moderni (proprietà non configurabile), quindi
  // `spyOn(window.location, 'reload')` fallisce nei test. Un campo assegnato
  // in istanza si può sovrascrivere per singolo test senza toccare l'oggetto
  // globale `window.location`.
  private reloadPage: () => void = () => window.location.reload();

  private buildCategories(resolve: (category: ConsentCategory) => boolean): Record<ConsentCategory, boolean> {
    const result = {} as Record<ConsentCategory, boolean>;
    for (const category of ALL_CATEGORIES) {
      result[category] = category === 'necessari' ? true : resolve(category);
    }
    return result;
  }

  private persist(categories: Record<ConsentCategory, boolean>): void {
    const previous = this.preferences();
    const record: ConsentRecordV1 = {
      version: CONSENT_RECORD_VERSION,
      registryVersion: this.registryVersion,
      decidedAt: new Date().toISOString(),
      categories,
    };

    this.recordSignal.set(record);
    this.write(record);

    const revoked = ALL_CATEGORIES.filter(
      (category) => category !== 'necessari' && previous[category] && !categories[category],
    );
    if (revoked.length > 0) {
      this.revoke(revoked);
    }
  }

  private needsReload(categories: readonly ConsentCategory[]): boolean {
    return this.services.some((service) => categories.includes(service.category) && service.hotRemovable !== true);
  }

  private clearCategoryStorage(category: ConsentCategory): void {
    for (const service of this.services) {
      if (service.category !== category) {
        continue;
      }
      for (const entry of service.cookies) {
        this.clearStorageEntry(entry.name, entry.storage);
      }
    }
  }

  private clearStorageEntry(name: string, storage: 'cookie' | 'localStorage' | 'sessionStorage'): void {
    try {
      switch (storage) {
        case 'cookie':
          // `domain` non specificato: cancella sull'host corrente, dove il
          // cookie sarebbe stato impostato da uno script caricato da questo
          // sito tramite `ScriptLoaderService`.
          document.cookie = `${name}=; Max-Age=0; path=/`;
          break;
        case 'localStorage':
          window.localStorage.removeItem(name);
          break;
        case 'sessionStorage':
          window.sessionStorage.removeItem(name);
          break;
      }
    } catch {
      // Storage indisponibile: nessuna eccezione da propagare, stesso
      // pattern di `CartService.read()/write()`.
    }
  }

  private read(): string | null {
    try {
      return window.localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private write(record: ConsentRecordV1): void {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Storage indisponibile o quota superata: la scelta resta valida in
      // memoria (il signal è già aggiornato), solo la persistenza fallisce
      // silenziosamente.
    }
  }

  private removeStoredRecord(): void {
    try {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // Nessuna eccezione da propagare.
    }
  }
}
