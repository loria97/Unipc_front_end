---
name: pdf-acroform
description: Generazione server-side del modulo di iscrizione PDF con pdf-lib su template AcroForm, hash SHA-256, signed URL, e validazione del documento firmato ricaricato. Usalo per generazione PDF, download del modulo e upload del documento firmato.
---

# PDF del modulo di iscrizione

## Principio

Il PDF si genera **lato server**, in una Edge Function. Mai nel browser: il documento che lo studente firma deve essere esattamente quello emesso dall'ateneo, e deve essere verificabile.

Runtime Deno: si usa **pdf-lib**. Puppeteer non è disponibile.

## Generazione

1. Si carica il template `modulo-iscrizione.pdf`, che ha campi **AcroForm** nominati
2. Si compilano i campi con i dati di `enrollment_forms` e `profiles`
3. Si applica `flatten()`: i campi diventano contenuto statico e non sono più modificabili
4. Si stampano su ogni copia: numero pratica, data di emissione, QR di verifica
5. Si calcola lo `sha256` del file
6. Si salva nello Storage privato e si registra il record in `documents` con hash e path

## Download

Solo tramite **signed URL a scadenza breve**, circa 5 minuti. Il bucket resta privato: il documento contiene dati personali.

Ogni download si registra in `audit_log` con timestamp, IP e user-agent.

## Rigenerazione

Se lo studente modifica il form dopo la generazione, il PDF precedente si **invalida** (stato `superseded`) e se ne genera uno nuovo. Non si sovrascrive silenziosamente: la cronologia dei documenti emessi va conservata.

## Upload del documento firmato

La firma è **autografa scansionata**, quindi va accettato il modo in cui le persone firmano davvero.

- Formati accettati: **PDF, JPG, PNG**. Le immagini si convertono in PDF lato server
- Limite circa 10 MB, applicato **anche** lato server
- Validazione per **magic number** (`%PDF`, header JPEG/PNG), non per estensione né per il solo MIME dichiarato
- Controlli utili: numero di pagine coerente con l'originale, presenza del numero pratica
- Si salva `sha256` del file caricato e si registra l'evento in `audit_log`
- Stato `signature_review_pending`: la verifica umana avviene dopo e **non blocca** il pagamento

## UI dell'upload

Drag&drop **più** input file nativo. Su smartphone il drag&drop non esiste e la maggior parte degli utenti caricherà una foto del foglio firmato: se l'input nativo manca, si perdono le iscrizioni.

Barra di progresso, anteprima, possibilità di sostituire il file, retry sugli errori di rete.
