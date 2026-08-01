---
name: ordini-e-importi
description: Regole di dominio su denaro e ordini UNIPC — importi in centesimi, calcolo dei totali, macchina a stati dell'ordine, idempotenza, prezzi autorevoli lato server. Usalo per carrello, checkout, pagamenti, ordini e qualsiasi codice che tocchi un importo o uno stato di ordine.
---

# Ordini e importi

## Denaro

- Tutti gli importi sono **interi in centesimi**: `priceCents: number`
- Mai `float`, mai `number` in euro, mai `parseFloat` su un prezzo
- La formattazione in euro avviene **solo** nel layer di presentazione, con una pipe dedicata
- Gli arrotondamenti si fanno una sola volta, sul totale, con regola esplicita

## Prezzo autorevole

Il prezzo valido è quello in tabella `courses`. Il client invia **id di corso**, mai importi.

Al momento dell'ordine il prezzo si **congela** in `order_items`: se domani il corso rincara, gli ordini già emessi non cambiano.

Il server, prima di creare una sessione di pagamento:
1. rilegge l'ordine dal database
2. ricalcola il totale dai prezzi correnti in `order_items`
3. verifica che lo stato dell'ordine consenta il pagamento

## Macchina a stati

```
draft → awaiting_form → form_completed → pdf_generated
      → awaiting_signature → signature_uploaded
      → awaiting_payment → paid → enrolled

terminali alternativi: cancelled, expired
```

Regole:
- Le transizioni si validano **lato server** (funzione o trigger Postgres), non solo nell'app
- Ogni step del checkout ha un guard che verifica lo stato corrente
- Non si torna indietro da `paid`: eventuali rimborsi sono un flusso separato, non una transizione inversa
- Se il form viene modificato dopo la generazione del PDF, il PDF precedente si invalida e l'ordine torna allo stato adeguato

## Idempotenza

Ogni operazione che muove denaro o emette documenti deve poter essere ripetuta senza effetti duplicati:

- Vincolo unico a database sull'identificativo esterno del pagamento
- Vincolo unico su `order_id` nella tabella fatture
- Il callback del provider verifica lo stato attuale prima di agire
- Il pulsante di pagamento si disabilita al primo click, ma la protezione vera sta sul server

## Carrello

- Un corso può stare in carrello una sola volta: quantità sempre 1, iscrizioni nominative
- Persistenza in `localStorage` con **versione dello schema**, per invalidare dati vecchi
- Al login si fa **merge** tra carrello anonimo e carrello dell'account, mai sovrascrittura
- Il carrello locale non è mai la fonte di verità del prezzo
