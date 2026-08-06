import { InjectionToken } from '@angular/core';

/**
 * Registro dei servizi di terze parti — o comunque non strettamente
 * necessari — usati dal sito. Fonte di verità unica per banner, pannello
 * preferenze e tabella della cookie policy: nessuno dei tre scrive mai a
 * mano un nome, una durata o una categoria, tutti leggono da qui.
 */
export type ConsentCategory = 'necessari' | 'preferenze' | 'statistiche' | 'marketing';

/**
 * `storage` non è nella forma richiesta dal solo `{ name, duration,
 * purpose }`: senza sapere SE una voce è un cookie o una chiave di
 * `localStorage`/`sessionStorage`, `ConsentService.revoke()` non saprebbe
 * come cancellarla (`document.cookie = ...; Max-Age=0` non ha alcun effetto
 * su `localStorage`, e viceversa). Serve anche alla cookie policy, per non
 * chiamare "cookie" ciò che cookie non è.
 */
export type StorageKind = 'cookie' | 'localStorage' | 'sessionStorage';

export type ResourceKind = 'script' | 'stylesheet';

export interface ServiceStorageEntry {
  readonly name: string;
  readonly storage: StorageKind;
  readonly duration: string;
  readonly purpose: string;
}

export interface ThirdPartyService {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly category: ConsentCategory;
  readonly purpose: string;
  readonly cookies: readonly ServiceStorageEntry[];
  readonly privacyPolicyUrl?: string;
  /** URL della risorsa da iniettare (foglio di stile o script), se presente. */
  readonly scriptUrl?: string;
  /** Come iniettare `scriptUrl`: `<script>` o `<link rel="stylesheet">`. */
  readonly resourceKind?: ResourceKind;
  readonly preconnectUrls?: readonly string[];
  /**
   * `true` se togliere la risorsa dal DOM basta a disattivare il servizio
   * all'istante (es. un foglio di stile). Default `false`: `revoke()` deve
   * allora ricaricare la pagina, perché uno script già eseguito può aver
   * lasciato effetti (listener, variabili globali) che rimuovere il tag non
   * annulla.
   */
  readonly hotRemovable?: boolean;
}

export const CONSENT_CATEGORY_LABELS: Record<ConsentCategory, string> = {
  necessari: 'Necessari',
  preferenze: 'Preferenze',
  statistiche: 'Statistiche',
  marketing: 'Marketing',
};

/**
 * Contenuto reale del registro, esito dell'audit di tutto `frontend/src`
 * (unico servizio di terze parti trovato: Google Fonts, in `index.html`).
 * `carrello`, `preferenza-consenso` e `supabase-auth` sono tecnici propri
 * del sito, non di terze parti — restano `necessari` e non richiedono
 * consenso, ma si dichiarano comunque per completezza della cookie policy.
 */
export const THIRD_PARTY_SERVICES_REGISTRY: readonly ThirdPartyService[] = [
  {
    id: 'carrello',
    name: 'Carrello',
    provider: 'UNIPC',
    category: 'necessari',
    purpose:
      "Mantiene la lista dei corsi aggiunti al carrello da una visita all'altra, così non si perde quando si torna sul sito.",
    cookies: [
      {
        name: 'unipc.cart.v1',
        storage: 'localStorage',
        duration: 'Persistente (fino a rimozione manuale o svuotamento dei dati del browser)',
        purpose: 'Contiene gli slug dei corsi in carrello e la data di aggiunta di ciascuno.',
      },
    ],
  },
  {
    id: 'preferenza-consenso',
    name: 'Preferenze di consenso',
    provider: 'UNIPC',
    category: 'necessari',
    purpose:
      'Ricorda le scelte espresse su questo banner (quali categorie hai accettato), per non richiederle di nuovo a ogni visita.',
    cookies: [
      {
        name: 'unipc.consent.v1',
        storage: 'localStorage',
        duration: '6 mesi',
        purpose: 'Contiene le categorie accettate o rifiutate e la data della scelta.',
      },
    ],
  },
  {
    id: 'supabase-auth',
    name: 'Autenticazione Supabase',
    provider: 'Supabase Inc.',
    category: 'necessari',
    purpose:
      "Manterrà l'accesso autenticato dopo il login. Non ancora scritta: nasce con la Fase 4 (registrazione e accesso). Dichiarata qui in anticipo perché la cookie policy resti completa fin da oggi.",
    cookies: [
      {
        name: 'sb-vaalcinlzvynxapaktea-auth-token',
        storage: 'localStorage',
        duration: 'Durata della sessione, con refresh automatico del token',
        purpose: "Conterrà il token di accesso, una volta attivo il login.",
      },
    ],
    privacyPolicyUrl: 'https://supabase.com/privacy',
  },
  {
    id: 'google-fonts',
    name: 'Google Fonts',
    provider: 'Google Ireland Ltd.',
    category: 'preferenze',
    purpose:
      'Carica i caratteri tipografici Fraunces e Plus Jakarta Sans dai server di Google. Non imposta cookie, ma la richiesta trasmette l\'indirizzo IP del browser a Google.',
    cookies: [],
    privacyPolicyUrl: 'https://policies.google.com/privacy',
    scriptUrl:
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    resourceKind: 'stylesheet',
    preconnectUrls: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    // Togliere il <link> ripristina all'istante i font di fallback
    // dichiarati in `_tokens.scss` (Georgia/system-ui): nessun reload
    // necessario alla revoca.
    hotRemovable: true,
  },
];

export const THIRD_PARTY_SERVICES = new InjectionToken<readonly ThirdPartyService[]>('THIRD_PARTY_SERVICES', {
  providedIn: 'root',
  factory: () => THIRD_PARTY_SERVICES_REGISTRY,
});

/**
 * Hash FNV-1a a 32 bit, esadecimale, su una stringa canonica costruita da
 * `id + categoria + nomi degli storage dichiarati` di ogni servizio,
 * ordinata in modo deterministico. Cambia se un servizio viene aggiunto,
 * rimosso, spostato di categoria o se cambia una chiave di storage; **non**
 * cambia se cambiano solo `name`/`purpose` — correggere un refuso in una
 * descrizione non deve invalidare il consenso già espresso da tutti gli
 * utenti. Nessuno deve ricordarsi di incrementare un numero a mano.
 */
export function consentRegistryVersion(services: readonly ThirdPartyService[]): string {
  const canonical = [...services]
    .map((service) => {
      const storageNames = [...service.cookies]
        .map((entry) => entry.name)
        .sort()
        .join(',');
      return `${service.id}|${service.category}|${storageNames}`;
    })
    .sort()
    .join(';');

  return fnv1a32(canonical);
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
