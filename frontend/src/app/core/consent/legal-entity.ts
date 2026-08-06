/**
 * Dati identificativi dell'ateneo, ripresi da `footer.component.html` (dati
 * già pubblicati nel footer del sito prima di questo lavoro, quindi
 * considerati veri — decisione presa con l'utente). Footer e pagine legali
 * leggono entrambi da questa costante, così non possono mai divergere.
 */
export interface LegalEntity {
  readonly ragioneSociale: string;
  readonly sedeLegale: string;
  readonly sedeOperativa: string;
  readonly partitaIva: string;
  readonly pec: string;
  readonly email: string;
}

export const LEGAL_ENTITY: LegalEntity = {
  ragioneSociale: 'UNIPC S.r.l.',
  sedeLegale: 'Via Magna Grecia 12, 88900 Crotone (KR)',
  sedeOperativa: 'Piazza Pitagora 4, Crotone',
  partitaIva: '03000000794',
  pec: 'unipc@pec.it',
  email: 'info@unipc.it',
};
