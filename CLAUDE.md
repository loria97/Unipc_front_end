# UNIPC — Università Presila Crotonese

Monorepo del sito e della piattaforma di iscrizione ai corsi.

## Struttura

```
UNIPC/
├── frontend/     # applicazione Angular (standalone components)
├── backend/      # Supabase: migrations, Edge Functions (Deno)
├── docs/         # documentazione di progetto
│   └── piano-corsi-professionalizzanti.md   ← piano di riferimento
└── .claude/      # agenti, skill e comandi
```

**Prima di lavorare su Corsi Professionalizzanti leggi sempre `docs/piano-corsi-professionalizzanti.md`.**
È la fonte di verità su fasi, schema dati, macchina a stati e decisioni prese.

## Stack

**Frontend** — Angular standalone, TypeScript strict, signals per lo stato, Reactive Forms tipizzati, SCSS con design token, routing lazy-loaded, `@supabase/supabase-js` v2.

**Backend** — Supabase (Postgres + Auth + Storage + Edge Functions su Deno), RLS su tutte le tabelle, migration versionate.

**Integrazioni** — Aruba Fatturazione Elettronica (server-side), provider di pagamento dietro adapter (da decidere).

## Design system

| Token | Valore | Uso |
|---|---|---|
| `--unipc-primary` | `#123A5E` | blu accademico |
| `--unipc-accent` | `#C9A227` | oro antico, CTA e accenti |
| `--unipc-ink` | `#0E1B2C` | blu notte, header scuro e footer |

Titoli serif, testo sans-serif. Mobile-first: sm 480 / md 768 / lg 1024 / xl 1280. Accessibilità WCAG 2.1 AA.

## Regole non negoziabili

1. **Mai duplicare componenti.** Prima di crearne uno nuovo, cerca in `frontend/src/app/shared/components/`. Se esiste qualcosa di simile, si estende.
2. **Mai `any`.** TypeScript strict, tipi espliciti, Reactive Forms tipizzati.
3. **Importi sempre in centesimi interi.** Mai float per il denaro.
4. **Il prezzo autorevole sta a database.** Il server ricalcola sempre il totale, non si fida mai del client.
5. **Nessun segreto nel frontend.** Solo la anon key Supabase in `environment.ts`. Service role key e credenziali Aruba/pagamento vivono nei secret delle Edge Functions.
6. **RLS attiva su ogni tabella** fin dalla prima migration.
7. **Storage privato.** I documenti si servono solo con signed URL a scadenza breve.
8. **Se qualcosa è ambiguo, chiedi.** Non inventare requisiti, campi o comportamenti non specificati.

## Comandi

```bash
# frontend
cd frontend && npm start          # dev server
cd frontend && npm run build      # build produzione
cd frontend && npm test           # unit test

# backend
cd backend && npx supabase start          # stack locale
cd backend && npx supabase db push        # applica migration
cd backend && npx supabase functions serve
cd backend && npx supabase gen types typescript --local > ../frontend/src/app/core/models/database.types.ts
```

## Metodo di lavoro

1. **Esplora prima di scrivere.** Leggi i file reali coinvolti, non assumere.
2. **Un obiettivo per volta.** Se una richiesta copre più fasi del piano, proponi la suddivisione prima di iniziare.
3. **A fine lavoro** dichiara: cosa è stato modificato, cosa è stato verificato, cosa resta aperto.
4. Aggiorna `docs/piano-corsi-professionalizzanti.md` quando una decisione cambia.
