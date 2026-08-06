import { cookieTableRows } from './cookie-table';
import type { ThirdPartyService } from './third-party-services';

const SERVICES: ThirdPartyService[] = [
  {
    id: 'con-storage',
    name: 'Servizio Con Storage',
    provider: 'Provider A',
    category: 'necessari',
    purpose: 'Scopo A',
    cookies: [{ name: 'chiave-a', storage: 'localStorage', duration: 'persistente', purpose: 'Finalità A' }],
  },
  {
    id: 'senza-storage',
    name: 'Servizio Senza Storage',
    provider: 'Provider B',
    category: 'preferenze',
    purpose: 'Scopo B',
    cookies: [],
  },
];

describe('cookieTableRows', () => {
  it('genera una riga per ogni voce di storage dichiarata', () => {
    const rows = cookieTableRows(SERVICES);
    const row = rows.find((r) => r.servizio === 'Servizio Con Storage');

    expect(row).toEqual({
      servizio: 'Servizio Con Storage',
      titolare: 'Provider A',
      nome: 'chiave-a',
      tipoStorage: 'Local storage',
      durata: 'persistente',
      finalita: 'Finalità A',
      categoria: 'Necessari',
    });
  });

  it('genera comunque una riga informativa per un servizio senza storage dichiarati', () => {
    const rows = cookieTableRows(SERVICES);
    const row = rows.find((r) => r.servizio === 'Servizio Senza Storage');

    expect(row).toEqual({
      servizio: 'Servizio Senza Storage',
      titolare: 'Provider B',
      nome: '—',
      tipoStorage: '—',
      durata: '—',
      finalita: 'Scopo B',
      categoria: 'Preferenze',
    });
  });

  it('produce una riga per ogni voce di storage più una per servizio senza storage', () => {
    expect(cookieTableRows(SERVICES).length).toBe(2);
  });

  it('produce un array vuoto per un registro vuoto', () => {
    expect(cookieTableRows([])).toEqual([]);
  });

  it('produce più righe per un servizio con più voci di storage', () => {
    const multi: ThirdPartyService[] = [
      {
        id: 'multi',
        name: 'Servizio Multi',
        provider: 'Provider C',
        category: 'statistiche',
        purpose: 'Scopo C',
        cookies: [
          { name: 'chiave-1', storage: 'cookie', duration: '1 anno', purpose: 'Finalità 1' },
          { name: 'chiave-2', storage: 'sessionStorage', duration: 'sessione', purpose: 'Finalità 2' },
        ],
      },
    ];

    expect(cookieTableRows(multi).length).toBe(2);
    expect(cookieTableRows(multi)[1].tipoStorage).toBe('Session storage');
  });
});
