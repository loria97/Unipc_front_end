import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CartDrawerService } from './core/services/cart-drawer.service';
import { CookiePreferencesService } from './core/services/cookie-preferences.service';
import { ScriptLoaderService } from './core/services/script-loader.service';
import { CookieBannerComponent } from './layout/cookie-banner/cookie-banner.component';
import { FooterComponent } from './layout/footer/footer.component';
import { HeaderComponent } from './layout/header/header.component';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';
import { CookiePreferencesComponent } from './shared/components/cookie-preferences/cookie-preferences.component';

@Component({
  selector: 'unipc-root',
  standalone: true,
  imports: [
    HeaderComponent,
    FooterComponent,
    RouterOutlet,
    CartDrawerComponent,
    CookieBannerComponent,
    CookiePreferencesComponent,
  ],
  template: `
    <div
      [attr.inert]="cartDrawer.isOpen() || cookiePreferences.isOpen() ? '' : null"
      style="min-height:100vh;background:var(--unipc-surface);padding-bottom:var(--cookie-banner-space, 0px);"
    >
      <unipc-cookie-banner></unipc-cookie-banner>
      <unipc-header></unipc-header>
      <router-outlet></router-outlet>
      <unipc-footer></unipc-footer>
    </div>
    <unipc-cart-drawer></unipc-cart-drawer>
    <unipc-cookie-preferences></unipc-cookie-preferences>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // `<unipc-cart-drawer>` e `<unipc-cookie-preferences>` sono montati fuori
  // da questo wrapper apposta: `inert` (che implica `aria-hidden`) deve
  // nascondere lo sfondo, mai gli overlay stessi. `<unipc-cookie-banner>`
  // resta invece DENTRO, come primo figlio: quando un modale è aperto viene
  // inertizzato insieme al resto dello sfondo — è `role="region"`, non un
  // dialog, ma con un altro overlay sopra non deve restare navigabile da
  // tastiera.
  protected readonly cartDrawer = inject(CartDrawerService);
  protected readonly cookiePreferences = inject(CookiePreferencesService);

  // Mai letto direttamente qui: iniettato solo perché venga istanziato al
  // bootstrap. Il suo `effect()` deve partire subito, non al primo
  // componente che lo richiede (altrimenti Google Fonts non si
  // caricherebbe finché nessuno apre il pannello preferenze).
  private readonly scriptLoader = inject(ScriptLoaderService);
}
