# UNIPC — Corsi Professionalizzanti
## Piano operativo: catalogo, carrello, checkout, pagamento, fattura

Documento di riferimento per lo sviluppo della funzionalità e-commerce dei corsi professionalizzanti sul sito UNIPC.
Serve come base per i prompt sequenziali da dare a Claude Code.

> **Revisione — agosto 2026.**
> 1. Flusso semplificato: il form di domanda di iscrizione, la generazione del PDF precompilato e l'upload del modulo firmato **non fanno più parte del checkout**. L'utente paga e riceve per email il modulo di iscrizione da compilare, che rispedisce alla segreteria. Le vecchie Fasi 7, 8 e 9 sono state eliminate e le successive rinumerate.
> 2. **Regime IVA deciso: IVA esposta al 22%.** Sbloccati il calcolo dei totali e la costruzione dell'XML; niente marca da bollo.
> 3. **Aruba Fatturazione Elettronica: l'ateneo possiede già l'account.** Il piano ora recepisce le specifiche reali delle API.

---

## 1. Obiettivo funzionale

Flusso utente completo:

1. L'utente naviga l'elenco dei corsi professionalizzanti (card)
2. Apre la pagina di dettaglio di un corso
3. Aggiunge al carrello **oppure** acquista subito
4. Entra nel checkout:
   - **Step 1** — Accesso o registrazione (account obbligatorio)
   - **Step 2** — Dati di fatturazione (indirizzo, telefono, CF, eventuale P.IVA e SDI/PEC)
   - **Step 3** — Pagamento: carta, Google Pay, bonifico bancario
   - **Step 4** — Esito e conferma
5. A pagamento concluso, lato server:
   - emissione della **fattura elettronica** via Aruba, innescata dal callback di pagamento
   - invio dell'**email di conferma** all'utente, con il **modulo di iscrizione in allegato** (PDF statico, identico per tutti) e tutte le istruzioni per compilarlo
6. L'utente compila il modulo offline e lo **rispedisce via email alla segreteria**. Nessun upload sul sito.
7. Post-acquisto: area studente con ordini, stato dell'iscrizione, fattura e ri-download del modulo

---

## 2. Decisioni prese

| Ambito | Decisione |
|---|---|
| Backend | **Supabase** (Auth + Postgres + Storage + Edge Functions), regione UE |
| Accesso | **Account obbligatorio**, nessun guest checkout |
| Metodi di login | Email + password, **Google OAuth**. SPID rinviato |
| Modulo di iscrizione | **PDF statico** fornito dall'ateneo, allegato all'email di conferma. Non generato, non precompilato, non firmato online |
| Ritorno del modulo | **Email alla segreteria**, fuori dal sito |
| Metodi di pagamento | **Carta, Google Pay, bonifico bancario** |
| Gateway di pagamento | **Da decidere con l'ateneo** → si costruisce un adapter, con provider bonifico funzionante dal primo giorno |
| Regime IVA | **IVA esposta 22%** |
| Fatturazione elettronica | **Aruba Fatturazione Elettronica**, account già in possesso dell'ateneo. Integrazione server-side via API REST |

### Vincolo tecnico sul gateway

Google Pay **non è un provider di pagamento**: è un wallet esposto dal gateway. Questo vincola la scelta.

- **Stripe** — supporto nativo a Google Pay via Payment Request / Checkout, il percorso più corto
- **Nexi XPay** — supporto parziale e dipendente dal contratto e dalla versione dell'integrazione: da verificare contrattualmente prima di prometterlo
- **pagoPA** — non supporta Google Pay

Se l'ateneo fosse vincolato a pagoPA, il requisito "Google Pay" va rinegoziato o si prevede un doppio canale. La decisione sul gateway va quindi presa **verificando prima il supporto Google Pay**, non dopo.

### Conseguenze architetturali

- Ogni riga di `orders` ha sempre un `user_id`: le RLS restano semplici (`user_id = auth.uid()`).
- Il gateway va isolato dietro un'interfaccia, così le fasi 1–6 si sviluppano e si testano senza attendere la decisione dell'ateneo.
- Il **bonifico è un metodo asincrono con conferma manuale**. La macchina a stati deve prevedere il caso "pagamento confermato ore o giorni dopo", non solo il redirect immediato. Vale anche per pagoPA, se scelto: modello a IUV con riconciliazione asincrona.
- L'**email diventa un componente critico del prodotto**, non un accessorio: è l'unico canale attraverso cui il modulo di iscrizione raggiunge l'utente. Se l'email non arriva, l'iscrizione non si completa.
- **pdf-lib rientra nel piano**, ma solo in Fase 9: le API Aruba restituiscono l'XML e le notifiche, non un PDF di cortesia. Quel PDF va generato da noi. Nel checkout non si genera alcun PDF.
- Il token Aruba scade in 30 minuti e l'autenticazione è limitata a **1 richiesta al minuto per IP**: le Edge Function sono stateless, quindi il token va **persistito e condiviso a database**, mai richiesto a ogni invocazione.

---

## 3. Stack tecnico

**Frontend**
- Angular standalone components, TypeScript strict
- Signals per lo stato (carrello, sessione)
- Reactive Forms tipizzati (`FormGroup<...>`), mai `any`
- SCSS con i design token esistenti (`--unipc-primary #123A5E`, `--unipc-accent #C9A227`, `--unipc-ink #0E1B2C`)
- `@supabase/supabase-js` v2, incapsulato in `core/services/supabase.service.ts` — mai importato direttamente nei componenti
- Zod per la validazione, schema condivisi con le Edge Functions

**Backend (Supabase)**
- Postgres con RLS attive su tutte le tabelle
- Migration versionate in `supabase/migrations/`
- Storage: bucket **privato** `invoices` per i PDF di cortesia, accesso solo via signed URL a scadenza breve (5 min)
- Il modulo statico di iscrizione va ospitato da qualche parte: asset del frontend, bucket pubblico dedicato, o allegato gestito solo dal servizio email. **Questione aperta**, vedi Sezione 9
- Il bucket `enrollment-docs` previsto nella versione precedente del piano **non serve più**
- Edge Functions (Deno): `create-order`, `create-payment-session`, `payment-callback`, `create-invoice`, `aruba-callback`, `send-order-email`

**Email transazionali**
- Resend o Brevo, dominio verificato con **SPF, DKIM e DMARC**
- Un'email con allegato PDF ha un rischio di spam sensibilmente più alto di una email di solo testo: la deliverability va **testata prima del rilascio** su Gmail, Outlook/Hotmail, Libero, Tiscali, Virgilio e almeno un dominio PEC/aziendale
- Fallback obbligatorio: il modulo deve essere sempre scaricabile dall'area studente, così un'email finita in spam non blocca l'iscrizione
- Logging degli invii (accettato, consegnato, bounce) per poter rispondere a "non ho ricevuto niente"

**Altro**
- Test: Vitest/Jest per unit, Playwright per E2E, axe per accessibilità
- Monitoring: Sentry

**Chiavi e segreti**
- In `environment.ts` solo l'**anon key** Supabase
- La **service role key**, le chiavi del gateway di pagamento, le credenziali Aruba e la API key del servizio email vivono esclusivamente nei secret delle Edge Functions

---

## 4. Struttura file prevista

```
src/app/
├── core/
│   ├── models/
│   │   ├── course.model.ts
│   │   ├── cart.model.ts
│   │   ├── order.model.ts
│   │   └── invoice.model.ts
│   ├── services/
│   │   ├── supabase.service.ts
│   │   ├── auth.service.ts
│   │   ├── courses.service.ts
│   │   ├── cart.service.ts
│   │   ├── order.service.ts
│   │   ├── consent.service.ts
│   │   ├── script-loader.service.ts
│   │   └── payment/
│   │       ├── payment-provider.interface.ts
│   │       └── bank-transfer.provider.ts
│   └── guards/
│       ├── auth.guard.ts
│       └── checkout-step.guard.ts
├── shared/
│   ├── components/
│   │   ├── course-card/
│   │   ├── auth-form/
│   │   ├── cookie-preferences/
│   │   ├── consent-gate/
│   │   └── stepper/
│   └── validators/
│       ├── codice-fiscale.validator.ts
│       ├── partita-iva.validator.ts
│       └── cap.validator.ts
├── features/
│   ├── corsi-professionalizzanti/
│   ├── carrello/
│   ├── auth/
│   ├── checkout/
│   └── area-studente/
├── layout/
│   └── cookie-banner/
└── styles/
    ├── _tokens.scss
    └── _mixins.scss

supabase/
├── migrations/
└── functions/
```

Rispetto alla versione precedente sono spariti `enrollment-form.model.ts` e le sottocartelle di `checkout/` dedicate a domanda, documento e upload firmato.
`shared/components/file-upload/` si mantiene **solo se è già usato altrove nel sito**: da verificare nel repo prima di rimuoverlo.

---

## 5. Schema dati

| Tabella | Contenuto |
|---|---|
| `courses` | Corsi/certificazioni con **prezzo autorevole** in centesimi, regime IVA, durata, CFU — schema implementato, vedi dettaglio sotto |
| `profiles` | Nome, cognome, CF, data/luogo nascita, telefono, indirizzo fatturazione, P.IVA, SDI/PEC |
| `orders` | `user_id`, stato, totali (lordo, imponibile, imposta), numero pratica, timestamp |
| `order_items` | Righe ordine con prezzo congelato al momento dell'acquisto |
| `payments` | Provider, metodo, riferimento esterno, stato, importo, timestamp di conferma |
| `invoices` | Fattura elettronica: vedi dettaglio in Fase 9 |
| `aruba_tokens` | Access token e refresh token Aruba con scadenze — **una sola riga**, condivisa da tutte le Edge Function |
| `email_log` | Tipo di email, `order_id`, destinatario, esito dell'invio, timestamp |
| `audit_log` | Evento, `order_id`, `user_id`, IP, user-agent, timestamp |

Le tabelle `enrollment_forms` e `documents` previste nella versione precedente **non servono più**.

### Schema `courses` (implementato)

Migration: `backend/supabase/migrations/20260801093000_create_courses_table.sql` (+ seed demo `20260801094500_seed_demo_courses.sql`, rimovibile quando arrivano i corsi reali).

- **Identità**: `slug` (unique), `title`, `type` (`corso`|`certificazione`), `area`, `abstract`, `hero_image` (jsonb `{src, alt}`)
- **Contenuti**: `a_chi_e_rivolto`, `obiettivi`, `requisiti_ammissione` (`text[]`, paragrafi con HTML inline limitato a `<strong>`/`<em>`/`<a href>`), `programma` (`text[]` opzionale)
- **Specifiche**: `durata_ore` (> 0), `durata_label`, `cfu` (nullable — NULL per le certificazioni), `modalita`, `prove_previste` (`text[]` opzionale)
- **Prezzo**: `list_price_cents`, `promo_price_cents`/`promo_label`/`promo_valid_until` (tutti e tre NULL o tutti valorizzati, e se valorizzati `promo_price_cents < list_price_cents`), `vat_regime`
- **Normativa**: `riferimenti_normativi` (jsonb array `{label, url}`), `punti_graduatoria` (jsonb `{punti, note}`), `classi_concorso` (`text[]`)
- **Pubblicazione**: `published`, `sort_order`, `seo` (jsonb `{metaTitle, metaDescription}`), `created_at`/`updated_at` (trigger `set_updated_at()`)
- RLS attiva: unica policy SELECT per `anon`/`authenticated` con `using (published = true)`; nessuna policy insert/update/delete (scrittura da service role/dashboard)
- Tipi generati in `frontend/src/app/core/models/database.types.ts`

**Migration da fare:** con l'IVA decisa, `vat_regime` va portato a `iva_22` su tutte le righe e il default della colonna cambia da `da_definire` a `iva_22`. Il valore `da_definire` si può mantenere nell'enum per sicurezza, ma nessuna riga deve usarlo.

### IVA e arrotondamenti

**Regola: il prezzo a listino è lordo, IVA inclusa.** Il Codice del Consumo impone di esporre ai consumatori il prezzo finale, quindi `list_price_cents` è il valore che l'utente paga.

Lo scorporo per la fattura si fa **una sola volta, lato server**, con questa sequenza:

1. `totale_lordo` = somma delle righe, in centesimi interi
2. `imponibile` = `round(totale_lordo / 1.22)`, arrotondamento al centesimo
3. `imposta` = `totale_lordo − imponibile` — **per differenza, mai ricalcolata**

Così il totale in fattura coincide sempre al centesimo con l'importo incassato. Esempio su 1.500,00 €: imponibile 1.229,51 €, imposta 270,49 €.

`orders` salva tutti e tre i valori. Non si ricalcolano a ogni lettura: un cambio di aliquota futuro non deve riscrivere la storia degli ordini già emessi.

**Nessuna marca da bollo:** il bollo virtuale da 2 € riguarda le fatture senza IVA sopra 77,47 €. Con IVA esposta non si applica.

**Regole non negoziabili**

- Tutti gli importi in **centesimi interi**, mai float
- Il totale si **ricalcola sempre lato server** dai prezzi a DB: il client non è mai fonte di verità sul prezzo
- RLS attive fin dalla prima migration, non "dopo"

### Macchina a stati dell'ordine

```
draft
  → awaiting_payment
        → (carta / Google Pay)  paid
        → (bonifico)            awaiting_bank_transfer → paid
  → enrolled

stati terminali alternativi: cancelled, expired, payment_failed
```

- `awaiting_payment` — ordine creato, dati di fatturazione completi, in attesa dell'esito del pagamento
- `awaiting_bank_transfer` — bonifico scelto: l'utente ha ricevuto le coordinate e la causale, l'incasso non è ancora stato riconciliato
- `paid` — pagamento confermato. È lo stato che **innesca fattura ed email col modulo allegato**
- `enrolled` — la segreteria ha ricevuto il modulo compilato e perfezionato l'iscrizione. Transizione **manuale**, non automatica

Le transizioni sono validate **lato server** (funzione o trigger Postgres). Ogni step del checkout è protetto da un guard che verifica lo stato corrente.

---

## 6. Fasi operative

### Fase 0 — Setup Supabase e prerequisiti

**Da fare**
- Creare progetto Supabase in **regione UE (Francoforte)**, firmare il DPA
- Installare Supabase CLI, collegare il progetto, prima migration
- Creare il bucket privato `invoices`
- Configurare Google Cloud Console: client OAuth, redirect URI verso il callback Supabase
- Whitelist in Supabase di **tutte** le redirect URL: produzione, `localhost`, domini preview Vercel
- Generare i tipi TypeScript dal DB (`supabase gen types`)

**Da verificare su Aruba** (blocca la Fase 9)
- L'utenza dell'ateneo è **Premium**? I web service sono riservati alle utenze Premium o alle utenze base collegate a una Premium tramite delega. Se l'utenza è base, serve l'upgrade o la delega
- Credenziali per l'API (username e password dell'utenza)
- **Accreditamento all'ambiente DEMO**, che è accessibile solo temporaneamente e su richiesta: va chiesto in anticipo, non quando si inizia a sviluppare
- Registrazione completata almeno una volta dal pannello web, requisito dichiarato da Aruba
- Quale **Tier** è associato all'utenza (vedi limiti in Fase 9)
- I **callback** sono attivabili sull'utenza o serve il polling?

**Da chiarire con legale dell'ateneo**
- Diritto di recesso 14 giorni per contratti a distanza con consumatori — **punto delicato**, vedi Sezione 9
- Testi di informativa privacy, consensi e condizioni di vendita

**Da chiarire con la segreteria**
- Chi fornisce il **PDF del modulo di iscrizione** e chi ne mantiene le revisioni? Serve anche una versione compilabile a schermo o basta stampabile?
- Qual è la **casella email** a cui gli iscritti rispediscono il modulo? È monitorata, ha un responsabile, tollera allegati?
- Come viene **confermato l'incasso dei bonifici**? Chi controlla l'estratto conto, con che frequenza, con quale strumento marca l'ordine come pagato?
- Chi porta l'ordine a `enrolled` quando arriva il modulo compilato?
- Chi riceve la notifica in caso di **scarto SDI** e corregge i dati?

**Criteri di uscita:** migration applicata, RLS attive, bucket creato, tipi generati, OAuth configurato, credenziali Aruba e accesso DEMO ottenuti.

---

### Fase 1 — Modelli e dati

- Modelli TypeScript allineati alle tabelle
- `professional-courses.json` tipizzato per la vetrina (il prezzo autorevole resta a DB)
- `CoursesService` con un solo punto di accesso ai dati, così il passaggio da JSON ad API non tocca i componenti
- Funzione pura di scorporo IVA secondo la regola della Sezione 5, con unit test sui casi di arrotondamento

**Uscita:** compila in strict mode, JSON validato contro i tipi, scorporo IVA che chiude sempre al centesimo.

---

### Fase 2 — Catalogo e dettaglio corso

- `features/corsi-professionalizzanti/` con route lazy: lista + `:slug`
- Card riusabile in `shared/components/course-card/` — **se esiste già una card corsi nel sito, si estende quella**, non se ne crea una seconda
- Prezzi esposti **IVA inclusa**, con dicitura esplicita
- Filtri (area tematica, durata, prezzo) sincronizzati con i query param: filtri condivisibili e back del browser funzionante
- SEO: title, meta, JSON-LD `Course`

**Uscita:** navigazione lista→dettaglio, responsive su sm/md/lg/xl, navigabile da tastiera, Lighthouse a11y ≥ 95.

---

### Fase 3 — Carrello

- `CartService` con signals, persistenza in `localStorage` **con versione dello schema** per invalidare dati vecchi
- Un corso può stare in carrello una sola volta (quantità sempre 1: iscrizioni nominative)
- Badge contatore nell'header, drawer o pagina `/carrello`
- Totali calcolati con funzione pura testabile, in centesimi, con imponibile e imposta mostrati nel riepilogo

**Uscita:** aggiungi/rimuovi, persistenza dopo refresh, annuncio `aria-live` all'aggiunta, nessun crash se il localStorage è corrotto.

---

### Fase 3b — Cookie, consensi e script di terze parti

> Da fare subito dopo le Fasi 2/3 e **prima della Fase 4**: il pulsante Google e qualsiasi tag di analytics non devono caricarsi prima del consenso. Rimandare questa fase a fine progetto significa rifare il lavoro sugli script già integrati.

**Principio:** nessuno script non necessario viene eseguito e nessun cookie non tecnico viene scritto finché l'utente non ha espresso una scelta. Il consenso è la porta d'ingresso degli script, non un'etichetta appiccicata dopo.

**Categorie di consenso**

| Categoria | Contenuto | Consenso |
|---|---|---|
| Necessari | sessione Supabase, carrello in `localStorage`, stato del checkout, preferenza di consenso | sempre attivi, non disattivabili |
| Preferenze | eventuali scelte UI persistite | opt-in |
| Statistiche | analytics | opt-in |
| Marketing | pixel pubblicitari, remarketing | opt-in |

Le categorie senza servizi reali **non si mostrano**: un banner con quattro toggle finti è peggio di uno con due veri.

**Requisiti del banner** (linee guida Garante Privacy, giugno 2021)

- Prima interazione: "Accetta tutti", "Rifiuta tutti" e "Personalizza" con **pari evidenza grafica** — stesso peso visivo, stesso contrasto, nessun bottone secondario mimetizzato
- La X di chiusura equivale a **rifiuto**, non a consenso
- Scroll, click sulla pagina e permanenza **non** sono consenso
- Nessun cookie wall: il sito resta usabile anche rifiutando tutto
- Se l'utente rifiuta, il banner non si ripropone prima di **6 mesi**
- Link permanente "Preferenze cookie" nel footer per riaprire il pannello e cambiare idea
- Pagine dedicate `/cookie-policy` (con tabella dei cookie: nome, finalità, durata, titolare) e `/privacy`, linkate dal banner e dal footer

**Implementazione**

- `core/services/consent.service.ts`: stato con signals, API `hasConsent(category)`, `acceptAll()`, `rejectAll()`, `save(preferences)`, `revoke()`
- Persistenza con **versione dello schema di consenso** + timestamp + scadenza 6 mesi. Se le categorie o i servizi cambiano, la versione si incrementa e il consenso si richiede di nuovo
- `core/services/script-loader.service.ts`: unico punto che inietta script di terze parti, chiamato solo dietro `hasConsent()`. Nessun `<script>` di terze parti in `index.html`
- `layout/cookie-banner/` per la barra e `shared/components/cookie-preferences/` per il pannello granulare — **se la bozza Claude Design ha già un banner, si estende quello**
- `shared/components/consent-gate/`: placeholder click-to-load per embed (mappe, video). Mostra un segnaposto con la ragione del blocco e un pulsante "Carica contenuto" che dà consenso puntuale, senza sbloccare l'intera categoria
- Font self-hosted, non da CDN di terze parti
- Revoca reale: al `revoke()` i cookie già scritti dalla categoria vengono **cancellati** e la pagina ricaricata se lo script non è rimovibile a caldo

**Nota sul gateway di pagamento:** gli SDK dei gateway (Stripe.js, Google Pay) sono **tecnicamente necessari** al servizio richiesto dall'utente e si caricano nella pagina di pagamento, non su tutto il sito. Vanno comunque dichiarati in cookie policy e caricati solo dove servono, non nell'`index.html`.

**Accessibilità**

- Pannello preferenze come `role="dialog"` `aria-modal="true"`, focus trap, `Esc` che chiude equivalendo a rifiuto, focus che ritorna all'elemento di partenza
- Banner annunciato ma non intrappolante: raggiungibile da tastiera come primo blocco interattivo, senza bloccare la lettura della pagina agli screen reader
- Contrasto verificato: `--unipc-accent #C9A227` su fondo bianco **non** passa AA per il testo → usare l'oro come fondo con testo `--unipc-ink`, o il blu primario per i bottoni
- Nessun blocco per crawler: il banner non deve impedire l'indicizzazione

**Uscita:** con DevTools a sessione pulita, prima di qualsiasi scelta non risulta scritto nessun cookie né storage oltre a quelli necessari; "Rifiuta tutti" non carica nulla; il consenso sopravvive al refresh e scade a 6 mesi; il pannello è riapribile dal footer; la revoca cancella i cookie della categoria; axe pulito su banner e pannello; nessun layout shift all'apertura.

---

### Fase 4 — Autenticazione

**Due punti di ingresso, un solo componente.** Il login serve come pagina autonoma (`/accedi`, dall'header) e come primo step del checkout. Il form si scrive una volta in `shared/components/auth-form/`; le due route lo ospitano con configurazioni diverse (redirect al `returnUrl` vs avanzamento allo step successivo). Duplicarlo porta a validazioni che divergono nel tempo.

**Registrazione cortissima:** email, password, nome, cognome. CF, telefono e indirizzo si chiedono allo step 2 del checkout, quando l'utente è già dentro il flusso.

**Il carrello non si perde mai.** Al login, il `CartService` fa **merge** tra carrello locale (anonimo) e carrello a DB dell'account. Non sovrascrive.

**Contenuti**
- `/accedi` con email+password, link a reset password e `/registrati`
- Pulsante Google: su mobile **flusso redirect**, non popup (bloccato o instabile su iOS Safari)
- `returnUrl` come query param, **validato contro path interni** (mai redirect aperto verso domini esterni)
- Reset password: richiesta → email → `/reimposta-password` con token
- Verifica email obbligatoria prima di completare un ordine, con schermata "controlla la posta" e rinvio con cooldown. **Ora è ancora più importante:** se l'email è sbagliata o non verificata, il modulo di iscrizione non arriva a destinazione
- Sessione persistente, refresh automatico del token; se scade a metà checkout si salva lo stato, si chiede il re-login e si torna allo step esatto
- **Collegamento identità**: utente registrato con password che poi entra con Google (stessa email). Da abilitare e testare, altrimenti si creano due account o un errore incomprensibile
- Chi entra con Google ha email verificata ma **profilo incompleto**: lo step 2 deve trattarlo come caso normale
- Header con stato dinamico: "Accedi" oppure nome utente con menu (Area studente, Ordini, Esci)
- Errori di login generici ("credenziali non valide"): mai distinguere email inesistente da password errata
- Il pulsante Google carica risorse di terze parti → va caricato tramite lo `ScriptLoaderService` della Fase 3b, dietro verifica del consenso
- Metodi di accesso come **lista configurabile** nell'`AuthService`, così SPID si aggiunge dopo senza toccare i componenti

**Accessibilità:** label reali, `autocomplete="email"` e `current-password`, errori con `aria-live`, focus sul primo campo invalido.

**Uscita:** accesso da header e da checkout, Google OAuth funzionante anche su preview Vercel, carrello che sopravvive al login, sessione che regge il refresh, reset password end-to-end, guard su `/checkout/*` e `/area-studente/*`.

---

### Fase 5 — Profilo e dati di fatturazione

- Tabella `profiles` con RLS
- Componente di completamento profilo **riusato** dentro il checkout: se mancano campi obbligatori si chiedono solo quelli
- Validatori italiani in `shared/validators/`: codice fiscale con checksum, CAP, telefono, P.IVA

**I campi qui raccolti alimentano direttamente la fattura elettronica.** Vincoli da rispettare già in questa fase, perché un dato mancante qui diventa uno scarto SDI in Fase 9:

- **CF sempre obbligatorio**
- Acquisto come **privato** → nessuna P.IVA, nessun codice SDI
- Acquisto come **azienda o professionista** → P.IVA obbligatoria, più codice destinatario SDI di 7 caratteri **oppure** PEC. Almeno uno dei due
- Il codice SDI va validato in forma: 7 caratteri alfanumerici
- Indirizzo completo con CAP e provincia: sono campi obbligatori del tracciato FatturaPA

**Uscita:** profilo leggibile e aggiornabile solo dal proprietario, validazioni corrette su casi reali, nessun profilo salvabile in uno stato che renderebbe la fattura non emettibile.

---

### Fase 6 — Scheletro del checkout

- Route `/checkout` con **child route per ogni step**, non uno stepper a stato interno:
  `/checkout/accesso`, `/checkout/dati`, `/checkout/pagamento`, `/checkout/esito`
- Al primo ingresso si crea l'**ordine draft lato server**; l'ID sta nell'URL o in sessione → il flusso è ripristinabile se l'utente chiude il browser
- Guard per step basato sullo stato dell'ordine: `/pagamento` richiede `awaiting_payment`, `/esito` richiede uno stato terminale del pagamento
- Stepper accessibile: lista semantica `<ol>`, `aria-current="step"`, focus sul titolo dello step al cambio route
- Riepilogo ordine visibile in tutti gli step, con totale sempre riletto dal server e scorporo IVA mostrato

**Uscita:** guard funzionanti, refresh e deep-link non rompono il flusso, ordine persistito, quattro step navigabili avanti e indietro senza perdere dati.

---

### Fase 7 — Pagamento

- Interfaccia `PaymentProvider` con `createPaymentSession()` e `handleProviderCallback()`
- Implementazione `BankTransferProvider` (bonifico) completa e **definitiva**, non un placeholder: è uno dei metodi richiesti
- L'implementazione carta + Google Pay si aggiunge quando il gateway è deciso, senza toccare il resto del flusso
- L'endpoint server rilegge l'ordine dal DB, **ricalcola il totale dai prezzi a DB**, verifica che lo stato sia `awaiting_payment` e che i dati di fatturazione siano completi

**Ramo carta / Google Pay**
- Redirect o elemento embedded del gateway, secondo il provider scelto
- Callback/webhook **idempotente**: è la fonte di verità, non il redirect di ritorno
- Su conferma: ordine a `paid` → innesca fattura (Fase 9) ed email (Fase 8)
- Gestione di pagamento fallito, abbandonato, importo divergente

**Ramo bonifico**
- Ordine a `awaiting_bank_transfer`
- Pagina di esito e email immediata con: IBAN e intestatario, importo esatto, **causale = numero pratica** (non il nome del corso: la riconciliazione si fa sulla causale), scadenza entro cui pagare
- Il modulo di iscrizione **non** si allega ancora: parte quando l'incasso è confermato *(da confermare con la segreteria — l'alternativa è allegarlo subito, accettando che qualcuno lo compili senza aver pagato)*
- Conferma manuale dell'incasso da parte della segreteria → ordine a `paid` → fattura + email col modulo
- Job di cleanup: draft scaduti a `expired`; i bonifici non pagati oltre la scadenza vanno **segnalati, non cancellati automaticamente** (un incasso può arrivare in ritardo)

**Uscita:** flusso completo in test su entrambi i rami, callback idempotente, doppio click su "Paga" che non crea due ordini né due pagamenti, transizione manuale del bonifico tracciata in `audit_log`.

---

### Fase 8 — Post-acquisto, email e consegna del modulo

> Richiede il PDF del modulo, i testi delle istruzioni e l'indirizzo email della segreteria.

**È la fase più critica del nuovo flusso:** l'iscrizione si perfeziona fuori dal sito, quindi la qualità di questa email determina quante iscrizioni arrivano a compimento.

**Email di conferma (stato `paid`)**
- Allegato: **PDF del modulo di iscrizione**
- Corpo: conferma dell'acquisto, corso acquistato, numero pratica, importo
- Istruzioni numerate ed esplicite: scarica → stampa o compila → firma → **rispedisci all'indirizzo email della segreteria**, indicato in chiaro e come link `mailto:` con oggetto precompilato contenente il numero pratica
- Termine entro cui rispedire, se l'ateneo ne fissa uno
- Link al ri-download del modulo dall'area studente, per chi perde l'allegato
- Riferimenti per assistenza

**Altre email**
- Bonifico scelto: coordinate, importo, causale (vedi Fase 7)
- Bonifico confermato: coincide con l'email di conferma sopra
- Fattura disponibile in area studente
- Promemoria "modulo non ancora ricevuto": **possibile solo se la segreteria dispone di un modo per segnalare al sistema l'avvenuta ricezione.** Senza quel segnale il promemoria arriverebbe anche a chi ha già inviato tutto, quindi è **fuori scope** finché non esiste il passaggio di stato a `enrolled`

**Area studente `/area-studente`**
- Elenco ordini con stato leggibile in italiano ("pagato — in attesa del modulo", "iscrizione perfezionata")
- Ri-download del modulo, sempre disponibile
- Download della fattura di cortesia
- Coordinate del bonifico ancora consultabili se l'ordine è in `awaiting_bank_transfer`

**Lato segreteria**
- Notifica a ogni nuovo ordine `paid`
- Vista minima degli ordini con filtro per stato, per confermare bonifici, marcare `enrolled` e vedere le fatture scartate

**Uscita:** email consegnata con allegato integro su almeno cinque provider diversi, allegato apribile da mobile, ri-download funzionante, `email_log` che registra gli invii, nessun dato personale nell'oggetto dell'email.

---

### Fase 9 — Fatturazione elettronica con Aruba

> **Specifiche API ufficiali: https://fatturazioneelettronica.aruba.it/apidoc/docs.html**
> Esiste anche una **v2** della documentazione, linkata in cima alla pagina. Prima di scrivere codice va deciso su quale versione costruire: la v1 è quella descritta qui.

**Principio:** la fattura si emette **solo** dopo che l'ordine è in stato `paid`, innescata dal callback di pagamento (o dalla conferma manuale dell'incasso nel caso bonifico), mai dal client.

#### Prerequisito d'accesso

I web service sono riservati alle **utenze Premium**, o alle utenze base collegate a una Premium tramite delega. Da verificare in Fase 0: se l'utenza dell'ateneo è base e non delegata, l'API non risponde e serve un upgrade.

#### Ambienti

| | Autenticazione | Altri metodi |
|---|---|---|
| **Demo** | `https://demoauth.fatturazioneelettronica.aruba.it` | `https://demows.fatturazioneelettronica.aruba.it` |
| **Produzione** | `https://auth.fatturazioneelettronica.aruba.it` | `https://ws.fatturazioneelettronica.aruba.it` |

L'ambiente demo è accessibile **solo temporaneamente e previo accreditamento specifico**: va richiesto in anticipo. I dati inseriti restano per la durata di validità dell'utenza.
Ricevute le credenziali, va completata la registrazione accedendo almeno una volta al pannello web.

**Chi richiede l'accreditamento demo.** Non esiste una procedura self-service nel pannello: la richiesta va aperta all'assistenza Aruba e deve partire **dall'ateneo**, in quanto intestatario del contratto. Lo sviluppatore può preparare il testo, non inoltrarlo.

Ticket da far aprire, tre domande secche:
1. L'utenza è **Premium**? Se è base, come si attiva la delega o l'upgrade?
2. I **web service API** sono attivi su questa utenza?
3. È possibile ottenere credenziali per l'**ambiente DEMO** a fini di sviluppo di un'integrazione?

**Rischio noto:** alcune segnalazioni di sviluppatori indicano che l'ambiente demo delle API sia di fatto riservato ai **Partner Aruba** e non concesso ai normali titolari del servizio. Non è dichiarato nella documentazione ufficiale, ma è coerente con l'assenza di una procedura pubblica. Va trattato come scenario probabile, non come eventualità remota.

#### Piano B — sviluppo senza ambiente DEMO

Se l'accreditamento non arriva, la Fase 9 **non si blocca**: cambia il metodo di verifica.

- **Builder XML** (prompt 13): si sviluppa e si valida interamente **offline**, contro lo schema XSD ufficiale FatturaPA e i controlli SdI documentati. È il motivo per cui è un prompt separato, senza dipendenze dall'API
- **Client di autenticazione** (prompt 12): si testa direttamente in **produzione**. `signin`, `refresh_token` e i metodi di sola lettura non emettono documenti e non consumano quota di fatturazione. Serve solo rispettare il limite di 1 signin/minuto
- **Ricerca e lettura**: i metodi di ricerca fatture e notifiche si esercitano in produzione senza effetti collaterali
- **Primo invio reale**: si concorda con la segreteria una **fattura vera di importo minimo**, emessa in produzione come primo test end-to-end, con la **nota di credito TD04** pronta come rete di sicurezza in caso di errore
- Prima di quel primo invio, la checklist dei controlli sincroni e dei controlli SdI va verificata a mano sull'XML generato

**Conseguenza sulla stima:** senza ambiente demo il collaudo della Fase 9 è più lento e più delicato, perché ogni errore accade su documenti fiscali reali. Va messo in preventivo come rischio esplicito, non assorbito silenziosamente.

#### Autenticazione e gestione del token

**Non è OAuth2 client credentials.** È `POST /auth/signin` in `application/x-www-form-urlencoded`, con `grant_type=password`, `username`, `password`. Le credenziali vanno **nel body, mai in query string**: Aruba blocca le chiamate con dati sensibili in query string.

Risposta: `access_token`, `refresh_token`, `expires_in`.

- Access token valido **30 minuti**
- Refresh token valido **60 minuti dall'emissione**, quindi permette di rinnovare fino a 30 minuti dopo la scadenza dell'access token
- Refresh: stesso endpoint `/auth/signin` con `grant_type=refresh_token`
- Header per tutte le altre chiamate: `Authorization: Bearer <access_token>`

**Vincolo critico:** massimo **1 richiesta di autenticazione al minuto per IP**. Le Edge Function sono stateless e possono girare in parallelo, quindi il token **va persistito in `aruba_tokens`** (una sola riga) e riusato. Il rinnovo va fatto in **lock**, con `select ... for update` o advisory lock Postgres, così due invocazioni simultanee non chiamano `signin` insieme. Un token richiesto a ogni invocazione manda il sistema in errore nel primo momento di traffico.

#### Limiti di utilizzo (SLA e Tier)

| Limite | Valore |
|---|---|
| Richieste di autenticazione per IP | 1 al minuto |
| Invio fatture per IP | 30 al minuto |
| Ricerca fatture / notifiche per IP | 12 al minuto |
| Dimensione massima file | 5 MB |
| Tier 0 | 60 richieste/ora, 10.000/anno |
| Tier 1 | 600/ora, 100.000/anno |

Il Tier associato all'utenza va verificato in Fase 0. Il contatore si incrementa solo quando la fattura supera i controlli sincroni e viene generato il nome file.

**Attenzione al comportamento del rate limiter.** È un leaky bucket con TTL: le richieste in eccesso non vengono accodate ma **rifiutate subito con HTTP 429**, e la retry logic è interamente a carico dell'integratore. Peggio: **ogni tentativo, anche se rifiutato, azzera il countdown del TTL** e rimanda il reset della quota. Un retry loop ingenuo non recupera, prolunga il blocco. Serve quindi:

- coda di emissione con **backoff esponenziale e tetto ai tentativi**, non retry immediato
- nessun retry automatico su 429 prima di una finestra di attesa esplicita
- allarme su Sentry al primo 429, perché indica un problema di dimensionamento, non un errore transitorio

#### Tabella `invoices`

`order_id`, `numero`, `anno`, `xml_inviato`, `upload_filename` (nome file restituito da Aruba), `id_sdi`, `stato_codice` (1–10), `stato_aggiornato_at`, `error_code`, `error_description`, `pdf_cortesia_path`, `created_at`.

L'`upload_filename` è la chiave con cui si interrogano stati e notifiche: va salvato subito, alla risposta dell'upload.

#### Numerazione

Progressivo annuale **senza buchi**, generato lato server con sequenza Postgres in transazione. Il numero si assegna **al momento dell'emissione**, non prima: un ordine abbandonato o un bonifico mai arrivato non deve bruciare un numero.
Nota: il controllo SdI `00425` richiede che il numero contenga almeno un carattere numerico.

#### Costruzione dell'XML FatturaPA

- `FormatoTrasmissione`: **FPR12** (privati). Con FPR12 il `CodiceDestinatario` deve essere di **7 caratteri** — controlli `00427`/`00428`
- **`IdTrasmittente` va valorizzato con il codice fiscale di Aruba PEC: `01879020517`.** Un valore diverso produce lo scarto sincrono `0094`
- `TipoDocumento`: `TD01` fattura immediata
- Cedente: dati fiscali dell'ateneo
- Cessionario:
  - **privati** → CF obbligatorio, `CodiceDestinatario` **`0000000`** (sette zeri)
  - **aziende** → P.IVA + codice destinatario SDI di 7 caratteri, oppure `PECDestinatario`
  - controllo `00417`: almeno uno tra `IdFiscaleIVA` e `CodiceFiscale` deve essere valorizzato
- **IVA 22%**: `AliquotaIVA` va espressa in termini percentuali, `22.00` e **non** `0.22` (controllo `00424`)
- **`Natura` non va valorizzato**: si compila solo con aliquota pari a zero. Presente con aliquota diversa da zero → scarto `00401`/`00430`
- `DatiRiepilogo` deve esistere per ogni aliquota presente nel documento (controllo `00419`), e i valori devono corrispondere a quelli delle righe (controllo `00443`)
- Data documento non successiva alla data di ricezione (controllo `00403`)

#### Invio

Due endpoint, si usa il primo:

- `POST /services/invoice/upload` — XML **non firmato**: la firma è facoltativa per B2B/B2C e Aruba la appone se configurata. Body: `dataFile` in Base64, più `credential` e `domain` solo se l'ateneo ha una firma automatica propria (altrimenti campi vuoti od omessi)
- `POST /services/invoice/uploadSigned` — solo se si volesse firmare in autonomia (CAdES `.p7m` o XAdES `.xml`)

Risposta: `errorCode`, `errorDescription`, `uploadFileName`.

**Controlli sincroni** da gestire esplicitamente: `0000` operazione effettuata, `0092` errore validazione XSD, `0094` IdTrasmittente errato, `0097` spazio esaurito sull'utenza, `0098` Base64 non valido, `0033` file oltre i 5 MB, `0034` file già inviato di recente. Il `0034` è utile per l'idempotenza, ma non ci si fa affidamento: l'idempotenza va garantita a monte, a database.

**Controlli asincroni**, codici `FATRSMxxx` / `NOTRSMxxx`: si recuperano dai metodi di ricerca o dalle callback.

Nel campo `errorDescription` Aruba inserisce un **identificativo richiesta**: va salvato e loggato, serve nelle richieste di assistenza.

#### Stati della fattura

Non si inventa una macchina a stati propria: si mappano i 10 codici di Aruba.

| Codice | Stato | Significato operativo |
|---|---|---|
| 1 | Presa in carico | in attesa di elaborazione, non ancora a SdI |
| 2 | Errore elaborazione | problema tecnico nell'invio a SdI → **notifica segreteria** |
| 3 | Inviata | trasmessa a SdI |
| 4 | Scartata (NS) | rifiutata da SdI con codice di errore → **notifica segreteria, correzione, rinvio** |
| 5 | Non consegnata (MC) | consegna fallita, messa a disposizione |
| 6 | Recapito impossibile (AT) | nessun ulteriore tentativo |
| 7 | Consegnata (RC) | esito positivo |
| 8 | Accettata (NE EC01) | solo PA |
| 9 | Rifiutata (NE EC02) | solo PA |
| 10 | Decorrenza termini (DT) | consegnata, nessuna risposta in 15 giorni |

Per la vendita a privati e aziende gli stati rilevanti sono 1, 2, 3, 4, 5, 6, 7. Gli stati 8, 9, 10 riguardano la PA e non dovrebbero comparire.

#### Aggiornamento dello stato: callback, non polling

Aruba espone callback verso endpoint dell'integratore: `createInvoice`, `createNotification`, `updateInvoiceStatus`, `updateUsage`.

**Se le callback sono attivabili sull'utenza** si implementa la Edge Function `aruba-callback` e non serve alcun polling. La callback deve essere idempotente e autenticata.

**Se non lo sono**, si ripiega sul polling con `getByFilename` o `getByInvoiceId`, rispettando i 12 al minuto e con backoff crescente: gli SLA dichiarati da Aruba sono entro 24 ore per la presa in carico, entro 24 ore per l'invio a SdI e entro 24 ore per l'inoltro della notifica di esito. Un polling ogni pochi minuti è inutile e brucia quota.

Da verificare in Fase 0 quale delle due strade è disponibile: cambia il lavoro di sviluppo.

#### Gestione degli scarti

Uno **scarto** (stato 4) o un errore di elaborazione (stato 2) **non annulla l'ordine e non blocca l'email col modulo**: l'utente ha pagato e la sua iscrizione procede. Si notifica la segreteria, si correggono i dati, si rinvia con un nuovo numero secondo le regole. Il tracciamento del tentativo scartato resta in `invoices`.

#### Idempotenza

Mai due fatture per lo stesso ordine, anche se il callback di pagamento arriva due volte. Vincolo unique su `order_id` in `invoices` per gli stati non terminali, più lock in transazione all'atto dell'emissione.

#### Nota di credito

Con IVA esposta, un rimborso da recesso o da annullamento richiede una **nota di credito `TD04`**. Non è nel percorso principale ma va previsto in tabella e nell'interfaccia, perché prima o poi serve.

#### PDF di cortesia

Le API restituiscono XML e notifiche, **non un PDF leggibile**. Il PDF di cortesia va generato da noi con **pdf-lib** e salvato nel bucket `invoices`, scaricabile dall'area studente. La fattura fiscalmente valida resta quella recapitata via SDI al cassetto fiscale o alla PEC: il PDF va marcato come "copia di cortesia".

**Uscita:** fattura emessa e consegnata in ambiente DEMO, token gestito a DB senza mai superare 1 signin/minuto, numerazione senza buchi verificata, scarto gestito senza rompere l'ordine né l'invio del modulo, stati mappati sui codici Aruba, PDF di cortesia scaricabile.

---

### Fase 10 — Hardening

- Rate limiting sugli endpoint, in particolare `create-payment-session` e l'invio email
- RLS verificate riga per riga con test dedicati
- Audit log su tutti i cambi di stato, comprese le transizioni manuali fatte dalla segreteria (chi, quando)
- GDPR: informativa, consensi con timestamp, retention dei dati d'ordine, DPA con Supabase, gateway di pagamento e servizio email
- **Verifica** dei consensi cookie implementati in Fase 3b: nessun cookie non necessario scritto prima della scelta, revoca effettiva, banner coerente su tutte le pagine nuove
- Unit test su calcolo totali, scorporo IVA e macchina a stati
- Un E2E Playwright sull'intero flusso, su entrambi i rami di pagamento
- Test di deliverability dell'email con allegato, ripetuto dopo ogni modifica al template
- Verifica dello spazio residuo sull'utenza Aruba e allarme prima del `0097`
- Test axe su tutte le pagine nuove
- Sentry attivo, con allarme dedicato su 429 Aruba e scarti SDI

---

## 7. Ordine di lavoro consigliato

Le fasi **1→2→3** sono chiuse: frontend puro, catalogo e carrello funzionanti. Va aggiunta la migration su `vat_regime` e la funzione di scorporo IVA.

Si prosegue con la **Fase 3b** (cookie e consensi), ancora frontend puro, che va chiusa **prima della Fase 4** perché il pulsante Google carica risorse di terze parti.

Poi **4→5→6**: autenticazione, profilo e scheletro del checkout. Indipendenti da tutto il resto.

Quindi **7→8→9**. La Fase 7 si chiude per il ramo bonifico anche senza gateway deciso. La Fase 8 è la più esposta al rischio. La **Fase 9 non è più bloccata dal regime IVA**: resta subordinata alla verifica dell'utenza Premium, mentre l'accreditamento DEMO va richiesto subito ma **non è bloccante**, perché esiste il Piano B (builder XML offline, autenticazione testata in produzione, primo invio su fattura reale di importo minimo).

Infine la **Fase 10**.

---

## 8. Sequenza dei prompt per Claude Code

| # | Prompt | Stato |
|---|---|---|
| 1 | Setup Supabase: schema, RLS, storage, tipi generati | tabella `courses` + RLS + tipi fatti — bucket `invoices` da creare |
| 2 | Modelli TS e `CoursesService` | fatto |
| 3 | Pagina catalogo con filtri | fatto |
| 4 | Pagina dettaglio corso | fatto |
| 5 | `CartService`, drawer, badge header | fatto |
| 5b | Migration `vat_regime` a `iva_22` + funzione di scorporo IVA con test | pronto |
| 5c | Banner cookie, `ConsentService`, script loader, pagine policy | **bloccato: serve elenco servizi terzi + testi policy** |
| 6 | Auth base: email+password, Google OAuth, sessione, guard, header | pronto |
| 7 | Auth complementare: reset password, verifica email, identity linking, merge carrello | pronto |
| 8 | Profilo e dati di fatturazione con vincoli FatturaPA | pronto |
| 9 | Scheletro checkout a 4 step con macchina a stati | pronto |
| 10 | Adapter pagamento + `BankTransferProvider` completo | pronto (il ramo carta/Google Pay resta bloccato dal gateway) |
| 11 | Area studente, email transazionali, consegna del modulo in allegato | **bloccato: serve PDF del modulo, testi istruzioni, email segreteria** |
| 12 | Aruba — client di autenticazione con token persistito e lock | pronto (serve utenza Premium + credenziali) |
| 13 | Aruba — builder XML FatturaPA con validazione e test sui controlli SdI | pronto |
| 14 | Aruba — emissione, callback/polling stato, gestione scarti, PDF di cortesia | **serve ambiente DEMO, oppure si procede col Piano B della Fase 9** |
| 15 | Hardening: rate limiting, test RLS, E2E, axe, Sentry | pronto |

La Fase 9 è spezzata in tre prompt (12, 13, 14) perché autenticazione, costruzione dell'XML ed emissione sono problemi indipendenti: il builder XML si sviluppa e si testa offline, senza toccare l'API.

---

## 9. Questioni ancora aperte

1. **Gateway di pagamento** definitivo, da scegliere **verificando prima il supporto a Google Pay** (Stripe sì, Nexi XPay da verificare contrattualmente, pagoPA no). Se l'ateneo è vincolato a pagoPA, il requisito Google Pay va rinegoziato
2. **Utenza Aruba Premium**: da confermare. I web service non sono disponibili alle utenze base non delegate
3. **Accreditamento all'ambiente DEMO** Aruba: la richiesta deve partire **dall'ateneo** via ticket all'assistenza, non esiste self-service. Da avviare subito perché ha tempi non nostri, e con la consapevolezza che potrebbe essere negato ai non-Partner: in quel caso vale il **Piano B** descritto in Fase 9
4. **Tier dell'utenza Aruba** e disponibilità delle **callback**: determinano se serve costruire il polling
5. **Versione API**: v1 (documentata in questo piano) o v2
6. **Firma della fattura**: l'ateneo possiede una firma automatica propria (campi `credential`/`domain`) o si lascia firmare Aruba?
7. **PDF del modulo di iscrizione**: chi lo fornisce, chi ne mantiene le versioni, dove viene ospitato. Serve una versione compilabile a schermo o basta stampabile?
8. **Casella email della segreteria** che riceve i moduli compilati: indirizzo, chi la presidia, se accetta allegati di dimensione rilevante
9. **Conferma degli incassi da bonifico**: chi la fa, con quale frequenza, con quale strumento
10. **Passaggio a `enrolled`**: chi registra la ricezione del modulo compilato. Senza questo passaggio non esistono né promemoria automatici né stato reale dell'iscrizione
11. **Timing del modulo nel ramo bonifico**: allegarlo subito o solo alla conferma dell'incasso?
12. **Diritto di recesso 14 giorni** — *punto reso più delicato dal nuovo flusso.* Prima il modulo firmato e ricaricato faceva da atto di iscrizione; adesso il contratto si conclude con il solo pagamento, prima che l'utente abbia compilato qualsiasi cosa. Cambia il momento in cui decorre il termine, cambia il testo dell'informativa precontrattuale e cambia la formulazione dell'eventuale rinuncia al recesso per servizi che iniziano subito. Con IVA esposta, il rimborso comporta anche una **nota di credito TD04**. **Da validare col legale dell'ateneo prima del rilascio**
13. **Testi legali** da pubblicare: condizioni di vendita, informativa privacy, cookie policy
14. Se i corsi hanno **posti limitati** o scadenze di iscrizione → serve gestione disponibilità e prenotazione temporanea del posto durante il checkout. Con il bonifico il problema si amplifica: un posto resta appeso finché l'incasso non arriva
15. **Servizi di terze parti** effettivamente in uso o previsti (analytics, Google Maps, video embed, reCAPTCHA, pixel pubblicitari) e **testi di cookie policy e privacy** → determinano quali categorie mostrare nel banner (Fase 3b). Da chiarire anche se serve una prova del consenso lato server (tabella `consents`) oltre alla persistenza client

---

## 10. Riferimenti

- **API Aruba Fatturazione Elettronica (v1):** https://fatturazioneelettronica.aruba.it/apidoc/docs.html
- **API Aruba v2:** linkata in cima alla pagina della v1
- Pannello web Aruba — demo: `https://demo.fatturazioneelettronica.aruba.it` · produzione: `https://fatturazioneelettronica.aruba.it`
- Codice destinatario di Aruba per la **ricezione** delle fatture: `KRRH6B9`
- Codice fiscale intermediario Aruba PEC, da usare come `IdTrasmittente`: `01879020517`
- Specifiche tecniche FatturaPA e controlli SdI: Agenzia delle Entrate
- Linee guida cookie: Garante Privacy, giugno 2021

---

*Nota: le indicazioni su IVA, fatturazione elettronica e diritto di recesso sono spunti tecnici, non consulenza fiscale o legale. Vanno validate dai professionisti dell'ateneo prima del rilascio in produzione.*
