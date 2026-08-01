---
name: supabase-conventions
description: Convenzioni Supabase del progetto UNIPC — migration, RLS, policy, Storage privato con signed URL, Edge Functions in Deno, gestione dei segreti, generazione dei tipi. Usalo per qualsiasi lavoro su database, autenticazione, storage o funzioni server.
---

# Convenzioni Supabase UNIPC

## Migration

- Una migration per cambiamento logico, nome descrittivo con timestamp
- Mai modificare una migration già applicata in produzione: se ne scrive una nuova
- Ogni tabella nasce con `enable row level security` **nella stessa migration** che la crea

## RLS

Pattern base per i dati dell'utente:

```sql
create policy "utente legge i propri ordini"
on public.orders for select
using (auth.uid() = user_id);
```

Regole:
- Una policy per operazione (select, insert, update, delete), esplicita
- Nessun `using (true)` senza commento che ne spieghi la ragione
- Le tabelle scritte solo dal server (fatture, pagamenti) non hanno policy di insert per gli utenti: ci accede la service role
- Le policy si testano con due utenti diversi, non solo con il proprio

## Tipi di colonna

- Denaro: `integer` in centesimi. Mai `float`, mai `money`
- Date: `timestamptz`
- Stati: enum Postgres o `text` con `check`, mai stringhe libere
- Id: `uuid` con `gen_random_uuid()`

## Storage

- Bucket `enrollment-docs` **privato**, path `orders/{orderId}/`
- Nessun accesso pubblico
- Download solo con signed URL a scadenza breve (circa 5 minuti)
- Upload dal client solo con signed upload URL, con validazione server-side a seguire

## Edge Functions (Deno)

- Runtime Deno: niente dipendenze Node native, niente Puppeteer
- Input validato con Zod prima di ogni accesso al database
- Segreti solo con `Deno.env.get()`
- Le funzioni che toccano denaro o documenti fiscali sono **idempotenti**: chiave di idempotenza o vincolo unico a database
- Nessuna funzione si fida di importi, id di prezzo o stati inviati dal client

## Segreti

| Dove | Cosa |
|---|---|
| `environment.ts` frontend | solo URL progetto e **anon key** |
| Secret Edge Functions | service role key, credenziali Aruba, chiavi del provider di pagamento |

Se trovi una service role key nel frontend, è un incidente di sicurezza: fermati e segnalalo.

## Tipi

Dopo ogni modifica allo schema:

```bash
cd backend && npx supabase gen types typescript --local > ../frontend/src/app/core/models/database.types.ts
```
