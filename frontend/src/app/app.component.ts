import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CartDrawerService } from './core/services/cart-drawer.service';
import { FooterComponent } from './layout/footer/footer.component';
import { HeaderComponent } from './layout/header/header.component';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';

@Component({
  selector: 'unipc-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterOutlet, CartDrawerComponent],
  template: `
    <div [attr.inert]="cartDrawer.isOpen() ? '' : null" style="min-height:100vh;background:var(--unipc-surface);">
      <unipc-header></unipc-header>
      <router-outlet></router-outlet>
      <unipc-footer></unipc-footer>
    </div>
    <unipc-cart-drawer></unipc-cart-drawer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // `<unipc-cart-drawer>` è montato fuori da questo wrapper apposta:
  // `inert` (che implica `aria-hidden`) deve nascondere lo sfondo, mai il
  // drawer stesso.
  protected readonly cartDrawer = inject(CartDrawerService);
}
