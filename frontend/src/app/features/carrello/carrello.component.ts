import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CartContentComponent } from '../../shared/components/cart-content/cart-content.component';

@Component({
  selector: 'unipc-carrello',
  standalone: true,
  imports: [CartContentComponent],
  templateUrl: './carrello.component.html',
  styleUrl: './carrello.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarrelloComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    this.titleService.setTitle('Carrello | UNIPC');
    // Una pagina carrello non va indicizzata.
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }
}
