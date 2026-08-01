---
name: fatturapa-aruba
description: Fatturazione elettronica italiana con Aruba per UNIPC — XML FatturaPA, numerazione progressiva, codice destinatario, natura IVA, bollo virtuale, stati e notifiche SDI. Usalo quando lavori su fatture, dati fiscali del cliente, o l'integrazione con Aruba.
---

# Fatturazione elettronica — Aruba

## Quando si emette

**Solo** con ordine in stato `paid`, innescata dal callback del pagamento lato server. Mai dal client, mai prima dell'incasso.

## Dati del cessionario

| Caso | Requisiti |
|---|---|
| Privato | Codice fiscale, indirizzo completo, codice destinatario `0000000000` |
| Azienda o professionista | P.IVA, codice fiscale, codice SDI a 7 caratteri **oppure** PEC |

Se mancano i dati obbligatori, l'ordine non deve arrivare al pagamento: la validazione sta nello step dati del checkout.

## XML

- FatturaPA versione 1.2.x
- `TipoDocumento`: `TD01` fattura immediata
- Cedente: dati fiscali dell'ateneo e regime fiscale, da configurazione, mai hardcoded nel codice della funzione
- Riga di dettaglio per ogni corso, con descrizione, imponibile e aliquota o `Natura`

## IVA e bollo

Il regime IVA dei corsi (imponibile 22% oppure esente art. 10) determina l'aliquota o il codice `Natura`.

**Se il regime è esente e l'imponibile supera 77,47 €**, serve il bollo virtuale da 2 €, di norma riaddebitato al cliente. In quel caso il bollo è una riga del totale e va previsto nel calcolo dell'ordine, non aggiunto in fattura all'ultimo momento.

Se il regime non è definito nel piano, **fermati e chiedi**. Non scegliere un'aliquota di default.

## Numerazione

- Progressivo annuale, **senza buchi**
- Assegnato con sequenza Postgres dentro la transazione di emissione
- Mai assegnato alla creazione dell'ordine: un ordine abbandonato non deve consumare un numero
- Mai generato lato client

## Ciclo SDI

```
draft → sent → delivered / accepted
             → rejected        (Notifica di Scarto)
             → not_delivered   (Mancata Consegna, messa a disposizione)
```

- L'invio è **asincrono**: serve polling dello stato o webhook, secondo quanto offre il piano Aruba
- Uno **scarto non invalida l'ordine né l'iscrizione**: notifica alla segreteria, correzione dei dati, rinvio
- La `Mancata Consegna` è un esito normale per i privati: la fattura resta a disposizione nel cassetto fiscale

## Consegna all'utente

PDF di cortesia generato e salvato nello Storage privato, scaricabile dall'area studente. Il documento fiscalmente valido è quello recapitato tramite SDI.

## Segreti

Credenziali Aruba solo nei secret delle Edge Functions. Mai nel frontend, mai in una migration, mai in un file di configurazione versionato.
