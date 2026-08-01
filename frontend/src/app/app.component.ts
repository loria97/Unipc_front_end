import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';

@Component({
  selector: 'unipc-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  template: `
    <div style="min-height:100vh;background:var(--unipc-surface);">
      <unipc-header></unipc-header>
      <router-outlet></router-outlet>
      <unipc-footer></unipc-footer>
    </div>
  `,
})
export class AppComponent {}
