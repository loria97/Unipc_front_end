import { CONSENT_CATEGORY_LABELS, StorageKind, ThirdPartyService } from './third-party-services';

const STORAGE_KIND_LABELS: Record<StorageKind, string> = {
  cookie: 'Cookie',
  localStorage: 'Local storage',
  sessionStorage: 'Session storage',
};

export interface CookieTableRow {
  servizio: string;
  titolare: string;
  nome: string;
  tipoStorage: string;
  durata: string;
  finalita: string;
  categoria: string;
}

/**
 * Righe della tabella della cookie policy, generate dal registro: una riga
 * per ogni voce di storage dichiarata da ciascun servizio. Un servizio
 * senza storage dichiarati (oggi solo Google Fonts, che non imposta
 * cookie) produce comunque una riga informativa (`nome`/`tipoStorage`/
 * `durata` valorizzati a "—"), così compare in tabella anche se non scrive
 * nulla nel browser. **Mai scritta a mano**: cambia il registro, cambia la
 * tabella.
 */
export function cookieTableRows(services: readonly ThirdPartyService[]): CookieTableRow[] {
  const rows: CookieTableRow[] = [];

  for (const service of services) {
    const categoria = CONSENT_CATEGORY_LABELS[service.category];

    if (service.cookies.length === 0) {
      rows.push({
        servizio: service.name,
        titolare: service.provider,
        nome: '—',
        tipoStorage: '—',
        durata: '—',
        finalita: service.purpose,
        categoria,
      });
      continue;
    }

    for (const entry of service.cookies) {
      rows.push({
        servizio: service.name,
        titolare: service.provider,
        nome: entry.name,
        tipoStorage: STORAGE_KIND_LABELS[entry.storage],
        durata: entry.duration,
        finalita: entry.purpose,
        categoria,
      });
    }
  }

  return rows;
}
