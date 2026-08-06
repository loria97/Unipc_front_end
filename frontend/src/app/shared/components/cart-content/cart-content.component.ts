import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { DEFAULT_VAT_RATE_PERCENT, splitVat } from '../../../core/models/vat';
import { EuroCentsPipe } from '../../pipes/euro-cents.pipe';

let nextCheckoutNoteId = 0;

/**
 * Contenuto del carrello, un solo componente per due contesti: il drawer
 * (`layout="drawer"`) e la pagina `/carrello` (`layout="page"`, default).
 * Un solo template, la densità cambia solo via `[class.cart-content--drawer]`
 * e SCSS — nessuna immagine per riga (coerente con `CourseCardComponent`,
 * che già omette `heroImage` per mancanza di asset reali).
 */
@Component({
  selector: 'unipc-cart-content',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, EuroCentsPipe],
  templateUrl: './cart-content.component.html',
  styleUrl: './cart-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartContentComponent {
  @Input() layout: 'drawer' | 'page' = 'page';

  // Drawer e pagina `/carrello` possono essere montati entrambi allo stesso
  // tempo (il drawer resta nel DOM anche quando la pagina è aperta): un id
  // statico produrrebbe due nodi con lo stesso id nel documento.
  protected readonly checkoutNoteId = `cart-checkout-note-${nextCheckoutNoteId++}`;

  protected readonly cart = inject(CartService);

  protected readonly itemsCountLabel = computed(() => {
    const count = this.cart.count();
    return count === 1 ? '1 corso' : `${count} corsi`;
  });

  /** Costante esposta al template: il "22" non va mai scritto a mano lì. */
  protected readonly vatRatePercent = DEFAULT_VAT_RATE_PERCENT;

  /**
   * La ripartizione imponibile/imposta ha senso solo se OGNI corso in
   * carrello è a `iva_22`: un regime misto (es. un corso ancora
   * `esente_art10` o `da_definire`) produrrebbe uno scorporo privo di
   * significato fiscale se applicato al totale complessivo. In quel caso il
   * blocco si nasconde, senza errore.
   */
  protected readonly canSplitVat = computed(() =>
    this.cart.items().every((item) => item.course.vatRegime === 'iva_22'),
  );

  protected readonly vatBreakdown = computed(() => splitVat(this.cart.totalCents(), this.vatRatePercent));

  remove(slug: string): void {
    this.cart.remove(slug);
  }
}
