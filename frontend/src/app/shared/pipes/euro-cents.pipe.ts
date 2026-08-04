import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatta un importo in centesimi interi come valuta EUR, locale `it-IT`.
 *
 * Usa `Intl.NumberFormat` nativo invece del `CurrencyPipe` di Angular perché
 * nessun `LOCALE_ID`/dato locale `it` è registrato in `main.ts`/`app.config.ts`
 * (nessuna chiamata a `registerLocaleData('it')`): `CurrencyPipe` senza quel
 * setup formatterebbe con la locale di default `en-US`. `Intl.NumberFormat`
 * è nativo del browser, non richiede import aggiuntivi né side-effect globali.
 */
@Pipe({
  name: 'euroCents',
  standalone: true,
})
export class EuroCentsPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  });

  transform(cents: number): string {
    return this.formatter.format(cents / 100);
  }
}
