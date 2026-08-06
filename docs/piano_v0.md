# UNIPC — Corsi Professionalizzanti
## Piano operativo: catalogo, carrello, checkout con modulo firmato, pagamento

Documento di riferimento per lo sviluppo della funzionalità e-commerce dei corsi professionalizzanti sul sito UNIPC.
Serve come base per i prompt sequenziali da dare a Claude Code.

---

## 1. Obiettivo funzionale

Flusso utente completo:

1. L'utente naviga l'elenco dei corsi professionalizzanti (card)
2. Apre la pagina di dettaglio di un corso
3. Aggiunge al carrello **oppure** acquista subito
4. Entra nel checkout:
   - **Step 1** — Accesso o registrazione (account obbligatorio)
   - **Step 2** — Completamento dati (indirizzo di fatturazione, telefono, CF)
   - **Step 3** — Compilazione del form di domanda di iscrizione
   - **Step 4** — Il sistema genera un PDF precompilato; l'utente lo scarica, lo firma, lo ricarica
   - **Step 5** — Pagamento
   - **Step 6** — Esito e conferma
5. Post-acquisto: area studente con ordini, documenti e ricevute

---

## 2. Decisioni prese

| Ambito | Decisione |
|---|---|
| Backend | **Supabase** (Auth + Postgres + Storage + Edge Functions), regione UE |
| Accesso | **Account obbligatorio**, nessun guest checkout |
| Metodi di login | Email + password, **Google OAuth**. SPID rinviato |
| Firma | **Scansione di firma autografa** (no firma elettronica avanzata al lancio) |
| Pagamento | **Da decidere con l'ateneo** → si costruisce un adapter con provider manuale temporaneo |
| Generazione PDF | **Server-side** con pdf-lib su template AcroForm |
| Fatturazione elettronica | **Aruba Fatturazione Elettronica** via API, integrazione server-side |

### Conseguenze architetturali

- Le Edge Functions Supabase girano su **Deno**: Puppeteer non è utilizzabile. Il PDF si genera con **pdf-lib** compilando un template con campi AcroForm, poi `flatten()`.
- Ogni riga di `orders` ha sempre un `user_id`: le RLS restano semplici (`user_id = auth.uid()`).
- Il PDF **non** si genera nel browser: il documento firmato deve corrispondere a quello emesso dall'ateneo, con hash SHA-256 salvato a DB.
- Il provider di pagamento va isolato dietro un'interfaccia, così le fasi 1–8 si sviluppano e si testano senza attendere la decisione dell'ateneo.

### Mitigazioni per la firma autografa scansionata

Il valore probatorio di una scansione è debole. Si compensa con:

- Numero pratica + QR di verifica stampati sul PDF generato
- Hash SHA-256 del documento emesso salvato in `documents`
- **Audit log** con timestamp, IP e user-agent per download del modulo e upload del firmato
- Upload che accetta anche **JPG/PNG** (foto da telefono) con conversione server-side in PDF: accettare solo PDF fa perdere gran parte delle conversioni da mobile

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
- Storage: bucket **privato** `enrollment-docs`, path `orders/{orderId}/`, accesso solo via signed URL a scadenza breve (5 min)
- Edge Functions (Deno): `create-order`, `save-enrollment-form`, `generate-enrollment-pdf`, `finalize-signed-upload`, `create-payment-session`, `payment-callback`

**Altro**
- Email transazionali: Resend o Brevo, dominio verificato con SPF/DKIM
- Test: Vitest/Jest per unit, Playwright per E2E, axe per accessibilità
- Monitoring: Sentry

**Chiavi e segreti**
- In `environment.ts` solo l'**anon key** Supabase
- La **service role key** e le chiavi del provider di pagamento vivono esclusivamente nei secret delle Edge Functions

---

## 4. Struttura file prevista

```
src/app/
├── core/
│   ├── models/
│   │   ├── course.model.ts
│   │   ├── cart.model.ts
│   │   ├── order.model.ts
│   │   └── enrollment-form.model.ts
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
│   │       └── manual-transfer.provider.ts
│   └── guards/
│       ├── auth.guard.ts
│       └── checkout-step.guard.ts
├── shared/
│   ├── components/
│   │   ├── course-card/
│   │   ├── auth-form/
│   │   ├── file-upload/
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

---

## 5. Schema dati

| Tabella | Contenuto |
|---|---|
| `courses` | Corsi/certificazioni con **prezzo autorevole** in centesimi (`list_price_cents`/`promo_price_cents`, non un singolo `price_cents`), regime IVA, durata, CFU — schema implementato, vedi dettaglio sotto |
| `profiles` | Nome, cognome, CF, data/luogo nascita, telefono, indirizzo fatturazione, P.IVA, SDI/PEC |
| `orders` | `user_id`, stato, totali, numero pratica, timestamp |
| `order_items` | Righe ordine con prezzo congelato al momento dell'acquisto |
| `enrollment_forms` | Dati del form di domanda (anche come bozza) |
| `documents` | PDF generato e PDF firmato: path storage, `sha256`, tipo, stato |
| `payments` | Provider, riferimento esterno, stato, importo |
| `audit_log` | Evento, `order_id`, `user_id`, IP, user-agent, timestamp |

### Schema `courses` (implementato)

Migration: `backend/supabase/migrations/20260801093000_create_courses_table.sql` (+ seed demo `20260801094500_seed_demo_courses.sql`, rimovibile quando arrivano i corsi reali).

- **Identità**: `slug` (unique), `title`, `type` (`corso`|`certificazione`), `area`, `abstract`, `hero_image` (jsonb `{src, alt}`)
- **Contenuti**: `a_chi_e_rivolto`, `obiettivi`, `requisiti_ammissione` (`text[]`, paragrafi con HTML inline limitato a `<strong>`/`<em>`/`<a href>`), `programma` (`text[]` opzionale)
- **Specifiche**: `durata_ore` (> 0), `durata_label`, `cfu` (nullable — NULL per le certificazioni), `modalita`, `prove_previste` (`text[]` opzionale)
- **Prezzo**: `list_price_cents`, `promo_price_cents`/`promo_label`/`promo_valid_until` (tutti e tre NULL o tutti valorizzati, e se valorizzati `promo_price_cents < list_price_cents`), `vat_regime` (`esente_art10`|`iva_22`|`da_definire`, default `da_definire` — il regime IVA definitivo resta una decisione aperta, vedi sezione 9)
- **Normativa**: `riferimenti_normativi` (jsonb array `{label, url}`), `punti_graduatoria` (jsonb `{punti, note}`), `classi_concorso` (`text[]`)
- **Pubblicazione**: `published`, `sort_order`, `seo` (jsonb `{metaTitle, metaDescription}`), `created_at`/`updated_at` (trigger `set_updated_at()`)
- RLS attiva: unica policy SELECT per `anon`/`authenticated` con `using (published = true)`; nessuna policy insert/update/delete (scrittura da service role/dashboard)
- Tipi generati in `frontend/src/app/core/models/database.types.ts`

**Regole non negoziabili**

- Tutti gli importi in **centesimi interi**, mai float
- Il totale si **ricalcola sempre lato server** dai prezzi a DB: il client non è mai fonte di verità sul prezzo
- RLS attive fin dalla prima migration, non "dopo"

### Macchina a stati dell'ordine

```
draft
  → awaiting_form
  → form_completed
  → pdf_generated
  → awaiting_signature
  → signature_uploaded
  → awaiting_payment
  → paid
  → enrolled

stati terminali alternativi: cancelled, expired
```

Le transizioni sono validate **lato server** (funzione o trigger Postgres). Ogni step del checkout è protetto da un guard che verifica lo stato corrente.

---

## 6. Fasi operative

### Fase 0 — Setup Supabase e prerequisiti

**Da fare**
- Creare progetto Supabase in **regione UE (Francoforte)**, firmare il DPA
- Installare Supabase CLI, collegare il progetto, prima migration
- Creare bucket privato `enrollment-docs`
- Configurare Google Cloud Console: client OAuth, redirect URI verso il callback Supabase
- Whitelist in Supabase di **tutte** le redirect URL: produzione, `localhost`, domini preview Vercel
- Generare i tipi TypeScript dal DB (`supabase gen types`)

**Da chiarire con commercialista e legale dell'ateneo** (non blocca le fasi 1–6, blocca 7 e 9)
- IVA sui corsi: esenzione art. 10 DPR 633/72 oppure 22%
- Fatturazione elettronica: CF sempre, P.IVA + SDI/PEC per aziende
- Diritto di recesso 14 giorni per contratti a distanza con consumatori
- Testi di informativa privacy e consensi

**Da chiarire con la segreteria**
- Il pagamento si sblocca subito dopo l'upload (verifica umana a posteriori) oppure serve approvazione manuale prima?
  *Raccomandato: sbloccare subito, con stato `signature_review_pending` che non ferma il flusso.*

**Criteri di uscita:** migration applicata, RLS attive, bucket creato, tipi generati, OAuth configurato.

---

### Fase 1 — Modelli e dati

- Modelli TypeScript allineati alle tabelle
- `professional-courses.json` tipizzato per la vetrina (il prezzo autorevole resta a DB)
- `CoursesService` con un solo punto di accesso ai dati, così il passaggio da JSON ad API non tocca i componenti

**Uscita:** compila in strict mode, JSON validato contro i tipi.

---

### Fase 2 — Catalogo e dettaglio corso ✅ completata

- `features/corsi-professionalizzanti/` con route lazy: lista + `:slug`
- Card riusabile in `shared/components/course-card/` — **se esiste già una card corsi nel sito, si estende quella**, non se ne crea una seconda
- Filtri (area tematica, durata, prezzo) sincronizzati con i query param: filtri condivisibili e back del browser funzionante
- SEO: title, meta, JSON-LD `Course`
- Pagina di dettaglio `:slug` (`features/corsi-professionalizzanti/course-detail/`), implementata insieme alla Fase 3 perché era il punto di aggancio mancante per le CTA del carrello — vedi Fase 3

**Uscita:** navigazione lista→dettaglio, responsive su sm/md/lg/xl, navigabile da tastiera, Lighthouse a11y ≥ 95.

---

### Fase 3 — Carrello ✅ completata

- `CartService` con signals, persistenza in `localStorage` **con versione dello schema** per invalidare dati vecchi — chiave `unipc.cart.v1`, payload `{ version: 1, items: [{ slug, addedAt }] }`. Si persistono solo gli identificativi: titoli e prezzi si reidratano sempre da `CoursesService`, mai salvati nel browser
- Un corso può stare in carrello una sola volta (quantità sempre 1: iscrizioni nominative)
- Badge contatore nell'header (desktop, mobile, voce nel menu hamburger) + drawer accessibile (`shared/components/cart-drawer/`, focus trap/scroll lock/Esc scritti a mano, niente `@angular/cdk`) + pagina `/carrello` — stesso componente `shared/components/cart-content/` in entrambi i contesti (`layout: 'drawer' | 'page'`)
- Totali calcolati con `cartTotalCents()` (funzione pura testabile, in centesimi) su `core/models/cart.model.ts`
- Stato di errore con "Riprova" se il caricamento del catalogo fallisce (mai uno spinner infinito), CTA "Vai al checkout" disabilitata con `// TODO(fase-6)`

**Uscita:** aggiungi/rimuovi, persistenza dopo refresh, annuncio `aria-live` all'aggiunta, nessun crash se il localStorage è corrotto.

**Nota per la Fase 12 (hardening/a11y):** l'audit di accessibilità di questa fase ha rilevato che l'outline globale `:focus-visible` (`--unipc-accent` su sfondo bianco, `src/styles.scss`) e il colore `a:hover` globale (stesso token) non raggiungono il contrasto 3:1/4.5:1 richiesto da WCAG 2.1 AA. È un problema di design system preesistente (non introdotto in questa fase) ma ora esercitato pesantemente dai nuovi elementi interattivi del carrello (drawer, righe, CTA). Da correggere a livello di token, non per singolo componente — fuori scope di questo lavoro, segnalato all'utente.

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
- Verifica email obbligatoria prima di completare un ordine, con schermata "controlla la posta" e rinvio con cooldown
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

**Uscita:** profilo leggibile e aggiornabile solo dal proprietario, validazioni corrette su casi reali.

---

### Fase 6 — Scheletro del checkout

- Route `/checkout` con **child route per ogni step**, non uno stepper a stato interno:
  `/checkout/accesso`, `/dati`, `/domanda`, `/documento`, `/pagamento`, `/esito`
- Al primo ingresso si crea l'**ordine draft lato server**; l'ID sta nell'URL o in sessione → il flusso è ripristinabile se l'utente chiude il browser
- Guard per step basato sullo stato dell'ordine
- Stepper accessibile: lista semantica `<ol>`, `aria-current="step"`, focus sul titolo dello step al cambio route

**Uscita:** guard funzionanti, refresh e deep-link non rompono il flusso, ordine persistito.

---

### Fase 7 — Form di domanda di iscrizione

> Richiede le specifiche dei campi, ancora da fornire.

- Reactive Forms tipizzati
- **Salvataggio bozza automatico** (debounce ~800 ms): nessuno deve perdere 40 campi per una disconnessione
- Errori accessibili: `aria-describedby`, `aria-invalid`, riepilogo errori in cima con link ai campi, focus sul primo invalido al submit
- Validazione **ripetuta lato server** con lo stesso schema Zod

**Uscita:** bozza recuperabile, submit che porta l'ordine a `form_completed`.

---

### Fase 8 — Generazione del PDF

> Richiede il template del modulo ufficiale dell'ateneo.

- Template PDF con campi **AcroForm** (`modulo-iscrizione.pdf`) preparato a monte
- Edge Function `generate-enrollment-pdf`: compila i campi con pdf-lib, poi `flatten()`
- Sul documento: numero pratica, data di emissione, QR di verifica
- Salvataggio in Storage privato + `sha256` in `documents`
- Download solo tramite **signed URL a scadenza breve** — mai bucket pubblico, contiene dati personali
- Se l'utente modifica il form, il PDF precedente si **invalida** e si rigenera

**Uscita:** PDF fedele ai dati inseriti, scaricabile anche da mobile, hash salvato.

---

### Fase 9 — Upload del documento firmato

- Accetta **PDF, JPG, PNG**; immagini convertite in PDF lato server
- Controllo **magic number** (`%PDF`, header JPEG/PNG) oltre al MIME: mai fidarsi dell'estensione
- Limite ~10 MB
- Upload diretto a Storage con signed upload URL
- Validazioni utili: numero pagine coerente, presenza del numero pratica
- Stato `signature_review_pending` che **non blocca** il proseguimento
- Registrazione in `audit_log` di timestamp, IP, user-agent, hash del file
- UI: drag&drop **più** input file nativo (indispensabile su mobile), barra di progresso, anteprima, sostituzione del file, retry sugli errori di rete

**Uscita:** upload robusto da smartphone, stato ordine a `signature_uploaded`.

---

### Fase 10 — Pagamento

- Interfaccia `PaymentProvider` con `createPaymentSession()` e `handleProviderCallback()`
- Implementazione temporanea `ManualTransferProvider` (bonifico) per testare tutto il flusso end-to-end
- L'endpoint server rilegge l'ordine dal DB, **ricalcola il totale dai prezzi a DB**, verifica che lo stato sia `signature_uploaded`
- Callback/webhook **idempotente**: è la fonte di verità, non il redirect di ritorno
- Gestione di pagamento fallito, abbandonato, ordine scaduto (job di cleanup dei draft)

**Nota sulla scelta del provider:** se l'ateneo opta per **pagoPA**, il modello è a IUV con avviso di pagamento e riconciliazione **asincrona**. L'adapter deve quindi prevedere anche il caso "pagamento confermato ore dopo", non solo il redirect immediato. Stripe Checkout, Nexi XPay e Axerve rientrano invece nel caso sincrono con webhook.

**Uscita:** flusso completo in test, callback idempotente, doppio click su "Paga" che non crea due ordini.

---

### Fase 11 — Post-acquisto

- `/area-studente`: ordini, stato iscrizioni, download di modulo firmato e ricevuta
- Email transazionali: conferma ordine, promemoria "modulo non ancora caricato", conferma pagamento
- Notifica alla segreteria a ogni nuova iscrizione + pannello minimo per revisione firme e download documenti
---

### Fase 11b — Fatturazione elettronica con Aruba

**Principio:** la fattura si emette **solo** dopo che l'ordine è in stato `paid`, innescata dal callback di pagamento, mai dal client.

**Architettura**
- Edge Function dedicata `create-invoice`, credenziali Aruba nei secret Supabase
- Tabella `invoices`: `order_id`, numero, anno, XML inviato, ID pratica Aruba, stato SDI, timestamp, path del PDF di cortesia
- Autenticazione OAuth2 verso le API Aruba, con token in cache e refresh

**Numerazione**
Progressivo annuale **senza buchi**, generato lato server con sequenza Postgres in transazione. Il numero si assegna al momento dell'emissione, non prima: un ordine abbandonato non deve bruciare un numero.

**Costruzione dell'XML FatturaPA 1.2.x**
- `TD01` fattura immediata
- Cedente: dati fiscali dell'ateneo, regime fiscale
- Cessionario: CF sempre. Privati → `CodiceDestinatario 0000000000`. Aziende → P.IVA + codice SDI o PEC
- Aliquota o `Natura` a seconda del regime IVA deciso in Fase 0

**Attenzione — marca da bollo:** se i corsi risultano **esenti IVA** e l'importo supera **77,47 €**, la fattura richiede bollo virtuale da 2 €, che spesso viene riaddebitato al cliente. Se è il caso, va previsto come riga aggiuntiva nel totale **già in Fase 1**, non aggiunto dopo.

**Gestione asincrona dello SDI**
L'invio non è mai istantaneo. Serve una macchina a stati per la fattura:

```
draft → sent → delivered / accepted
             → rejected (Notifica di Scarto)
             → not_delivered (Mancata Consegna → messa a disposizione)
```

- Polling periodico dello stato oppure webhook, se disponibile sul piano Aruba
- Uno **scarto** non annulla l'ordine: notifica alla segreteria, correzione dati, rinvio con nuovo numero secondo le regole
- Idempotenza obbligatoria: mai due fatture per lo stesso ordine, anche se il callback di pagamento arriva due volte

**Consegna all'utente**
PDF di cortesia generato e salvato in Storage, scaricabile dall'area studente. La fattura fiscalmente valida resta quella recapitata via SDI al cassetto fiscale o alla PEC.

**Ambiente di test:** verificare che il piano Aruba sottoscritto includa **accesso API** e ambiente di collaudo. Alcuni piani sono solo web e non espongono le API.

**Uscita:** fattura emessa e accettata dallo SDI in ambiente di test, numerazione senza buchi verificata, scarto gestito senza rompere l'ordine, PDF scaricabile.

---


---

### Fase 12 — Hardening

- Rate limiting sugli endpoint
- RLS verificate riga per riga con test dedicati
- Audit log su tutti i cambi di stato
- GDPR: informativa, consensi con timestamp, retention dei documenti, DPA con Supabase e provider di pagamento
- **Verifica** dei consensi cookie implementati in Fase 3b: nessun cookie non necessario scritto prima della scelta, revoca effettiva, banner coerente su tutte le pagine nuove (l'implementazione è già fatta, qui si controlla)
- Unit test su calcolo totali e macchina a stati
- Un E2E Playwright sull'intero flusso
- Test axe su tutte le pagine nuove
- Sentry attivo

---

## 7. Ordine di lavoro consigliato

Le fasi **1→2→3** sono frontend puro e producono subito qualcosa di dimostrabile. In parallelo si chiude la **Fase 0** con commercialista e legale, perché IVA e provider di pagamento bloccano le fasi 8 e 10.
La **Fase 3b** (cookie e consensi) si incastra qui: è frontend puro, non dipende da Supabase e va chiusa **prima della Fase 4**, perché il pulsante Google carica risorse di terze parti che non devono partire senza consenso.
Poi **4→5→6**, quindi **7→8→9→10**, che sono le più delicate, infine **11→12**.

---

## 8. Sequenza dei prompt per Claude Code

| # | Prompt | Stato |
|---|---|---|
| 1 | Setup Supabase: schema, RLS, storage, tipi generati | tabella `courses` + RLS + tipi fatti — bucket storage `enrollment-docs` ancora da fare |
| 2 | Modelli TS e `CoursesService` | pronto |
| 3 | Pagina catalogo con filtri | fatto |
| 4 | Pagina dettaglio corso | fatto |
| 5 | `CartService`, drawer, badge header | fatto |
| 5b | Banner cookie, `ConsentService`, script loader, pagine policy | **serve elenco servizi terzi + testi policy** |
| 6 | Auth base: email+password, Google OAuth, sessione, guard, header | pronto |
| 7 | Auth complementare: reset password, verifica email, identity linking, merge carrello | pronto |
| 8 | Profilo e completamento dati di fatturazione | pronto |
| 9 | Scheletro checkout con macchina a stati | pronto |
| 10 | Form domanda di iscrizione | **serve elenco campi** |
| 11 | Edge Function generazione PDF | **serve template modulo** |
| 12 | Upload documento firmato | pronto |
| 13 | Adapter pagamento + provider manuale | pronto |
| 14 | Area studente ed email transazionali | pronto |
| 15 | Integrazione Aruba Fatturazione Elettronica | **serve regime IVA + credenziali API** |

---

## 9. Questioni ancora aperte

1. **Regime IVA** dei corsi → blocca il calcolo dei totali (Fase 1 e 10), il codice `Natura` in fattura e l'eventuale marca da bollo da 2 € sopra i 77,47 € (Fase 11b)
2. **Provider di pagamento** definitivo, con particolare attenzione a un eventuale obbligo pagoPA
3. **Specifiche del form** di domanda: elenco campi, obbligatorietà, validazioni
4. **Template del modulo PDF** ufficiale dell'ateneo
5. **Revisione della firma**: automatica o con approvazione manuale della segreteria prima del pagamento
6. **Diritto di recesso** e testi legali da pubblicare
7. Se i corsi hanno **posti limitati** o scadenze di iscrizione → serve gestione disponibilità e prenotazione temporanea del posto durante il checkout
8. **Servizi di terze parti** effettivamente in uso o previsti (analytics, Google Maps, video embed, reCAPTCHA, pixel pubblicitari) e **testi di cookie policy e privacy** → determinano quali categorie mostrare nel banner e cosa dichiarare (Fase 3b). Da chiarire anche se serve una prova del consenso lato server (tabella `consents`) oltre alla persistenza client

---

*Nota: le indicazioni su IVA, fatturazione elettronica, valore probatorio della firma e diritto di recesso sono spunti tecnici, non consulenza fiscale o legale. Vanno validate dai professionisti dell'ateneo prima del rilascio in produzione.*
