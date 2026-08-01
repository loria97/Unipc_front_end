---
name: angular-conventions
description: Convenzioni Angular del progetto UNIPC — standalone components, signals, inject, Reactive Forms tipizzati, routing lazy, struttura delle cartelle. Usalo quando crei o modifichi componenti, servizi, guard, route o form nel frontend.
---

# Convenzioni Angular UNIPC

## Struttura

```
core/       servizi singleton, modelli, guard, interceptor
shared/     componenti, pipe, direttive, validatori riutilizzabili
features/   una cartella per pagina, lazy-loaded
layout/     header con mega-menu, footer
styles/     _tokens.scss, _mixins.scss
```

Regola di dipendenza: `features` può usare `core` e `shared`. `shared` non importa mai da `features`. `core` non importa da nessuno dei due.

## Componenti

```ts
@Component({
  selector: 'unipc-course-card',
  standalone: true,
  imports: [...],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-card.html',
  styleUrl: './course-card.scss',
})
```

- Prefisso selettore `unipc-`
- `input()` / `output()` in forma signal
- Nessun NgModule
- Template in file separato quando supera una decina di righe

## Stato

Signals per lo stato condiviso, `computed()` per i derivati. Niente `BehaviorSubject` per stato nuovo. Gli observable restano per i flussi asincroni e le chiamate HTTP.

## Dependency injection

`private readonly svc = inject(MyService);` — non il constructor injection.

## Form

Sempre tipizzati:

```ts
form = this.fb.group({
  email: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
});
```

Mai `FormGroup` non tipizzato, mai `any` nei value.

## Routing

Lazy sempre:

```ts
{ path: 'corsi-professionalizzanti', loadChildren: () => import('./features/...') }
```

Gli step del checkout sono **child route reali**, non stati interni di un componente: il refresh e il link diretto devono funzionare.

Guard funzionali (`CanActivateFn`), non classi.

## Divieti

- `any`, `@ts-ignore`, `!` non giustificato
- `@supabase/supabase-js` importato in un componente: si passa da `core/services/supabase.service.ts`
- Logica di business nei template
- Subscribe senza gestione dell'unsubscribe: usa `takeUntilDestroyed()` o la async pipe
