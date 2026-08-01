---
description: Esegue i controlli di qualità completi su ciò che è stato appena implementato, prima del commit.
---

## Stato attuale

!`git status --short`

## Istruzioni

Esegui in sequenza, delegando agli agenti dedicati:

1. **Build e test** — `cd frontend && npm run build` e `npm test`. Se falliscono, fermati e riporta.
2. **code-reviewer** sul diff corrente
3. **a11y-auditor** sui componenti visivi toccati
4. **security-auditor** se sono state toccate policy RLS, autenticazione, upload, pagamenti o fatturazione

Raccogli i risultati in un unico report per gravità: **bloccante**, **importante**, **minore**.

Concludi con un verdetto esplicito: pronto per il commit, oppure elenco puntato di cosa correggere prima. Non correggere nulla di tua iniziativa in questa fase.
