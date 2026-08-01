---
description: Riepiloga lo stato reale del progetto confrontando il piano con il codice esistente.
---

## Contesto

!`git -C . log --oneline -10 2>/dev/null || echo "nessun repository git"`

!`ls frontend/src/app/features 2>/dev/null || echo "cartella features non trovata"`

!`ls backend/supabase/migrations 2>/dev/null || echo "nessuna migration"`

## Istruzioni

Leggi `docs/piano-corsi-professionalizzanti.md`, poi ispeziona il codice reale per verificare cosa è stato effettivamente implementato: route, servizi, migration, Edge Functions.

Produci:

1. **Fasi completate** — con la prova nel codice, non l'intenzione
2. **Fase in corso** — cosa manca per chiuderla
3. **Prossimo passo consigliato**
4. **Divergenze** tra piano e codice
5. **Questioni aperte** che bloccano l'avanzamento

Se qualcosa non è verificabile dal codice, dillo invece di assumerlo fatto.
