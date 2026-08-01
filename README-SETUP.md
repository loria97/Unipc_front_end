# Setup del team di agenti — UNIPC

## 1. Riorganizza le cartelle

Rinomina così, senza spazi e senza refusi:

```
Front End  →  frontend
back end   →  backend
Documeti   →  docs
```

Gli spazi nei percorsi rompono gli script bash che Claude Code esegue, ed è una fonte di errori continua. Sposta `piano-corsi-professionalizzanti.md` in `docs/`.

## 2. Copia questi file nella cartella UNIPC

```
UNIPC/
├── CLAUDE.md
└── .claude/
    ├── agents/
    ├── skills/
    └── commands/
```

Il contenuto di questo pacchetto va estratto direttamente dentro `UNIPC/`.

## 3. Inizializza git alla radice

```bash
cd UNIPC
git init
git add .
git commit -m "chore: setup progetto e configurazione Claude Code"
```

Senza git, Claude Code non può mostrare diff né recuperare modifiche sbagliate.

## 4. Avvia Claude Code dalla radice

```bash
cd UNIPC
claude
```

**Sempre da `UNIPC/`, mai da dentro `frontend/`.** Gli agenti devono vedere frontend, backend e docs insieme: una modifica allo schema DB tocca sia le migration sia i tipi Angular.

## 5. Verifica

Dentro Claude Code:

```
/agents      → devono comparire gli 8 agenti di progetto
/context     → verifica che CLAUDE.md sia caricato
```

Le skill si caricano da sole quando la descrizione combacia col compito.

## Nota sul caricamento

Gli agenti vengono letti all'avvio della sessione. Se modifichi un file in `.claude/agents/` mentre Claude Code è aperto, riavvia la sessione. Le modifiche fatte tramite il comando `/agents` sono invece immediate.
