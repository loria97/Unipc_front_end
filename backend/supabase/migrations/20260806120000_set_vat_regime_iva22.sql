-- Recepisce la decisione dell'ateneo: IVA esposta al 22% su tutto il catalogo
-- (CLAUDE.md regola 5, docs/piano-corsi-professionalizzanti.md Sezione 5). Il
-- check constraint NON viene toccato: 'da_definire' resta ammesso per corsi
-- futuri non ancora classificati fiscalmente.

update public.courses
set vat_regime = 'iva_22'
where vat_regime is distinct from 'iva_22';
-- Il WHERE non è cosmetico: il trigger set_courses_updated_at (definito nella
-- migration di creazione della tabella) scatta su ogni UPDATE. Senza filtro,
-- righe già a 'iva_22' verrebbero comunque "toccate" con un updated_at falso.
-- Con il filtro la migration è anche ri-eseguibile a mano senza effetti
-- collaterali.

alter table public.courses
alter column vat_regime set default 'iva_22';
-- Cambia solo il default per gli insert futuri (nuovi corsi non specificano
-- più esplicitamente il regime); non riscrive le righe esistenti.

-- Verifica manuale da eseguire nel SQL Editor dopo il push:
-- select vat_regime, count(*) from public.courses group by vat_regime;
-- Atteso: una sola riga, iva_22, con il totale dei corsi.
-- Zero righe da_definire / esente_art10.
