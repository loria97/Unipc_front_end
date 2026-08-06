import { Injectable, effect, inject } from '@angular/core';
import { THIRD_PARTY_SERVICES } from '../consent/third-party-services';
import { ConsentService } from './consent.service';

/**
 * Unico punto autorizzato a iniettare risorse di terze parti nel DOM
 * (regola non negoziabile del progetto). Un `effect()` nel costruttore
 * allinea da solo il DOM ai consensi correnti: nessun componente deve
 * chiamare `load()`/`unload()` a mano, li richiama solo questo servizio.
 *
 * Dipende da `ConsentService` in una sola direzione (legge `hasConsent()`):
 * `ConsentService` non dipende mai da questo servizio, per evitare un ciclo
 * di dependency injection tra i due (Angular lo rileverebbe come NG0200,
 * dato che entrambi sono `providedIn: 'root'`). La cancellazione dello
 * storage per le categorie revocate resta quindi responsabilità di
 * `ConsentService.revoke()`; questo servizio si limita a (dis)iniettare gli
 * elementi DOM in reazione al consenso corrente.
 */
@Injectable({ providedIn: 'root' })
export class ScriptLoaderService {
  private readonly consent = inject(ConsentService);
  private readonly services = inject(THIRD_PARTY_SERVICES);

  // id servizio -> elementi DOM iniettati per quel servizio (preconnect +
  // script/link). Permette due cose: idempotenza di `load()` (non inietta
  // due volte lo stesso servizio) e la rimozione mirata in `unload()`.
  private readonly injectedElements = new Map<string, HTMLElement[]>();

  constructor() {
    effect(() => {
      for (const service of this.services) {
        if (!service.scriptUrl) {
          // Nessuna risorsa da (dis)iniettare per questo servizio (es. i
          // servizi tecnici del sito, che non caricano nulla da terzi).
          continue;
        }
        if (this.consent.hasConsent(service.category)) {
          this.load(service.id);
        } else {
          this.unload(service.id);
        }
      }
    });
  }

  /**
   * Inietta la risorsa del servizio nel DOM. Esce senza fare nulla se il
   * servizio non esiste nel registro, non dichiara `scriptUrl`, o manca il
   * consenso alla sua categoria — così un uso improprio da un componente
   * (che non dovrebbe mai chiamarlo direttamente) non aggira comunque il
   * consenso. Idempotente: chiamate ripetute non producono tag doppi.
   */
  load(serviceId: string): boolean {
    const service = this.services.find((candidate) => candidate.id === serviceId);
    if (!service || !service.scriptUrl) {
      return false;
    }
    if (!this.consent.hasConsent(service.category)) {
      return false;
    }
    if (this.injectedElements.has(serviceId)) {
      return true;
    }

    const elements: HTMLElement[] = [];

    for (const url of service.preconnectUrls ?? []) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      document.head.appendChild(link);
      elements.push(link);
    }

    if (service.resourceKind === 'stylesheet') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = service.scriptUrl;
      document.head.appendChild(link);
      elements.push(link);
    } else {
      const script = document.createElement('script');
      script.src = service.scriptUrl;
      script.async = true;
      document.head.appendChild(script);
      elements.push(script);
    }

    this.injectedElements.set(serviceId, elements);
    return true;
  }

  /**
   * Rimuove gli elementi iniettati per il servizio, solo se dichiarato
   * `hotRemovable`. Restituisce `false` altrimenti: è il segnale che chi
   * revoca il consenso (`ConsentService.revoke()`, che legge lo stesso
   * flag direttamente dal registro) deve proporre un reload della pagina
   * invece di limitarsi a rimuovere il tag.
   */
  unload(serviceId: string): boolean {
    const service = this.services.find((candidate) => candidate.id === serviceId);
    if (!service || service.hotRemovable !== true) {
      return false;
    }

    const elements = this.injectedElements.get(serviceId);
    if (elements) {
      for (const element of elements) {
        element.remove();
      }
      this.injectedElements.delete(serviceId);
    }
    return true;
  }
}
