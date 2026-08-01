---
name: validatori-italiani
description: Validazione dei dati anagrafici e fiscali italiani per UNIPC — codice fiscale con checksum, partita IVA, CAP, telefono, codice SDI, PEC. Usalo quando crei o modifichi form di registrazione, profilo, dati di fatturazione o domanda di iscrizione.
---

# Validatori italiani

Vivono in `frontend/src/app/shared/validators/`. Ogni validatore usato in un form deve avere un **equivalente lato server**: la validazione client è comodità, quella server è sicurezza.

## Codice fiscale

- 16 caratteri alfanumerici per le persone fisiche
- Verifica del **carattere di controllo**, non solo della lunghezza e del pattern
- Gestire l'**omocodia**: alcune cifre sostituite da lettere secondo la tabella ufficiale. Un CF omocodico è valido e va accettato
- Normalizzare in maiuscolo prima di validare
- Le persone giuridiche possono avere un CF numerico di 11 cifre: se il form accetta anche aziende, il validatore deve prevederlo

## Partita IVA

- 11 cifre
- Verifica con **algoritmo di Luhn** nella variante italiana
- Non basta il controllo di lunghezza

## CAP

5 cifre. Attenzione agli zeri iniziali: si gestisce come **stringa**, mai come numero.

## Telefono

- Accettare spazi, punti, trattini e prefisso `+39`, normalizzando prima di validare
- Non rifiutare numeri esteri: gli studenti possono risiedere all'estero
- Salvare in formato normalizzato

## Codice destinatario SDI

- 7 caratteri alfanumerici per chi ha un canale accreditato
- `0000000000` (7 zeri nel campo, formato secondo tracciato) per i privati senza canale
- In alternativa al codice SDI si accetta la **PEC**: uno dei due è obbligatorio per le aziende

## Regole di UX

- Validare al blur, non a ogni tasto
- Messaggi di errore specifici: "il codice fiscale non è valido" è meglio di "campo non valido", e va detto **cosa** non torna quando è possibile
- Errori collegati al campo con `aria-describedby` e `aria-invalid`
- Non bloccare l'utente durante la digitazione con maschere aggressive
